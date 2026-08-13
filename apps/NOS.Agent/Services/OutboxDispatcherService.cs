using System;
using System.Diagnostics;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using NOS.Agent.Configuration;

namespace NOS.Agent.Services
{
    public class OutboxDispatcherService : BackgroundService, IOutboxDispatcherService
    {
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
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await DispatchPendingMessagesAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _eventLogService.WriteEvent(1001, $"Unhandled exception in OutboxDispatcherService: {ex.Message}\n{ex.StackTrace}", EventLogEntryType.Error);
                }

                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
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

            var token = await _credentialManager.GetDeviceTokenAsync();
            // Fallback to in-memory token if credential manager read fails
            if (string.IsNullOrEmpty(token))
            {
                token = DeviceRegistrationService.CurrentToken;
            }
            if (string.IsNullOrEmpty(token))
            {
                _eventLogService.WriteEvent(1000, "Authentication failure: No device token available", EventLogEntryType.Error);
                return;
            }

            foreach (var message in messages)
            {
                if (cancellationToken.IsCancellationRequested) break;
                if (DateTime.UtcNow < _circuitBreakerUntil) break;

                string endpoint = GetEndpointForType(message.MessageType);
                string url = $"{_config.ServerUrl}{endpoint}";

                // Create fresh HttpClient per request to avoid header pollution
                var httpClient = _httpClientFactory.CreateClient();
                httpClient.Timeout = TimeSpan.FromSeconds(30);

                var request = new HttpRequestMessage(HttpMethod.Post, url)
                {
                    Content = new StringContent(message.Payload, Encoding.UTF8, "application/json")
                };
                request.Headers.Add("X-Device-Token", token);
                request.Headers.Add("X-Idempotency-Key", message.Id.ToString());

                try
                {
                    var response = await httpClient.SendAsync(request, cancellationToken);

                    if (response.IsSuccessStatusCode)
                    {
                        await _queueService.MarkDeliveredAsync(message.Id, cancellationToken);
                        ResetCircuitBreaker();
                    }
                    else if ((int)response.StatusCode >= 400 && (int)response.StatusCode < 500)
                    {
                        if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized || 
                            response.StatusCode == System.Net.HttpStatusCode.Forbidden)
                        {
                            _eventLogService.WriteEvent(1000, $"Authentication failure for message {message.Id} (Status {response.StatusCode})", EventLogEntryType.Error);
                        }
                        
                        var error = $"HTTP {(int)response.StatusCode}: {response.ReasonPhrase}";
                        await _queueService.MarkFailedAsync(message.Id, error, cancellationToken);
                        ResetCircuitBreaker();
                    }
                    else // 5xx
                    {
                        var error = $"HTTP {(int)response.StatusCode}: {response.ReasonPhrase}";
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
                "heartbeat" => "/device/heartbeat",
                "telemetry" => "/telemetry",
                "inventory" => "/inventory",
                "security_scan" => "/security",
                "alert" => "/alerts",
                _ => $"/unknown/{type}"
            };
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