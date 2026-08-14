using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using NOS.Agent.Models;
using NOS.Agent.Services;

namespace NOS.Agent.Workers;

/// <summary>
/// Background worker daemon responsible for initial agent onboarding registration,
/// persistent diagnostic heartbeats, telemetry ingestion, offline buffering, and drain on reconnect.
/// </summary>
public class TelemetryCollectorWorker : BackgroundService
{
    private readonly ILogger<TelemetryCollectorWorker> _logger;
    private readonly ISystemDiagnosticsService _diagnosticsService;
    private readonly ITokenStorageService _tokenStorageService;
    private readonly IOfflineBufferService _offlineBufferService;
    private readonly ICollectorSchedulerService _schedulerService;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly int _pollIntervalSeconds;
    private readonly string _apiEndpoint;
    private readonly string _registrationKey;

    public TelemetryCollectorWorker(
        ILogger<TelemetryCollectorWorker> logger,
        ISystemDiagnosticsService diagnosticsService,
        ITokenStorageService tokenStorageService,
        IOfflineBufferService offlineBufferService,
        ICollectorSchedulerService schedulerService,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration)
    {
        _logger = logger;
        _diagnosticsService = diagnosticsService;
        _tokenStorageService = tokenStorageService;
        _offlineBufferService = offlineBufferService;
        _schedulerService = schedulerService;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        
        _pollIntervalSeconds = configuration.GetValue<int>("AgentConfig:PollIntervalSeconds", 30);
        var endpoint = configuration.GetValue<string>("AgentConfig:ApiIngestionEndpoint") 
                    ?? configuration.GetValue<string>("AgentConfig:BackendUrl") 
                    ?? "http://localhost:4000/api/v1";
        _apiEndpoint = endpoint.TrimEnd('/');
        _registrationKey = configuration.GetValue<string>("AgentConfig:RegistrationKey", "")!;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("🚀 NOS Enterprise Agent (Telemetry & Heartbeat Worker) booting up. Target Server: [{ApiEndpoint}], Interval: [{Interval}s]", _apiEndpoint, _pollIntervalSeconds);

        var client = _httpClientFactory.CreateClient("NOSAgentClient");
        client.Timeout = TimeSpan.FromSeconds(15);

        // 1. FIRST STARTUP REGISTER OR RESTORE SESSION
        TokenCredentials? credentials = await _tokenStorageService.GetCredentialsAsync(stoppingToken);

        if (credentials == null)
        {
            // If credentials were provisioned into appsettings.json by installer or automated deployment, restore them directly
            var configDeviceId = _configuration.GetValue<string>("AgentConfig:DeviceId");
            var configDeviceToken = _configuration.GetValue<string>("AgentConfig:DeviceToken");
            if (!string.IsNullOrEmpty(configDeviceId) && !string.IsNullOrEmpty(configDeviceToken))
            {
                _logger.LogInformation("🛡️ Restoring device credentials from configuration file for Device ID: [{Id}]...", configDeviceId);
                credentials = new TokenCredentials(configDeviceId, configDeviceToken, DateTime.UtcNow.ToString("O"));
                await _tokenStorageService.SaveCredentialsAsync(credentials, stoppingToken);
            }
            else
            {
                _logger.LogInformation("🛡️ No secure device credentials cached locally. Initiating Zero-Trust Device Registration...");
                credentials = await RegisterAgentAsync(client, stoppingToken);
                
                while (credentials == null && !stoppingToken.IsCancellationRequested)
                {
                    _logger.LogWarning("⏳ Agent Onboarding failed or target unreachable. Retrying registration in 15 seconds...");
                    await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);
                    credentials = await RegisterAgentAsync(client, stoppingToken);
                }
            }
        }
        else
        {
            _logger.LogInformation("✅ Existing cryptographic registration credentials restored for Device ID: [{Id}]", credentials.DeviceId);
        }

        if (stoppingToken.IsCancellationRequested || credentials == null) return;

        // 2. CONTINUOUS HEARTBEAT & TELEMETRY COLLECTION LOOP
        _logger.LogInformation("⏰ Engaging persistent telemetry collection & heartbeat loop (Every {Seconds}s)...", _pollIntervalSeconds);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // Dispatch Diagnostic Heartbeat
                var heartbeat = _diagnosticsService.GetHeartbeatMetrics(credentials.DeviceId);
                var hbRequest = new HttpRequestMessage(HttpMethod.Post, $"{_apiEndpoint}/device/heartbeat")
                {
                    Content = JsonContent.Create(heartbeat)
                };
                hbRequest.Headers.Add("X-Device-Token", credentials.RegistrationToken);

                var hbResponse = await client.SendAsync(hbRequest, stoppingToken);

