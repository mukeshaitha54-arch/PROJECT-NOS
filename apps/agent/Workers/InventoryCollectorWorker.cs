using System;
using System.Net.Http;
using System.Net.Http.Headers;
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
/// Background worker daemon responsible for Phase 3 Device Inventory & Asset Discovery ingestion.
/// Executes initial inventory snapshot upon device onboarding registration and cycles autonomously every 24 hours.
/// </summary>
public class InventoryCollectorWorker : BackgroundService
{
    private readonly ILogger<InventoryCollectorWorker> _logger;
    private readonly IInventoryDiscoveryService _discoveryService;
    private readonly ITokenStorageService _tokenStorageService;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly int _inventoryIntervalHours;
    private readonly string _apiEndpoint;

    public InventoryCollectorWorker(
        ILogger<InventoryCollectorWorker> logger,
        IInventoryDiscoveryService discoveryService,
        ITokenStorageService tokenStorageService,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration)
    {
        _logger = logger;
        _discoveryService = discoveryService;
        _tokenStorageService = tokenStorageService;
        _httpClientFactory = httpClientFactory;
        
        _inventoryIntervalHours = configuration.GetValue<int>("AgentConfig:InventoryIntervalHours", 24);
        _apiEndpoint = configuration.GetValue<string>("AgentConfig:ApiIngestionEndpoint", "http://localhost:3001/api/v1").TrimEnd('/');
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("📦 NOS Monitoring Agent (Phase 3 Inventory & Asset Discovery Worker) booting up. Target Server: [{ApiEndpoint}], Schedule Interval: [{Hours} Hours]", _apiEndpoint, _inventoryIntervalHours);

        var client = _httpClientFactory.CreateClient("NOSAgentClient");
        client.Timeout = TimeSpan.FromSeconds(30); // Allow sufficient timeout for comprehensive asset serialization

        // Wait until TelemetryCollectorWorker successfully finishes initial device registration onboarding
        TokenCredentials? credentials = await _tokenStorageService.GetCredentialsAsync(stoppingToken);
        while (credentials == null && !stoppingToken.IsCancellationRequested)
        {
            _logger.LogDebug("Waiting for device onboarding credentials before executing asset scan...");
            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            credentials = await _tokenStorageService.GetCredentialsAsync(stoppingToken);
        }

        if (stoppingToken.IsCancellationRequested) return;

        _logger.LogInformation("🔐 Device Onboarding credentials confirmed for node [{DeviceId}]. Initiating baseline inventory discovery scan...", credentials!.DeviceId);

        // Execute initial baseline inventory scan on startup / registration
        await TransmitInventoryAsync(client, credentials, stoppingToken);

        var interval = TimeSpan.FromHours(_inventoryIntervalHours);

        while (!stoppingToken.IsCancellationRequested)
        {
            _logger.LogDebug("Next routine inventory asset evaluation scheduled in {Hours} hours.", _inventoryIntervalHours);
            try
            {
                await Task.Delay(interval, stoppingToken);
            }
            catch (TaskCanceledException)
            {
                break;
            }

            if (!stoppingToken.IsCancellationRequested)
            {
                credentials = await _tokenStorageService.GetCredentialsAsync(stoppingToken) ?? credentials;
                _logger.LogInformation("⏰ Routine 24-hour asset discovery interval triggered. Running scan...");
                await TransmitInventoryAsync(client, credentials, stoppingToken);
            }
        }

        _logger.LogInformation("🛑 Inventory Collector Worker gracefully terminating.");
    }

    private async Task TransmitInventoryAsync(HttpClient client, TokenCredentials credentials, CancellationToken stoppingToken)
    {
        try
        {
            var payload = _discoveryService.DiscoverCompleteInventory(credentials.DeviceId);

            var request = new HttpRequestMessage(HttpMethod.Post, $"{_apiEndpoint}/inventory");
            request.Headers.Add("X-Device-Token", credentials.RegistrationToken);
            request.Content = JsonContent.Create(payload, new MediaTypeHeaderValue("application/json"), new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });

            _logger.LogInformation("📡 Transmitting comprehensive system inventory profile to [{Endpoint}/inventory]...", _apiEndpoint);
            
            var response = await client.SendAsync(request, stoppingToken);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("✅ Phase 3 Device Inventory snapshot verified and persisted successfully by NOS Backend.");
            }
            else
            {
                var errorMsg = await response.Content.ReadAsStringAsync(stoppingToken);
                _logger.LogWarning("⚠️ Control plane rejected inventory payload. HTTP {StatusCode}: {Error}", (int)response.StatusCode, errorMsg);
            }
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning("🔌 Network connectivity anomaly during inventory transmission: {Message}", ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Unexpected diagnostic fault during asset discovery evaluation.");
        }
    }
}
