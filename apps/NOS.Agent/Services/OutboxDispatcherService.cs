using System;
using System.Diagnostics;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NOS.Agent.Configuration;

namespace NOS.Agent.Services
{
    public class OutboxDispatcherService : BackgroundService, IOutboxDispatcherService
    {
        public static bool IsHighPressure { get; set; } = false;

        private readonly IOutboxQueueService _queueService;
        private readonly ICredentialManagerService _credentialManager;
        private readonly IWindowsEventLogService _eventLogService;
        private readonly AgentConfiguration _config;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<OutboxDispatcherService> _logger;

        private int _consecutiveNetworkErrors = 0;
        private DateTime _circuitBreakerUntil = DateTime.MinValue;

        public OutboxDispatcherService(
            IOutboxQueueService queueService,
            ICredentialManagerService credentialManager,
            IWindowsEventLogService eventLogService,
            IOptions<AgentConfiguration> configOptions,
            IHttpClientFactory httpClientFactory,
            ILogger<OutboxDispatcherService> logger)
        {
            _queueService = queueService;
            _credentialManager = credentialManager;
            _eventLogService = eventLogService;
            _config = configOptions.Value;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            try
            {
                // Freshness policy on startup: purge any stale telemetry or heartbeats accumulated during prior downtime/pause
                await _queueService.PurgeStaleEphemeralMessagesAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to purge stale ephemeral messages on startup.");
            }

            while (string.IsNullOrEmpty(DeviceRegistrationService.CurrentToken) && !stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(500, stoppingToken);
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await _queueService.PurgeStaleEphemeralMessagesAsync(stoppingToken);
                    await DispatchPendingMessagesAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _eventLogService.WriteEvent(1001, $"Unhandled exception in OutboxDispatcherService: {ex.Message}\n{ex.StackTrace}", EventLogEntryType.Error);
                }

                await Task.Delay(TimeSpan.FromSeconds(IsHighPressure ? 5 : 30), stoppingToken);
            }
        }

