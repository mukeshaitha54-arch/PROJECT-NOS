using System;
using System.Diagnostics;
using System.Net.Http;
using System.Net.Http.Headers;
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
        private readonly HttpClient _httpClient;

        private int _consecutiveNetworkErrors = 0;
        private DateTime _circuitBreakerUntil = DateTime.MinValue;

        public OutboxDispatcherService(
            IOutboxQueueService queueService,
            ICredentialManagerService credentialManager,
            IWindowsEventLogService eventLogService,
            IOptions<AgentConfiguration> configOptions,
            HttpClient httpClient)
        {
            _queueService = queueService;
            _credentialManager = credentialManager;
            _eventLogService = eventLogService;
            _config = configOptions.Value;
            _httpClient = httpClient;
            _httpClient.Timeout = TimeSpan.FromSeconds(30);
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
                    await _eventLogService.LogAsync("Unhandled exception in OutboxDispatcherService", EventLogEntryType.Error, 1001, ex);
                }

                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
            }
        }

        public async Task DispatchPendingMessagesAsync(CancellationToken cancellationToken = default)
        {
            if (DateTime.UtcNow < _circuitBreakerUntil)
            {
                return;
            }

            var messages = await _queueService.GetPendingMessagesAsync(50, cancellationToken);
            if (messages.Count == 0) return;

            var token = await _credentialManager.GetDeviceTokenAsync();
            if (string.IsNullOrEmpty(token))
            {
                await _eventLogService.LogAsync("Authentication failure: Missing device token in credential manager", EventLogEntryType.Error, 1000);
                return;
            }

            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            foreach (var message in messages)
            {
                if (cancellationToken.IsCancellationRequested) break;
                if (DateTime.UtcNow < _circuitBreakerUntil) break;

                string endpoint = GetEndpointForType(message.MessageType);
                string url = $"{_config.ServerUrl}{endpoint}";

                var request = new HttpRequestMessage(HttpMethod.Post, url)
                {
                    Content = new StringContent(message.Payload, Encoding.UTF8, "application/json")
                };
                request.Headers.Add("X-Idempotency-Key", message.Id.ToString());

                try
                {
                    var response = await _httpClient.SendAsync(request, cancellationToken);

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
                            await _eventLogService.LogAsync($"Authentication failure for message {message.Id} (Status {response.StatusCode})", EventLogEntryType.Error, 1000);
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
                "heartbeat" => "/api/v1/devices/heartbeat",
                "telemetry" => "/api/v1/telemetry",
                "inventory" => "/api/v1/inventory",
                "security_scan" => "/api/v1/security",
                "alert" => "/api/v1/alerts",
                _ => $"/api/v1/unknown/{type}"
            };
        }

        private void HandleNetworkError()
        {
            _consecutiveNetworkErrors++;
            if (_consecutiveNetworkErrors >= 5)
            {
                int pauseMinutes = (int)Math.Pow(2, (_consecutiveNetworkErrors - 5) / 5 + 1); // 2, 4, 8...
                pauseMinutes = Math.Min(pauseMinutes, 10);
                
                _circuitBreakerUntil = DateTime.UtcNow.AddMinutes(pauseMinutes);
                _eventLogService.LogAsync($"Network offline detected. Circuit breaker open for {pauseMinutes} minutes.", EventLogEntryType.Warning, 2000).GetAwaiter().GetResult();
            }
        }

        private void ResetCircuitBreaker()
        {
            if (_consecutiveNetworkErrors >= 5)
            {
                _eventLogService.LogAsync("Network restored. Circuit breaker closed.", EventLogEntryType.Information, 3000).GetAwaiter().GetResult();
            }
            _consecutiveNetworkErrors = 0;
            _circuitBreakerUntil = DateTime.MinValue;
        }
    }
}