                if (hbResponse.IsSuccessStatusCode)
                {
                    _logger.LogInformation("💓 [Heartbeat Confirmed] CPU: {Cpu}%, RAM: {Ram}%, Uptime: {Up}s, IP: {Ip}", 
                        heartbeat.CpuUsage, heartbeat.RamUsage, heartbeat.Uptime, heartbeat.IpAddress);
                    _schedulerService.RecordSuccess("Heartbeat");
                }
                else if (hbResponse.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                {
                    _logger.LogError("🛑 Authentication rejected (401 Unauthorized) on Heartbeat. Token revoked. Re-registering agent...");
                    await _tokenStorageService.ClearCredentialsAsync(stoppingToken);
                    credentials = await RegisterAgentAsync(client, stoppingToken);
                    continue;
                }
                else
                {
                    _logger.LogWarning("⚠️ Heartbeat rejection from control plane. Status Code: {Status}", hbResponse.StatusCode);
                }

                // Dispatch Complete Telemetry Snapshot in UTC
                var telemetry = _diagnosticsService.GetTelemetrySnapshot(credentials.DeviceId);
                var telemetryRequest = new HttpRequestMessage(HttpMethod.Post, $"{_apiEndpoint}/telemetry")
                {
                    Content = JsonContent.Create(telemetry)
                };
                telemetryRequest.Headers.Add("X-Device-Token", credentials.RegistrationToken);

                var telemetryResponse = await client.SendAsync(telemetryRequest, stoppingToken);

                if (telemetryResponse.IsSuccessStatusCode)
                {
                    _logger.LogInformation("📡 [Telemetry Ingested] CPU: {Cpu}% ({Temp}°C @ {Freq}MHz), RAM: {Mem}%, Disk: {Disk}%, Sockets: {Conns}, Procs: {Procs}",
                        telemetry.CpuUsage, telemetry.CpuTemperature, telemetry.CpuFrequency, telemetry.MemoryUsagePercent, telemetry.DiskUsagePercent, telemetry.ActiveConnections, telemetry.RunningProcesses);

                    _schedulerService.RecordSuccess("Telemetry");

                    // Drain offline buffer on successful connection
                    if (_offlineBufferService.Count > 0)
                    {
                        _logger.LogInformation("🔄 Server reachable! Draining {_Count} buffered offline telemetry snapshots...", _offlineBufferService.Count);
                        var bufferedBatch = await _offlineBufferService.DequeueBatchAsync<TelemetrySnapshotPayload>(10);
                        foreach (var buffered in bufferedBatch)
                        {
                            try
                            {
                                var drainRequest = new HttpRequestMessage(HttpMethod.Post, $"{_apiEndpoint}/telemetry")
                                {
                                    Content = JsonContent.Create(buffered)
                                };
                                drainRequest.Headers.Add("X-Device-Token", credentials.RegistrationToken);
                                await client.SendAsync(drainRequest, stoppingToken);
                            }
                            catch (Exception ex)
                            {
                                _logger.LogWarning("Buffer drain item failed: {Message}", ex.Message);
                            }
                        }
                    }
                }
                else if (telemetryResponse.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                {
                    _logger.LogError("🛑 Authentication rejected (401 Unauthorized) on Telemetry Submission. Re-registering agent on next cycle...");
                    await _tokenStorageService.ClearCredentialsAsync(stoppingToken);
                    credentials = await RegisterAgentAsync(client, stoppingToken);
                }
                else
                {
                    var errBody = await telemetryResponse.Content.ReadAsStringAsync(stoppingToken);
                    _logger.LogWarning("⚠️ Telemetry snapshot rejection from control plane. Status Code: {Status}, Error: {Error}. Buffering snapshot locally.", telemetryResponse.StatusCode, errBody);
                    await _offlineBufferService.EnqueueAsync(telemetry);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Network connectivity exception during telemetry transmission. Buffering snapshot locally.");
                try
                {
                    var telemetry = _diagnosticsService.GetTelemetrySnapshot(credentials.DeviceId);
                    await _offlineBufferService.EnqueueAsync(telemetry);
                }
                catch {}
                _schedulerService.RecordFailure("Telemetry", ex);
            }

            await Task.Delay(TimeSpan.FromSeconds(_pollIntervalSeconds), stoppingToken);
        }

        _logger.LogInformation("🛑 NOS Enterprise Agent Worker shutting down gracefully.");
    }

    private async Task<TokenCredentials?> RegisterAgentAsync(HttpClient client, CancellationToken cancellationToken)
    {
        try
        {
            var uuid = _tokenStorageService.GetOrCreateStableMachineUuid();
            var payload = _diagnosticsService.GetRegistrationInfo(uuid, _registrationKey);

            _logger.LogInformation("Transmitting Phase 2B onboarding profile for Hardware UUID: [{Uuid}], Host: [{Host}]...", uuid, payload.Hostname);
            
            var response = await client.PostAsJsonAsync($"{_apiEndpoint}/device/register", payload, cancellationToken);
            
            if (response.IsSuccessStatusCode)
            {
                var jsonResult = await response.Content.ReadFromJsonAsync<ApiResponse<RegisterDeviceData>>(cancellationToken: cancellationToken);
                if (jsonResult != null && jsonResult.Success && jsonResult.Data != null)
                {
                    var credentials = new TokenCredentials(
                        DeviceId: jsonResult.Data.DeviceId,
                        RegistrationToken: jsonResult.Data.RegistrationToken,
                        RegisteredAt: DateTime.UtcNow.ToString("O")
                    );

                    await _tokenStorageService.SaveCredentialsAsync(credentials, cancellationToken);
                    _logger.LogInformation("🎉 Agent successfully registered! Assigned Device ID: [{Id}]", credentials.DeviceId);
                    return credentials;
                }
            }

            var errText = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("Registration request failed with code [{Code}]: {Body}", response.StatusCode, errText);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception encountered during zero-trust agent onboarding attempt.");
            return null;
        }
    }
}

