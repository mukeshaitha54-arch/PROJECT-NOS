using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Management;
using System.ServiceProcess;
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

            await CollectAndSendInventoryAsync(stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    int intervalSeconds = _configuration.InventoryIntervalSeconds > 0 ? _configuration.InventoryIntervalSeconds : 3600;
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
                    deviceId = DeviceRegistrationService.CurrentDeviceId ?? _configuration.DeviceId,
                    // Hardware info
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
                    architecture = GetWmiValue("Win32_OperatingSystem", "OSArchitecture", "x64"),
                    // Dynamic sections
                    installedSoftware = GetInstalledSoftware(),
                    runningServices = GetRunningServices(),
                    startupPrograms = GetStartupPrograms(),
                    runningProcesses = GetRunningProcessList(),
                };

                string json = JsonSerializer.Serialize(payload, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

                await _outboxQueue.EnqueueAsync("inventory", json, 2, stoppingToken);
                _logger.LogInformation("Inventory snapshot queued successfully (software: {sw}, services: {svc}, processes: {procs}).",
                    payload.installedSoftware.Count,
                    payload.runningServices.Count,
                    payload.runningProcesses.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to collect and queue inventory snapshot.");
            }
        }

        /// <summary>
        /// Returns list of installed programs from both registry hives and Win32_Product WMI.
        /// Uses registry for speed (Win32_Product is very slow).
        /// </summary>
        private List<object> GetInstalledSoftware()
        {
            var software = new List<object>();
            if (!OperatingSystem.IsWindows()) return software;

            try
            {
                // Faster: read from Uninstall registry keys instead of Win32_Product
                var regPaths = new[]
                {
                    @"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
                    @"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"
                };

                foreach (var regPath in regPaths)
                {
                    try
                    {
                        using var key = Microsoft.Win32.Registry.LocalMachine.OpenSubKey(regPath);
                        if (key == null) continue;

                        foreach (var subKeyName in key.GetSubKeyNames())
                        {
                            try
                            {
                                using var subKey = key.OpenSubKey(subKeyName);
                                if (subKey == null) continue;

                                var displayName = subKey.GetValue("DisplayName") as string;
                                if (string.IsNullOrWhiteSpace(displayName)) continue;

                                var version = subKey.GetValue("DisplayVersion") as string ?? "";
                                var publisher = subKey.GetValue("Publisher") as string ?? "";
                                var installDate = subKey.GetValue("InstallDate") as string ?? "";

                                software.Add(new
                                {
                                    name = displayName.Trim(),
                                    version = version.Trim(),
                                    publisher = publisher.Trim(),
                                    installedDate = installDate,
                                });
                            }
                            catch { }
                        }
                    }
                    catch { }
                }

                // Also check current user hive
                try
                {
                    using var userKey = Microsoft.Win32.Registry.CurrentUser.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall");
                    if (userKey != null)
                    {
                        foreach (var subKeyName in userKey.GetSubKeyNames())
                        {
                            try
                            {
                                using var subKey = userKey.OpenSubKey(subKeyName);
                                if (subKey == null) continue;
                                var displayName = subKey.GetValue("DisplayName") as string;
                                if (string.IsNullOrWhiteSpace(displayName)) continue;
                                software.Add(new
                                {
                                    name = displayName.Trim(),
                                    version = (subKey.GetValue("DisplayVersion") as string ?? "").Trim(),
                                    publisher = (subKey.GetValue("Publisher") as string ?? "").Trim(),
                                    installedDate = subKey.GetValue("InstallDate") as string ?? "",
                                });
                            }
                            catch { }
                        }
                    }
                }
                catch { }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to enumerate installed software from registry.");
            }

            // Deduplicate by name
            return software
                .Cast<dynamic>()
                .GroupBy(s => (string)s.name)
                .Select(g => g.First())
                .Cast<object>()
                .OrderBy(s => ((dynamic)s).name)
                .ToList();
        }

        /// <summary>
        /// Returns all Windows services with name, display name, status, and start type.
        /// </summary>
        private List<object> GetRunningServices()
        {
            var services = new List<object>();
            if (!OperatingSystem.IsWindows()) return services;

            try
            {
                foreach (var svc in ServiceController.GetServices())
                {
                    try
                    {
                        string startType = "Unknown";
                        try
                        {
                            using var wmiSearcher = new ManagementObjectSearcher(
                                $"SELECT StartMode FROM Win32_Service WHERE Name='{svc.ServiceName.Replace("'", "''")}'");
                            var wmiSvc = wmiSearcher.Get().Cast<ManagementObject>().FirstOrDefault();
                            startType = wmiSvc?["StartMode"]?.ToString() ?? "Unknown";
                        }
                        catch { }

                        services.Add(new
                        {
                            name = svc.ServiceName,
                            displayName = svc.DisplayName,
                            status = svc.Status.ToString(),
                            startType = startType,
                        });
                    }
                    catch { }
                    finally
                    {
                        try { svc.Dispose(); } catch { }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to enumerate Windows services.");
            }

            return services;
        }

        /// <summary>
        /// Returns startup programs from WMI Win32_StartupCommand.
        /// </summary>
        private List<object> GetStartupPrograms()
        {
            var startupItems = new List<object>();
            if (!OperatingSystem.IsWindows()) return startupItems;

            try
            {
                using var searcher = new ManagementObjectSearcher("SELECT Name, Command, Location, User FROM Win32_StartupCommand");
                foreach (ManagementObject item in searcher.Get())
                {
                    startupItems.Add(new
                    {
                        name = item["Name"]?.ToString() ?? "Unknown",
                        command = item["Command"]?.ToString() ?? "",
                        location = item["Location"]?.ToString() ?? "",
                        user = item["User"]?.ToString() ?? "",
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to enumerate startup programs.");
            }

            return startupItems;
        }

        /// <summary>
        /// Returns the live running process list (name, PID, CPU time, memory).
        /// Capped at 200 processes to avoid payload bloat.
        /// </summary>
        private List<object> GetRunningProcessList()
        {
            var processList = new List<object>();
            try
            {
                var procs = Process.GetProcesses()
                    .OrderByDescending(p =>
                    {
                        try { return p.WorkingSet64; } catch { return 0L; }
                    })
                    .Take(200);

                foreach (var proc in procs)
                {
                    try
                    {
                        processList.Add(new
                        {
                            pid = proc.Id,
                            name = proc.ProcessName,
                            memoryMb = Math.Round(proc.WorkingSet64 / (1024.0 * 1024.0), 1),
                            cpuTimeSec = Math.Round(proc.TotalProcessorTime.TotalSeconds, 1),
                            threads = proc.Threads.Count,
                            status = "Running",
                        });
                    }
                    catch { }
                    finally
                    {
                        try { proc.Dispose(); } catch { }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to enumerate running processes.");
            }

            return processList;
        }

        private string GetWmiValue(string wmiClass, string property, string defaultValue)
        {
            if (!OperatingSystem.IsWindows()) return defaultValue;

            try
            {
                using var searcher = new ManagementObjectSearcher($"SELECT {property} FROM {wmiClass}");
                var result = searcher.Get().Cast<ManagementObject>().FirstOrDefault();
                if (result != null && result[property] != null)
                    return result[property]?.ToString()?.Trim() ?? defaultValue;
            }
            catch
            {
                // Ignore WMI errors
            }

            return defaultValue;
        }
    }
}
