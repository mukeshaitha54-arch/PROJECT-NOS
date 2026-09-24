using System;
using System.Diagnostics;
using System.Linq;
using System.Management;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NOS.Agent.Configuration;

namespace NOS.Agent.Services
{
    public class InventoryCollector : BackgroundService
    {
        private readonly IOutboxQueueService _outboxQueue;
        private readonly AgentConfiguration _configuration;
        private readonly ILogger<InventoryCollector> _logger;
        private readonly ISafeModeService _safeMode;

        public InventoryCollector(
            IOutboxQueueService outboxQueue,
            IOptions<AgentConfiguration> options,
            ILogger<InventoryCollector> logger,
            ISafeModeService safeMode)
        {
            _outboxQueue = outboxQueue;
            _configuration = options.Value;
            _logger = logger;
            _safeMode = safeMode;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // Wait until device is registered
            while (string.IsNullOrEmpty(DeviceRegistrationService.CurrentToken) && !stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(1000, stoppingToken);
            }

            if (stoppingToken.IsCancellationRequested) return;

            // Optional initial collection
            await CollectAndSendInventoryAsync(stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    int intervalSeconds = _configuration.InventoryIntervalSeconds > 0 ? _configuration.InventoryIntervalSeconds : 86400; // default 24h
                    await Task.Delay(TimeSpan.FromSeconds(intervalSeconds), stoppingToken);
                    await CollectAndSendInventoryAsync(stoppingToken);
                }
                catch (TaskCanceledException) { }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Unhandled exception in InventoryCollector loop.");
                }
            }
        }

        private async Task CollectAndSendInventoryAsync(CancellationToken stoppingToken)
        {
            if (_safeMode.IsActive)
            {
                _logger.LogInformation("Skipping inventory cycle due to Safe Mode being active.");
                return;
            }

            try
            {
                var payload = new
                {
                    deviceId = _configuration.DeviceId,
                    manufacturer = GetWmiValue("Win32_ComputerSystem", "Manufacturer", "Unknown"),
                    model = GetWmiValue("Win32_ComputerSystem", "Model", "Unknown"),
                    serialNumber = GetWmiValue("Win32_BIOS", "SerialNumber", "Unknown"),
                    motherboard = GetWmiValue("Win32_BaseBoard", "Product", "Unknown"),
                    biosVendor = GetWmiValue("Win32_BIOS", "Manufacturer", "Unknown"),
                    biosVersion = GetWmiValue("Win32_BIOS", "SMBIOSBIOSVersion", "Unknown"),
                    biosReleaseDate = GetWmiValue("Win32_BIOS", "ReleaseDate", ""),
                    cpuModel = GetWmiValue("Win32_Processor", "Name", "Unknown"),
                    cpuVendor = GetWmiValue("Win32_Processor", "Manufacturer", "Unknown"),
                    physicalCores = int.TryParse(GetWmiValue("Win32_Processor", "NumberOfCores", "1"), out var pc) ? pc : 1,
                    logicalCores = int.TryParse(GetWmiValue("Win32_Processor", "NumberOfLogicalProcessors", "1"), out var lc) ? lc : 1,
                    hostname = Environment.MachineName,
                    domain = GetWmiValue("Win32_ComputerSystem", "Domain", "WORKGROUP"),
                    workgroup = GetWmiValue("Win32_ComputerSystem", "Workgroup", "WORKGROUP"),
                    osEdition = GetWmiValue("Win32_OperatingSystem", "Caption", "Unknown"),
                    osBuild = GetWmiValue("Win32_OperatingSystem", "BuildNumber", "Unknown"),
                    architecture = GetWmiValue("Win32_OperatingSystem", "OSArchitecture", "x64")
                };

                string json = JsonSerializer.Serialize(payload, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

                await _outboxQueue.EnqueueAsync("inventory", json, 2, stoppingToken);
                _logger.LogInformation("Inventory snapshot queued successfully.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to collect and queue inventory snapshot.");
            }
        }

        private string GetWmiValue(string wmiClass, string property, string defaultValue)
        {
            if (!OperatingSystem.IsWindows()) return defaultValue;
            
            try
            {
                using var searcher = new ManagementObjectSearcher($"SELECT {property} FROM {wmiClass}");
                var result = searcher.Get().Cast<ManagementObject>().FirstOrDefault();
                if (result != null && result[property] != null)
                {
                    return result[property]?.ToString()?.Trim() ?? defaultValue;
                }
            }
            catch
            {
                // Ignore WMI errors
            }
            
            return defaultValue;
        }
    }
}
