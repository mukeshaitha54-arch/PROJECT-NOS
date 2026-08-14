using System;
using System.IO;
using System.Linq;
using System.Management;
using System.Net.Http;
using System.Net.Http.Json;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace NOS.Agent.Services
{
    public class DeviceRegistrationService : BackgroundService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly ICredentialManagerService _credentialManager;
        private readonly ILogger<DeviceRegistrationService> _logger;

        public static string? CurrentToken { get; private set; }
        public static string? CurrentDeviceId { get; private set; }

        public DeviceRegistrationService(
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ICredentialManagerService credentialManager,
            ILogger<DeviceRegistrationService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _credentialManager = credentialManager;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var configuredDeviceId = _configuration["AgentConfiguration:DeviceId"];
            var savedDeviceId = LoadSavedDeviceId();
            var effectiveDeviceId = !string.IsNullOrWhiteSpace(configuredDeviceId) ? configuredDeviceId : savedDeviceId;

            var existingToken = await _credentialManager.GetDeviceTokenAsync();
            var needsRegistration = string.IsNullOrWhiteSpace(effectiveDeviceId) || string.IsNullOrWhiteSpace(existingToken);

            if (!needsRegistration && !string.IsNullOrEmpty(existingToken))
            {
                CurrentToken = existingToken;
                CurrentDeviceId = effectiveDeviceId;
                _logger.LogInformation("Agent initialized with existing DeviceId: {DeviceId}", effectiveDeviceId);
                return;
            }

            int retryCount = 0;
            while (!stoppingToken.IsCancellationRequested && needsRegistration)
            {
                try
                {
                    var machineInfo = CollectMachineInfo();
                    var registerUrl = BuildApiUrl("api/v1/device/register");

                    _logger.LogInformation("Registering endpoint with control plane at {RegisterUrl}...", registerUrl);

                    using var client = _httpClientFactory.CreateClient();
                    client.Timeout = TimeSpan.FromSeconds(30);

                    var response = await client.PostAsJsonAsync(registerUrl, machineInfo, stoppingToken);

                    if (response.IsSuccessStatusCode)
                    {
                        var wrapper = await response.Content.ReadFromJsonAsync<ApiResponseWrapper<RegistrationResponse>>(cancellationToken: stoppingToken);
                        var result = wrapper?.Data;

                        if (result != null && !string.IsNullOrEmpty(result.DeviceId) && (!string.IsNullOrEmpty(result.Token) || !string.IsNullOrEmpty(result.RegistrationToken)))
                        {
                            var token = result.Token ?? result.RegistrationToken!;
                            var deviceId = result.DeviceId;

                            // Store in Credential Manager & DPAPI
                            CredentialManagerService.WriteToken(token, deviceId);
                            CurrentToken = token;
                            CurrentDeviceId = deviceId;

                            // Save DeviceId to %LOCALAPPDATA%\NOS\device.json
                            SaveDeviceIdLocally(deviceId, _configuration["AgentConfiguration:ServerUrl"] ?? "http://localhost:3001");

                            // Update appsettings.json if writable
                            UpdateAppsettings(deviceId);

                            _logger.LogInformation("Successfully registered device. Assigned DeviceId: {DeviceId}", deviceId);
                            needsRegistration = false;
                            break;
                        }
                        else
                        {
                            var respText = await response.Content.ReadAsStringAsync(stoppingToken);
                            _logger.LogError("Registration response missing DeviceId or Token. Body: {Response}", respText);
                        }
                    }
                    else
                    {
                        var errorBody = await response.Content.ReadAsStringAsync(stoppingToken);
                        _logger.LogError("Registration request returned HTTP {StatusCode}: {Content}", (int)response.StatusCode, errorBody);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning("Endpoint registration transient error: {Message}", ex.Message);
                }

                retryCount++;
                var delay = retryCount > 5 ? TimeSpan.FromSeconds(30) : TimeSpan.FromSeconds(10);
                _logger.LogInformation("Retrying registration in {Delay}s...", delay.TotalSeconds);
                await Task.Delay(delay, stoppingToken);
            }
        }

        private object CollectMachineInfo()
        {
            string osCaption = "Windows 11";
            string osVersion = Environment.OSVersion.Version.ToString();

            try
            {
                if (OperatingSystem.IsWindows())
                {
                    using var searcher = new ManagementObjectSearcher("SELECT Caption, Version FROM Win32_OperatingSystem");
                    var osInfo = searcher.Get().Cast<ManagementObject>().FirstOrDefault();
                    if (osInfo != null)
                    {
                        osCaption = osInfo["Caption"]?.ToString() ?? osCaption;
                        osVersion = osInfo["Version"]?.ToString() ?? osVersion;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "WMI OS query skipped");
            }

            var orgId = _configuration["AgentConfiguration:TenantId"] ?? "default-org";

            return new
            {
                uuid = Guid.NewGuid().ToString(),
                deviceName = Environment.MachineName,
                hostname = Environment.MachineName,
                os = osCaption,
                osVersion = osVersion,
                architecture = RuntimeInformation.ProcessArchitecture.ToString(),
                agentVersion = Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "1.0.0",
                organizationId = orgId
            };
        }

        private string BuildApiUrl(string endpoint)
        {
            var serverUrl = _configuration["AgentConfiguration:ServerUrl"] ?? "http://localhost:3001";
            var baseUri = new Uri(serverUrl.EndsWith("/") ? serverUrl : serverUrl + "/");
            var fullUri = new Uri(baseUri, endpoint.TrimStart('/'));
            return fullUri.ToString();
        }

        private static string? LoadSavedDeviceId()
        {
            try
            {
                var appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                var deviceJsonPath = Path.Combine(appData, "NOS", "device.json");
                if (File.Exists(deviceJsonPath))
                {
                    var json = File.ReadAllText(deviceJsonPath);
                    using var doc = JsonDocument.Parse(json);
                    if (doc.RootElement.TryGetProperty("DeviceId", out var devId))
                    {
                        return devId.GetString();
                    }
                }
            }
            catch { }
            return null;
        }

        private void SaveDeviceIdLocally(string deviceId, string serverUrl)
        {
            try
            {
                var appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                var nosDir = Path.Combine(appData, "NOS");
                if (!Directory.Exists(nosDir))
                {
                    Directory.CreateDirectory(nosDir);
                }

                var deviceJsonPath = Path.Combine(nosDir, "device.json");
                var payload = new
                {
                    DeviceId = deviceId,
                    ServerUrl = serverUrl,
                    Hostname = Environment.MachineName,
                    RegisteredAt = DateTime.UtcNow.ToString("o")
                };

                File.WriteAllText(deviceJsonPath, JsonSerializer.Serialize(payload, new JsonSerializerOptions { WriteIndented = true }));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to save device.json locally in %LOCALAPPDATA%\\NOS");
            }
        }

        private void UpdateAppsettings(string newDeviceId)
        {
            try
            {
                var filePath = Path.Combine(AppContext.BaseDirectory, "appsettings.json");
                if (File.Exists(filePath))
                {
                    var json = File.ReadAllText(filePath);
                    var node = JsonNode.Parse(json);
                    if (node != null && node["AgentConfiguration"] != null)
                    {
                        node["AgentConfiguration"]!["DeviceId"] = newDeviceId;
                        File.WriteAllText(filePath, node.ToJsonString(new JsonSerializerOptions { WriteIndented = true }));
                    }
                }
            }
            catch
            {
                // In single-file self-contained bundle, app directory may be read-only; %LOCALAPPDATA% handles persistence
            }
        }

        private class ApiResponseWrapper<T>
        {
            public bool Success { get; set; }
            public T? Data { get; set; }
            public string? Message { get; set; }
        }

        private class RegistrationResponse
        {
            public string? DeviceId { get; set; }
            public string? Token { get; set; }
            public string? RegistrationToken { get; set; }
        }
    }
}