        public async Task DispatchPendingMessagesAsync(CancellationToken cancellationToken = default)
        {
            bool isHalfOpen = false;
            if (_consecutiveNetworkErrors >= 5)
            {
                if (DateTime.UtcNow < _circuitBreakerUntil)
                {
                    return;
                }
                isHalfOpen = true;
                _logger.LogWarning("Circuit breaker HALF-OPEN — attempting 1 test message");
            }

            int batchSize = isHalfOpen ? 1 : 10;
            var messages = await _queueService.GetPendingMessagesAsync(batchSize, cancellationToken);
            if (messages.Count == 0) return;

            var token = DeviceRegistrationService.CurrentToken;
            if (string.IsNullOrEmpty(token))
            {
                token = await _credentialManager.GetDeviceTokenAsync();
            }
            if (string.IsNullOrEmpty(token))
            {
                _logger.LogWarning("No device token available yet. Waiting for endpoint registration.");
                return;
            }

            foreach (var message in messages)
            {
                if (cancellationToken.IsCancellationRequested) break;
                if (DateTime.UtcNow < _circuitBreakerUntil) break;

                // 1. If telemetry is paused, discard any pending telemetry message immediately (do not send to server)
                if (message.MessageType == "telemetry" && AgentRuntimeState.IsTelemetryPaused)
                {
                    _logger.LogInformation("Discarding telemetry message {Id} because telemetry is currently paused.", message.Id);
                    await _queueService.MarkDeliveredAsync(message.Id, cancellationToken);
                    continue;
                }

                // 2. Telemetry freshness rule ("there is no old concept"):
                // Real-time telemetry older than 3 minutes must be dropped, not replayed
                if (message.MessageType == "telemetry" && message.CreatedAt < DateTime.UtcNow.AddMinutes(-3))
                {
                    _logger.LogInformation("Discarding stale telemetry message {Id} from {CreatedAt} (freshness policy: real-time metrics only).", message.Id, message.CreatedAt);
                    await _queueService.MarkDeliveredAsync(message.Id, cancellationToken);
                    continue;
                }

                // 3. Heartbeat freshness rule: discard heartbeats older than 5 minutes
                if (message.MessageType == "heartbeat" && message.CreatedAt < DateTime.UtcNow.AddMinutes(-5))
                {
                    _logger.LogInformation("Discarding stale heartbeat message {Id} from {CreatedAt}.", message.Id, message.CreatedAt);
                    await _queueService.MarkDeliveredAsync(message.Id, cancellationToken);
                    continue;
                }

                string endpoint = GetEndpointForType(message.MessageType);
                string url = BuildApiUrl(endpoint);

                // Create fresh HttpClient per request to avoid header pollution
                var httpClient = _httpClientFactory.CreateClient();
                httpClient.Timeout = TimeSpan.FromSeconds(30);

                var activeToken = DeviceRegistrationService.CurrentToken ?? token;
                if (string.IsNullOrEmpty(activeToken))
                {
                    _logger.LogWarning("Message dispatch aborted: active token is empty.");
                    break;
                }

                var request = new HttpRequestMessage(HttpMethod.Post, url)
                {
                    Content = new StringContent(message.Payload, Encoding.UTF8, "application/json")
                };
                request.Headers.Add("X-Device-Token", activeToken);
                request.Headers.Add("X-Idempotency-Key", message.Id.ToString());

                try
                {
                    var response = await httpClient.SendAsync(request, cancellationToken);

                    if (response.IsSuccessStatusCode)
                    {
                        _logger.LogInformation(
                            "Dispatched {MessageType} to {Url} | Status: {Status}",
                            message.MessageType, url, (int)response.StatusCode);

                        if (message.MessageType == "heartbeat")
                        {
                            try
                            {
                                var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
                                using var doc = JsonDocument.Parse(responseBody);
                                if (doc.RootElement.TryGetProperty("telemetryPaused", out var pausedProp))
                                {
                                    bool isPaused = pausedProp.GetBoolean();
                                    if (AgentRuntimeState.IsTelemetryPaused != isPaused)
                                    {
                                        AgentRuntimeState.IsTelemetryPaused = isPaused;
                                        _logger.LogInformation(
                                            "Telemetry operational status updated via heartbeat: IsTelemetryPaused = {IsPaused}",
                                            isPaused);
                                    }
                                }
                            }
                            catch (Exception ex)
                            {
                                _logger.LogDebug(ex, "Failed to parse heartbeat response body for telemetry control flags.");
                            }
                        }

                        await _queueService.MarkDeliveredAsync(message.Id, cancellationToken);
                        ResetCircuitBreaker();
                    }
                    else if ((int)response.StatusCode >= 400 && (int)response.StatusCode < 500)
                    {
                        var responseBody = await response.Content.ReadAsStringAsync();
                        _logger.LogError(
                            "Dispatch FAILED for {MessageType} to {Url} | " +
                            "HTTP {Status} | Response: {ResponseBody}",
                            message.MessageType, url, (int)response.StatusCode, responseBody);

                        if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized || 
                            response.StatusCode == System.Net.HttpStatusCode.Forbidden)
                        {
                            _eventLogService.WriteEvent(1000, $"Authentication failure for message {message.Id} (Status {response.StatusCode})", EventLogEntryType.Error);
                            _logger.LogWarning("Authentication failure detected (HTTP 401/403). Clearing invalid credentials and requesting re-registration.");
                            await _credentialManager.ClearDeviceTokenAsync();
                            DeviceRegistrationService.RequestReRegistration();
                            var error = $"HTTP {(int)response.StatusCode}: {response.ReasonPhrase} - {responseBody}";
                            await _queueService.MarkFailedAsync(message.Id, error, cancellationToken);
                            ResetCircuitBreaker();
                            break; // Stop remaining batch to avoid cascading failures while re-registering
                        }
                        
                        var generalError = $"HTTP {(int)response.StatusCode}: {response.ReasonPhrase} - {responseBody}";
                        await _queueService.MarkFailedAsync(message.Id, generalError, cancellationToken);
                        ResetCircuitBreaker();
                    }
                    else // 5xx
                    {
                        var responseBody = await response.Content.ReadAsStringAsync();
                        _logger.LogError(
                            "Dispatch FAILED for {MessageType} to {Url} | " +
                            "HTTP {Status} | Response: {ResponseBody}",
                            message.MessageType, url, (int)response.StatusCode, responseBody);

                        var error = $"HTTP {(int)response.StatusCode}: {response.ReasonPhrase} - {responseBody}";
                        await _queueService.MarkFailedAsync(message.Id, error, cancellationToken);
                        HandleNetworkError();
                    }
                }
                catch (HttpRequestException ex)
                {
                    await _queueService.MarkFailedAsync(message.Id, $"HttpRequestException: {ex.Message}", cancellationToken);
                    HandleNetworkError();
                }
                catch (TaskCanceledException ex)
                {
                    await _queueService.MarkFailedAsync(message.Id, $"Timeout/TaskCanceled: {ex.Message}", cancellationToken);
                    HandleNetworkError();
                }
                catch (System.Net.Sockets.SocketException ex)
                {
                    await _queueService.MarkFailedAsync(message.Id, $"SocketException: {ex.Message}", cancellationToken);
                    HandleNetworkError();
                }
            }
        }

        private string GetEndpointForType(string type)
        {
            return type switch
            {
                "heartbeat" => "/api/v1/device/heartbeat",
                "telemetry" => "/api/v1/telemetry",
                "inventory" => "/api/v1/inventory",
                "security_scan" => "/api/v1/security",
                "alert" => "/api/v1/alerts",
                _ => $"/api/v1/unknown/{type}"
            };
        }

        private string BuildApiUrl(string endpoint)
        {
            var serverUrl = _config.ServerUrl ?? "http://localhost:3001";
            serverUrl = serverUrl.TrimEnd('/');
            if (serverUrl.EndsWith("/api/v1", StringComparison.OrdinalIgnoreCase))
                serverUrl = serverUrl[..^7];

            var baseUri = new Uri(serverUrl.EndsWith("/") 
                ? serverUrl 
                : serverUrl + "/");
            var fullUri = new Uri(baseUri, endpoint.TrimStart('/'));
            return fullUri.ToString();
        }

        private void HandleNetworkError()
        {
            _consecutiveNetworkErrors++;
            if (_consecutiveNetworkErrors < 5)
            {
                _logger.LogWarning($"Dispatch failed ({_consecutiveNetworkErrors}{( _consecutiveNetworkErrors == 1 ? "st" : _consecutiveNetworkErrors == 2 ? "nd" : _consecutiveNetworkErrors == 3 ? "rd" : "th")} failure)");
            }
            else if (_consecutiveNetworkErrors == 5)
            {
                _logger.LogWarning($"Dispatch failed (5th failure) → should trigger: Circuit breaker OPEN");
                _circuitBreakerUntil = DateTime.UtcNow.AddSeconds(60);
                _logger.LogWarning("Circuit breaker OPEN — pausing dispatch for 60 seconds");
                _eventLogService.WriteEvent(1001, "Circuit breaker OPEN", EventLogEntryType.Warning);
            }
            else if (_consecutiveNetworkErrors > 5)
            {
                _logger.LogWarning("Test message failed — circuit remains OPEN (if backend still down)");
                _circuitBreakerUntil = DateTime.UtcNow.AddSeconds(60);
            }
        }

        private void ResetCircuitBreaker()
        {
            if (_consecutiveNetworkErrors >= 5)
            {
                _logger.LogWarning("Test message succeeded — circuit CLOSED (if backend restarted)");
                _logger.LogWarning("Circuit breaker CLOSED — resuming normal dispatch");
                _eventLogService.WriteEvent(1001, "Circuit breaker CLOSED", EventLogEntryType.Information);
            }
            _consecutiveNetworkErrors = 0;
            _circuitBreakerUntil = DateTime.MinValue;
        }
    }
}