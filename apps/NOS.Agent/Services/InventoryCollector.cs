using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Management;
using System.Net.NetworkInformation;
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
            while (string.IsNullOrEmpty(DeviceRegistrationService.CurrentToken) && !stoppingToken.IsCancellationRequested)
                await Task.Delay(1000, stoppingToken);

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
                catch (Exception ex) { _logger.LogError(ex, "Unhandled exception in InventoryCollector loop."); }
            }
        }

        private async Task CollectAndSendInventoryAsync(CancellationToken stoppingToken)
        {
            if (_safeMode.IsActive) return;

            try
            {
                var sw = GetInstalledSoftware();
                var svc = GetWindowsServices();
                var startup = GetStartupApplications();

                var payload = new
                {
                    deviceId = DeviceRegistrationService.CurrentDeviceId ?? _configuration.DeviceId,
                    manufacturer = GetWmiValue("Win32_ComputerSystem", "Manufacturer", "Unknown"),
                    model = GetWmiValue("Win32_ComputerSystem", "Model", "Unknown"),
                    serialNumber = GetWmiValue("Win32_BIOS", "SerialNumber", "Unknown"),
                    motherboard = GetWmiValue("Win32_BaseBoard", "Product", "Unknown"),
                    biosVendor = GetWmiValue("Win32_BIOS", "Manufacturer", "Unknown"),
                    biosVersion = GetWmiValue("Win32_BIOS", "SMBIOSBIOSVersion", "Unknown"),
                    biosReleaseDate = GetWmiValue("Win32_BIOS", "ReleaseDate", ""),
                    cpuModel = GetWmiValue("Win32_Processor", "Name", "Unknown"),
                    cpuVendor = GetWmiValue("Win32_Processor", "Manufacturer", "Unknown"),
                    physicalCores = int.TryParse(GetWmiValue("Win32_Processor", "NumberOfCores", "1"), out var pcores) ? pcores : 1,
                    logicalCores = int.TryParse(GetWmiValue("Win32_Processor", "NumberOfLogicalProcessors", "1"), out var lcores) ? lcores : 1,
                    hostname = Environment.MachineName,
                    domain = GetWmiValue("Win32_ComputerSystem", "Domain", "WORKGROUP"),
                    workgroup = GetWmiValue("Win32_ComputerSystem", "Workgroup", "WORKGROUP"),
                    osEdition = GetWmiValue("Win32_OperatingSystem", "Caption", "Unknown"),
                    osBuild = GetWmiValue("Win32_OperatingSystem", "BuildNumber", "Unknown"),
                    architecture = GetWmiValue("Win32_OperatingSystem", "OSArchitecture", "x64"),
                    agentVersion = System.Reflection.Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "1.0.0",
                    schemaVersion = "1.0.0",
                    // Arrays — field names MATCH backend SubmitInventoryRequestDto exactly
                    memoryModules = GetMemoryModules(),
                    diskDrives = GetDiskDrives(),
                    networkAdapters = GetNetworkAdapters(),
                    installedSoftware = sw,
                    windowsServices = svc,          // backend DTO field name
                    startupApplications = startup,  // backend DTO field name
                    security = GetSecurityInfo(),
                };

                await _outboxQueue.EnqueueAsync("inventory", payload, 2, stoppingToken);
                _logger.LogInformation(
                    "Inventory queued. Software: {sw}, Services: {svc}, Startup: {st}, MemModules: {mm}, Disks: {dk}",
                    sw.Count, svc.Count, startup.Count, payload.memoryModules.Count, payload.diskDrives.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to collect and queue inventory snapshot.");
            }
        }

        // ─── RAM Modules ──────────────────────────────────────────────────────
        private List<object> GetMemoryModules()
        {
            var modules = new List<object>();
            if (!OperatingSystem.IsWindows()) return modules;
            try
            {
                using var s = new ManagementObjectSearcher(
                    "SELECT DeviceLocator, Capacity, Speed, Manufacturer, PartNumber, SerialNumber FROM Win32_PhysicalMemory");
                foreach (ManagementObject obj in s.Get())
                {
                    modules.Add(new
                    {
                        slot = obj["DeviceLocator"]?.ToString() ?? "",
                        capacityBytes = obj["Capacity"] != null ? Convert.ToInt64(obj["Capacity"]) : 0L,
                        speedMHz = obj["Speed"] != null ? Convert.ToInt32(obj["Speed"]) : 0,
                        manufacturer = obj["Manufacturer"]?.ToString() ?? "",
                        partNumber = obj["PartNumber"]?.ToString()?.Trim() ?? "",
                        serialNumber = obj["SerialNumber"]?.ToString()?.Trim() ?? "",
                    });
                }
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to collect memory modules."); }
            return modules;
        }

        // ─── Disk Drives ─────────────────────────────────────────────────────
        private List<object> GetDiskDrives()
        {
            var disks = new List<object>();
            if (!OperatingSystem.IsWindows()) return disks;
            try
            {
                // Map logical disk sizes
                var logicalSizes = new Dictionary<string, long>(StringComparer.OrdinalIgnoreCase);
                using var logSearcher = new ManagementObjectSearcher(
                    "SELECT DeviceID, Size, FileSystem FROM Win32_LogicalDisk WHERE DriveType=3");
                foreach (ManagementObject ld in logSearcher.Get())
                {
                    var drive = ld["DeviceID"]?.ToString() ?? "";
                    logicalSizes[drive] = ld["Size"] != null ? Convert.ToInt64(ld["Size"]) : 0L;
                }

                using var s = new ManagementObjectSearcher(
                    "SELECT Caption, Model, SerialNumber, MediaType, Size FROM Win32_DiskDrive");
                int idx = 0;
                foreach (ManagementObject obj in s.Get())
                {
                    // Assign drive letter from logical disk map by index
                    string driveLetter = idx == 0 ? "C:" : $"Disk{idx}";
                    string mediaType = obj["MediaType"]?.ToString() ?? "Unknown";
                    string interfaceType = "SATA";
                    if (mediaType.Contains("SSD", StringComparison.OrdinalIgnoreCase) ||
                        (obj["Model"]?.ToString() ?? "").Contains("NVMe", StringComparison.OrdinalIgnoreCase))
                        interfaceType = "NVMe";
                    else if (mediaType.Contains("Removable", StringComparison.OrdinalIgnoreCase))
                        interfaceType = "USB";

                    disks.Add(new
                    {
                        driveName = driveLetter,
                        model = obj["Model"]?.ToString() ?? "",
                        serialNumber = obj["SerialNumber"]?.ToString()?.Trim() ?? "",
                        mediaType = interfaceType,
                        sizeBytes = obj["Size"] != null ? Convert.ToInt64(obj["Size"]) : 0L,
                        fileSystem = "NTFS",
                        isSystemDrive = idx == 0,
                    });
                    idx++;
                }
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to collect disk drives."); }
            return disks;
        }

        // ─── Network Adapters ────────────────────────────────────────────────
        private List<object> GetNetworkAdapters()
        {
            var adapters = new List<object>();
            if (!OperatingSystem.IsWindows()) return adapters;
            try
            {
                using var s = new ManagementObjectSearcher(
                    "SELECT Description, MACAddress, IPAddress, DefaultIPGateway, DNSServerSearchOrder, Speed FROM Win32_NetworkAdapterConfiguration WHERE IPEnabled=True");
                foreach (ManagementObject obj in s.Get())
                {
                    string[] ips = obj["IPAddress"] as string[] ?? Array.Empty<string>();
                    string[] gateways = obj["DefaultIPGateway"] as string[] ?? Array.Empty<string>();
                    string[] dns = obj["DNSServerSearchOrder"] as string[] ?? Array.Empty<string>();

                    string ipv4 = ips.FirstOrDefault(ip => !ip.Contains(':')) ?? "";
                    string ipv6 = ips.FirstOrDefault(ip => ip.Contains(':')) ?? "";
                    long speed = obj["Speed"] != null ? Convert.ToInt64(obj["Speed"]) : 0;

                    adapters.Add(new
                    {
                        name = obj["Description"]?.ToString() ?? "",
                        description = obj["Description"]?.ToString() ?? "",
                        macAddress = obj["MACAddress"]?.ToString() ?? "",
                        ipv4 = ipv4,
                        ipv6 = ipv6,
                        gateway = gateways.Length > 0 ? gateways[0] : "",
                        dns = dns.Length > 0 ? string.Join(", ", dns) : "",
                        speedMbps = speed > 0 ? (int)(speed / 1_000_000) : 0,
                        isWireless = false,
                        isPhysical = true,
                        isOperational = true,
                    });
                }
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to collect network adapters."); }
            return adapters;
        }

        // ─── Installed Software (from registry — fast) ───────────────────────
        private List<object> GetInstalledSoftware()
        {
            var software = new List<object>();
            if (!OperatingSystem.IsWindows()) return software;
            try
            {
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
                                software.Add(new
                                {
                                    name = displayName.Trim(),
                                    version = (subKey.GetValue("DisplayVersion") as string ?? "").Trim(),
                                    publisher = (subKey.GetValue("Publisher") as string ?? "").Trim(),
                                    installDate = subKey.GetValue("InstallDate") as string ?? "",
                                    installLocation = subKey.GetValue("InstallLocation") as string ?? "",
                                });
                            }
                            catch { }
                        }
                    }
                    catch { }
                }
                // Also user hive
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
                                    installDate = subKey.GetValue("InstallDate") as string ?? "",
                                    installLocation = subKey.GetValue("InstallLocation") as string ?? "",
                                });
                            }
                            catch { }
                        }
                    }
                }
                catch { }
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to enumerate installed software from registry."); }

            // Deduplicate by name, sort alphabetically
            return software
                .GroupBy(s => ((dynamic)s).name as string, StringComparer.OrdinalIgnoreCase)
                .Select(g => g.First())
                .OrderBy(s => ((dynamic)s).name as string)
                .ToList();
        }

        // ─── Windows Services (field names match WindowsServicePayloadDto) ───
        private List<object> GetWindowsServices()
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
                            using var wmi = new ManagementObjectSearcher(
                                $"SELECT StartMode FROM Win32_Service WHERE Name='{svc.ServiceName.Replace("'", "''")}'");
                            var wmiSvc = wmi.Get().Cast<ManagementObject>().FirstOrDefault();
                            startType = wmiSvc?["StartMode"]?.ToString() ?? "Unknown";
                        }
                        catch { }

                        // Field names match WindowsServicePayloadDto
                        services.Add(new
                        {
                            serviceName = svc.ServiceName,   // matches DTO
                            displayName = svc.DisplayName,   // matches DTO
                            status = svc.Status.ToString(),  // matches DTO
                            startType = startType,           // matches DTO
                            account = "LocalSystem",         // matches DTO
                        });
                    }
                    catch { }
                    finally { try { svc.Dispose(); } catch { } }
                }
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to enumerate Windows services."); }
            return services;
        }

        // ─── Startup Apps (field names match StartupApplicationPayloadDto) ───
        private List<object> GetStartupApplications()
        {
            var items = new List<object>();
            if (!OperatingSystem.IsWindows()) return items;
            try
            {
                using var s = new ManagementObjectSearcher(
                    "SELECT Name, Command, Location, User FROM Win32_StartupCommand");
                foreach (ManagementObject obj in s.Get())
                {
                    // Field names match StartupApplicationPayloadDto
                    items.Add(new
                    {
                        name = obj["Name"]?.ToString() ?? "Unknown",
                        command = obj["Command"]?.ToString() ?? "",
                        location = obj["Location"]?.ToString() ?? "",
                        user = obj["User"]?.ToString() ?? "",
                    });
                }
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to enumerate startup programs."); }
            return items;
        }

        // ─── Security Info ────────────────────────────────────────────────────
        private object GetSecurityInfo()
        {
            bool defender = false, firewall = false, secureBoot = false, tpm = false;
            string tpmVersion = "Unknown";
            try
            {
                using var wmiSec = new ManagementObjectSearcher(
                    @"root\SecurityCenter2", "SELECT displayName FROM AntiVirusProduct");
                defender = wmiSec.Get().Count > 0;
            }
            catch { }
            try
            {
                using var fwSearcher = new ManagementObjectSearcher(
                    @"root\StandardCimv2",
                    "SELECT Enabled FROM MSFT_NetFirewallProfile WHERE Profile='Domain' OR Profile='Private' OR Profile='Public'");
                firewall = fwSearcher.Get().Cast<ManagementObject>().Any(o =>
                    o["Enabled"] != null && Convert.ToBoolean(o["Enabled"]));
            }
            catch { }
            try
            {
                using var tpmSearcher = new ManagementObjectSearcher(
                    @"root\CIMv2\Security\MicrosoftTpm", "SELECT IsEnabled_InitialValue, SpecVersion FROM Win32_Tpm");
                var tpmObj = tpmSearcher.Get().Cast<ManagementObject>().FirstOrDefault();
                if (tpmObj != null)
                {
                    tpm = tpmObj["IsEnabled_InitialValue"] != null && Convert.ToBoolean(tpmObj["IsEnabled_InitialValue"]);
                    tpmVersion = tpmObj["SpecVersion"]?.ToString()?.Split(',').FirstOrDefault()?.Trim() ?? "2.0";
                }
            }
            catch { }

            return new
            {
                windowsDefenderEnabled = defender,
                firewallEnabled = firewall,
                bitLockerEnabled = false,
                secureBootEnabled = secureBoot,
                tpmEnabled = tpm,
                tpmVersion = tpmVersion,
            };
        }

        private string GetWmiValue(string wmiClass, string property, string defaultValue)
        {
            if (!OperatingSystem.IsWindows()) return defaultValue;
            try
            {
                using var s = new ManagementObjectSearcher($"SELECT {property} FROM {wmiClass}");
                var result = s.Get().Cast<ManagementObject>().FirstOrDefault();
                if (result != null && result[property] != null)
                    return result[property]?.ToString()?.Trim() ?? defaultValue;
            }
            catch { }
            return defaultValue;
        }
    }
}
