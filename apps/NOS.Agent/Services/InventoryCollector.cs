using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Management;
using System.Net.NetworkInformation;
using System.ServiceProcess;
using System.Text.Json;
using System.Text.RegularExpressions;
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
                var mem = GetMemoryModules();
                var disks = GetDiskDrives();
                var gpus = GetGpuAdapters();
                var net = GetNetworkAdapters();
                var sec = GetSecurityInfo();

                var payload = new FullInventoryPayloadDto
                {
                    DeviceId = DeviceRegistrationService.CurrentDeviceId ?? _configuration.DeviceId,
                    Manufacturer = GetWmiValue("Win32_ComputerSystem", "Manufacturer", "Unknown"),
                    Model = GetWmiValue("Win32_ComputerSystem", "Model", "Unknown"),
                    SerialNumber = GetWmiValue("Win32_BIOS", "SerialNumber", "Unknown"),
                    Motherboard = GetWmiValue("Win32_BaseBoard", "Product", "Unknown"),
                    BiosVendor = GetWmiValue("Win32_BIOS", "Manufacturer", "Unknown"),
                    BiosVersion = GetWmiValue("Win32_BIOS", "SMBIOSBIOSVersion", "Unknown"),
                    BiosReleaseDate = GetWmiValue("Win32_BIOS", "ReleaseDate", ""),
                    CpuModel = GetWmiValue("Win32_Processor", "Name", "Unknown"),
                    CpuVendor = GetWmiValue("Win32_Processor", "Manufacturer", "Unknown"),
                    PhysicalCores = int.TryParse(GetWmiValue("Win32_Processor", "NumberOfCores", "1"), out var pcores) ? pcores : 1,
                    LogicalCores = int.TryParse(GetWmiValue("Win32_Processor", "NumberOfLogicalProcessors", "1"), out var lcores) ? lcores : 1,
                    Hostname = Environment.MachineName,
                    Domain = GetWmiValue("Win32_ComputerSystem", "Domain", "WORKGROUP"),
                    Workgroup = GetWmiValue("Win32_ComputerSystem", "Workgroup", "WORKGROUP"),
                    OsEdition = GetWmiValue("Win32_OperatingSystem", "Caption", "Unknown"),
                    OsBuild = GetWmiValue("Win32_OperatingSystem", "BuildNumber", "Unknown"),
                    Architecture = GetWmiValue("Win32_OperatingSystem", "OSArchitecture", "x64"),
                    AgentVersion = System.Reflection.Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "1.0.0",
                    SchemaVersion = "1.0.0",
                    MemoryModules = mem,
                    DiskDrives = disks,
                    Gpus = gpus,
                    NetworkAdapters = net,
                    InstalledSoftware = sw,
                    WindowsServices = svc,
                    StartupApplications = startup,
                    Security = sec,
                };

                await _outboxQueue.EnqueueAsync("inventory", payload, 2, stoppingToken);
                _logger.LogInformation(
                    "Inventory queued. Software: {sw}, Services: {svc}, Startup: {st}, MemModules: {mm}, Disks: {dk}, GPUs: {gp}",
                    sw.Count, svc.Count, startup.Count, mem.Count, disks.Count, gpus.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to collect and queue inventory snapshot.");
            }
        }

        // ─── RAM Modules ──────────────────────────────────────────────────────
        private List<MemoryModuleInventoryDto> GetMemoryModules()
        {
            var modules = new List<MemoryModuleInventoryDto>();
            if (!OperatingSystem.IsWindows()) return modules;
            try
            {
                using var s = new ManagementObjectSearcher(
                    "SELECT DeviceLocator, Capacity, Speed, Manufacturer, PartNumber, SerialNumber FROM Win32_PhysicalMemory");
                foreach (ManagementObject obj in s.Get())
                {
                    modules.Add(new MemoryModuleInventoryDto
                    {
                        Slot = obj["DeviceLocator"]?.ToString() ?? "",
                        CapacityBytes = obj["Capacity"] != null ? Convert.ToInt64(obj["Capacity"]) : 0L,
                        SpeedMHz = obj["Speed"] != null ? Convert.ToInt32(obj["Speed"]) : 0,
                        Manufacturer = obj["Manufacturer"]?.ToString() ?? "",
                        PartNumber = obj["PartNumber"]?.ToString()?.Trim() ?? "",
                        SerialNumber = obj["SerialNumber"]?.ToString()?.Trim() ?? "",
                    });
                }
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to collect memory modules."); }
            return modules;
        }

        // ─── Disk Drives (Exact NVMe / SATA / USB / SSD / HDD Detection) ──────
        private List<DiskDriveInventoryDto> GetDiskDrives()
        {
            var disks = new List<DiskDriveInventoryDto>();
            if (!OperatingSystem.IsWindows()) return disks;
            try
            {
                // 1. Gather all Logical Disks (Volume name, FileSystem, Size)
                var logicalDisks = new Dictionary<string, (string FileSystem, long Size)>(StringComparer.OrdinalIgnoreCase);
                try
                {
                    using var logSearcher = new ManagementObjectSearcher(
                        "SELECT DeviceID, FileSystem, Size FROM Win32_LogicalDisk WHERE DriveType=3");
                    foreach (ManagementObject ld in logSearcher.Get())
                    {
                        var driveId = ld["DeviceID"]?.ToString() ?? "";
                        var fs = ld["FileSystem"]?.ToString() ?? "NTFS";
                        long sz = ld["Size"] != null ? Convert.ToInt64(ld["Size"]) : 0L;
                        if (!string.IsNullOrEmpty(driveId))
                        {
                            logicalDisks[driveId] = (fs, sz);
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to query Win32_LogicalDisk.");
                }

                // 2. Query Storage Management API (MSFT_PhysicalDisk) for precise BusType & MediaType
                var msftStorageMap = new Dictionary<string, (string BusType, string MediaType)>(StringComparer.OrdinalIgnoreCase);
                try
                {
                    using var msftSearcher = new ManagementObjectSearcher(
                        @"root\Microsoft\Windows\Storage",
                        "SELECT DeviceId, FriendlyName, MediaType, BusType FROM MSFT_PhysicalDisk");
                    foreach (ManagementObject pd in msftSearcher.Get())
                    {
                        string devId = pd["DeviceId"]?.ToString() ?? "";
                        int busType = pd["BusType"] != null ? Convert.ToInt32(pd["BusType"]) : 0;
                        int mediaType = pd["MediaType"] != null ? Convert.ToInt32(pd["MediaType"]) : 0;

                        // BusType: 17=NVMe, 11=SATA, 7=USB, 8=RAID, 3=ATA, 1=SCSI
                        // MediaType: 4=SSD, 3=HDD, 5=SCM
                        string detectedType;
                        if (busType == 17)
                        {
                            detectedType = "NVMe SSD";
                        }
                        else if (busType == 7)
                        {
                            detectedType = "USB";
                        }
                        else if (mediaType == 4)
                        {
                            detectedType = busType == 11 ? "SATA SSD" : "SSD";
                        }
                        else if (mediaType == 3)
                        {
                            detectedType = busType == 11 ? "SATA HDD" : "HDD";
                        }
                        else
                        {
                            detectedType = busType == 11 ? "SATA" : "Fixed";
                        }

                        if (!string.IsNullOrEmpty(devId))
                        {
                            msftStorageMap[devId] = (detectedType, mediaType == 4 ? "SSD" : (mediaType == 3 ? "HDD" : "Fixed"));
                        }
                    }
                }
                catch
                {
                    // Non-elevated or MSFT_PhysicalDisk not available, fall back to Win32_DiskDrive analysis
                }

                // 3. Map physical disk index to logical drive letters via Win32_LogicalDiskToPartition
                var diskDriveLetters = new Dictionary<string, List<string>>();
                try
                {
                    using var partSearcher = new ManagementObjectSearcher(
                        "SELECT Antecedent, Dependent FROM Win32_LogicalDiskToPartition");
                    foreach (ManagementObject rel in partSearcher.Get())
                    {
                        string ante = rel["Antecedent"]?.ToString() ?? "";
                        string dep = rel["Dependent"]?.ToString() ?? "";

                        var matchDisk = Regex.Match(ante, @"Disk #(\d+)");
                        var matchLetter = Regex.Match(dep, @"DeviceID\s*=\s*""([^""]+)""");
                        if (matchDisk.Success && matchLetter.Success)
                        {
                            string dIdx = matchDisk.Groups[1].Value;
                            string letter = matchLetter.Groups[1].Value;
                            if (!diskDriveLetters.ContainsKey(dIdx))
                                diskDriveLetters[dIdx] = new List<string>();
                            if (!diskDriveLetters[dIdx].Contains(letter))
                                diskDriveLetters[dIdx].Add(letter);
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogDebug(ex, "Failed to query Win32_LogicalDiskToPartition.");
                }

                // 4. Query Win32_DiskDrive
                using var s = new ManagementObjectSearcher(
                    "SELECT Index, DeviceID, Model, SerialNumber, InterfaceType, MediaType, PNPDeviceID, Size FROM Win32_DiskDrive");
                
                int diskIndex = 0;
                string systemDriveLetter = Path.GetPathRoot(Environment.SystemDirectory)?.TrimEnd('\\') ?? "C:";

                foreach (ManagementObject obj in s.Get())
                {
                    string driveIndexStr = obj["Index"]?.ToString() ?? diskIndex.ToString();
                    string model = obj["Model"]?.ToString()?.Trim() ?? "";
                    string pnp = obj["PNPDeviceID"]?.ToString() ?? "";
                    string interfaceType = obj["InterfaceType"]?.ToString() ?? "";
                    string rawMediaType = obj["MediaType"]?.ToString() ?? "";
                    string serial = obj["SerialNumber"]?.ToString()?.Trim() ?? "";
                    long sizeBytes = obj["Size"] != null ? Convert.ToInt64(obj["Size"]) : 0L;

                    // Determine disk media type accurately (NVMe SSD, SATA SSD, SATA HDD, USB)
                    string finalMediaType = "SATA";
                    if (msftStorageMap.TryGetValue(driveIndexStr, out var msftInfo))
                    {
                        finalMediaType = msftInfo.BusType;
                    }
                    else if (pnp.Contains("NVME", StringComparison.OrdinalIgnoreCase) ||
                             model.Contains("NVMe", StringComparison.OrdinalIgnoreCase) ||
                             pnp.Contains("DEV_NVME", StringComparison.OrdinalIgnoreCase) ||
                             (interfaceType.Equals("SCSI", StringComparison.OrdinalIgnoreCase) && pnp.Contains("VEN_NVME", StringComparison.OrdinalIgnoreCase)))
                    {
                        finalMediaType = "NVMe SSD";
                    }
                    else if (pnp.Contains("USB", StringComparison.OrdinalIgnoreCase) || rawMediaType.Contains("Removable", StringComparison.OrdinalIgnoreCase))
                    {
                        finalMediaType = "USB";
                    }
                    else if (model.Contains("SSD", StringComparison.OrdinalIgnoreCase) || rawMediaType.Contains("SSD", StringComparison.OrdinalIgnoreCase))
                    {
                        finalMediaType = "SATA SSD";
                    }
                    else
                    {
                        finalMediaType = "SATA HDD";
                    }

                    // Map logical drive letter & real filesystem
                    string assignedDriveLetter;
                    string assignedFs = "NTFS";
                    bool isSystem = false;

                    if (diskDriveLetters.TryGetValue(driveIndexStr, out var letters) && letters.Count > 0)
                    {
                        assignedDriveLetter = string.Join(", ", letters);
                        isSystem = letters.Any(l => l.Equals(systemDriveLetter, StringComparison.OrdinalIgnoreCase));
                        if (logicalDisks.TryGetValue(letters[0], out var fsInfo))
                        {
                            assignedFs = fsInfo.FileSystem;
                        }
                    }
                    else
                    {
                        assignedDriveLetter = diskIndex == 0 ? systemDriveLetter : $"Disk {diskIndex}";
                        isSystem = diskIndex == 0;
                        if (logicalDisks.TryGetValue(assignedDriveLetter, out var logInfo))
                        {
                            assignedFs = logInfo.FileSystem;
                        }
                        else if (logicalDisks.Count > 0)
                        {
                            assignedFs = logicalDisks.First().Value.FileSystem;
                        }
                    }

                    disks.Add(new DiskDriveInventoryDto
                    {
                        DriveName = assignedDriveLetter,
                        Model = model,
                        SerialNumber = serial,
                        MediaType = finalMediaType,
                        SizeBytes = sizeBytes,
                        FileSystem = assignedFs,
                        IsSystemDrive = isSystem,
                    });

                    diskIndex++;
                }

                // If no physical disks were returned by WMI, construct from logical disks
                if (disks.Count == 0)
                {
                    foreach (var kvp in logicalDisks)
                    {
                        disks.Add(new DiskDriveInventoryDto
                        {
                            DriveName = kvp.Key,
                            Model = "Generic Fixed Disk",
                            SerialNumber = "N/A",
                            MediaType = "Fixed",
                            SizeBytes = kvp.Value.Size,
                            FileSystem = kvp.Value.FileSystem,
                            IsSystemDrive = kvp.Key.Equals(systemDriveLetter, StringComparison.OrdinalIgnoreCase),
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to collect disk drives.");
            }
            return disks;
        }

        // ─── GPU Video Controllers ──────────────────────────────────────────
        private List<GpuInventoryDto> GetGpuAdapters()
        {
            var gpus = new List<GpuInventoryDto>();
            if (!OperatingSystem.IsWindows()) return gpus;
            try
            {
                using var s = new ManagementObjectSearcher(
                    "SELECT Name, AdapterCompatibility, DriverVersion, AdapterRAM, VideoModeDescription FROM Win32_VideoController");
                foreach (ManagementObject obj in s.Get())
                {
                    string name = obj["Name"]?.ToString()?.Trim() ?? "";
                    if (string.IsNullOrWhiteSpace(name)) continue;

                    string manufacturer = obj["AdapterCompatibility"]?.ToString()?.Trim() ?? "Unknown";
                    string driver = obj["DriverVersion"]?.ToString()?.Trim() ?? "Unknown";
                    double vram = obj["AdapterRAM"] != null ? Convert.ToDouble(obj["AdapterRAM"]) : 0.0;
                    string res = obj["VideoModeDescription"]?.ToString()?.Trim() ?? "Unknown";

                    gpus.Add(new GpuInventoryDto
                    {
                        Name = name,
                        Manufacturer = manufacturer,
                        DriverVersion = driver,
                        VRamBytes = vram,
                        Resolution = res,
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to collect GPU video controllers.");
            }
            return gpus;
        }

        // ─── Network Adapters ────────────────────────────────────────────────
        private List<NetworkAdapterInventoryDto> GetNetworkAdapters()
        {
            var adapters = new List<NetworkAdapterInventoryDto>();
            if (!OperatingSystem.IsWindows()) return adapters;
            try
            {
                var netInterfaces = System.Net.NetworkInformation.NetworkInterface.GetAllNetworkInterfaces();
                var ifaceMap = new Dictionary<string, System.Net.NetworkInformation.NetworkInterface>(StringComparer.OrdinalIgnoreCase);
                foreach (var ni in netInterfaces)
                {
                    try
                    {
                        ifaceMap[ni.Description] = ni;
                        ifaceMap[ni.Name] = ni;
                        if (!string.IsNullOrWhiteSpace(ni.Id)) ifaceMap[ni.Id] = ni;
                    }
                    catch { }
                }

                try
                {
                    using var s = new ManagementObjectSearcher(
                        "SELECT Description, MACAddress, IPAddress, DefaultIPGateway, DNSServerSearchOrder FROM Win32_NetworkAdapterConfiguration WHERE IPEnabled=True");
                    foreach (ManagementObject obj in s.Get())
                    {
                        string desc = obj["Description"]?.ToString() ?? "";
                        string mac = obj["MACAddress"]?.ToString() ?? "";
                        string[] ips = obj["IPAddress"] as string[] ?? Array.Empty<string>();
                        string[] gateways = obj["DefaultIPGateway"] as string[] ?? Array.Empty<string>();
                        string[] dns = obj["DNSServerSearchOrder"] as string[] ?? Array.Empty<string>();

                        string ipv4 = ips.FirstOrDefault(ip => !ip.Contains(':')) ?? "";
                        string ipv6 = ips.FirstOrDefault(ip => ip.Contains(':')) ?? "";

                        long speed = 0;
                        bool isWireless = desc.IndexOf("wireless", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                          desc.IndexOf("wi-fi", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                          desc.IndexOf("802.11", StringComparison.OrdinalIgnoreCase) >= 0;

                        if (ifaceMap.TryGetValue(desc, out var ni))
                        {
                            try
                            {
                                speed = ni.Speed;
                                if (ni.NetworkInterfaceType == System.Net.NetworkInformation.NetworkInterfaceType.Wireless80211)
                                {
                                    isWireless = true;
                                }
                            }
                            catch { }
                        }

                        bool isVirtual = desc.IndexOf("virtual", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                         desc.IndexOf("vpn", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                         desc.IndexOf("hyper-v", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                         desc.IndexOf("pseudo", StringComparison.OrdinalIgnoreCase) >= 0;

                        adapters.Add(new NetworkAdapterInventoryDto
                        {
                            Name = desc,
                            Description = desc,
                            MacAddress = mac,
                            Ipv4 = ipv4,
                            Ipv6 = ipv6,
                            Gateway = gateways.Length > 0 ? gateways[0] : "",
                            Dns = dns.Length > 0 ? string.Join(", ", dns) : "",
                            SpeedMbps = speed > 0 ? (int)(speed / 1_000_000) : 0,
                            IsWireless = isWireless,
                            IsPhysical = !isVirtual,
                            IsOperational = true,
                        });
                    }
                }
                catch (Exception wmiEx)
                {
                    _logger.LogWarning(wmiEx, "WMI query for Win32_NetworkAdapterConfiguration failed, falling back to System.Net.NetworkInformation.");
                }

                if (adapters.Count == 0)
                {
                    foreach (var ni in netInterfaces)
                    {
                        try
                        {
                            if (ni.OperationalStatus != System.Net.NetworkInformation.OperationalStatus.Up) continue;
                            if (ni.NetworkInterfaceType == System.Net.NetworkInformation.NetworkInterfaceType.Loopback) continue;

                            var ipProps = ni.GetIPProperties();
                            string ipv4 = "";
                            string ipv6 = "";
                            foreach (var u in ipProps.UnicastAddresses)
                            {
                                if (u.Address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork && string.IsNullOrEmpty(ipv4))
                                    ipv4 = u.Address.ToString();
                                else if (u.Address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetworkV6 && string.IsNullOrEmpty(ipv6))
                                    ipv6 = u.Address.ToString();
                            }

                            if (string.IsNullOrEmpty(ipv4) && string.IsNullOrEmpty(ipv6)) continue;

                            string gateway = ipProps.GatewayAddresses.FirstOrDefault()?.Address?.ToString() ?? "";
                            string dns = string.Join(", ", ipProps.DnsAddresses.Select(d => d.ToString()));
                            string mac = string.Join(":", ni.GetPhysicalAddress().GetAddressBytes().Select(b => b.ToString("X2")));

                            bool isWireless = ni.NetworkInterfaceType == System.Net.NetworkInformation.NetworkInterfaceType.Wireless80211 ||
                                              ni.Description.IndexOf("wi-fi", StringComparison.OrdinalIgnoreCase) >= 0;

                            adapters.Add(new NetworkAdapterInventoryDto
                            {
                                Name = ni.Name,
                                Description = ni.Description,
                                MacAddress = mac,
                                Ipv4 = ipv4,
                                Ipv6 = ipv6,
                                Gateway = gateway,
                                Dns = dns,
                                SpeedMbps = ni.Speed > 0 ? (int)(ni.Speed / 1_000_000) : 0,
                                IsWireless = isWireless,
                                IsPhysical = true,
                                IsOperational = true,
                            });
                        }
                        catch { }
                    }
                }
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to collect network adapters."); }
            return adapters;
        }

        // ─── Installed Software (from registry — fast) ───────────────────────
        private List<InstalledSoftwareInventoryDto> GetInstalledSoftware()
        {
            var software = new List<InstalledSoftwareInventoryDto>();
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
                                software.Add(new InstalledSoftwareInventoryDto
                                {
                                    Name = displayName.Trim(),
                                    Version = (subKey.GetValue("DisplayVersion") as string ?? "").Trim(),
                                    Publisher = (subKey.GetValue("Publisher") as string ?? "").Trim(),
                                    InstallDate = subKey.GetValue("InstallDate") as string ?? "",
                                    InstallLocation = subKey.GetValue("InstallLocation") as string ?? "",
                                });
                            }
                            catch { }
                        }
                    }
                    catch { }
                }

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
                                software.Add(new InstalledSoftwareInventoryDto
                                {
                                    Name = displayName.Trim(),
                                    Version = (subKey.GetValue("DisplayVersion") as string ?? "").Trim(),
                                    Publisher = (subKey.GetValue("Publisher") as string ?? "").Trim(),
                                    InstallDate = subKey.GetValue("InstallDate") as string ?? "",
                                    InstallLocation = subKey.GetValue("InstallLocation") as string ?? "",
                                });
                            }
                            catch { }
                        }
                    }
                }
                catch { }
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to enumerate installed software from registry."); }

            return software
                .GroupBy(s => s.Name, StringComparer.OrdinalIgnoreCase)
                .Select(g => g.First())
                .OrderBy(s => s.Name)
                .ToList();
        }

        // ─── Windows Services (High-Performance Single Batch WMI Query) ─────
        private List<WindowsServiceInventoryDto> GetWindowsServices()
        {
            var services = new List<WindowsServiceInventoryDto>();
            if (!OperatingSystem.IsWindows()) return services;
            try
            {
                using var searcher = new ManagementObjectSearcher(
                    "SELECT Name, DisplayName, State, StartMode, StartName FROM Win32_Service");
                foreach (ManagementObject obj in searcher.Get())
                {
                    string name = obj["Name"]?.ToString() ?? "";
                    if (string.IsNullOrWhiteSpace(name)) continue;

                    string displayName = obj["DisplayName"]?.ToString() ?? name;
                    string status = obj["State"]?.ToString() ?? "Stopped";
                    string startType = obj["StartMode"]?.ToString() ?? "Unknown";
                    string account = obj["StartName"]?.ToString() ?? "LocalSystem";

                    services.Add(new WindowsServiceInventoryDto
                    {
                        ServiceName = name,
                        DisplayName = displayName,
                        Status = status,
                        StartType = startType,
                        Account = account,
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to enumerate Windows services via WMI batch query. Falling back to ServiceController.");
                try
                {
                    foreach (var svc in ServiceController.GetServices())
                    {
                        services.Add(new WindowsServiceInventoryDto
                        {
                            ServiceName = svc.ServiceName,
                            DisplayName = svc.DisplayName,
                            Status = svc.Status.ToString(),
                            StartType = "Unknown",
                            Account = "LocalSystem",
                        });
                        try { svc.Dispose(); } catch { }
                    }
                }
                catch { }
            }
            return services;
        }

        // ─── Startup Apps ────────────────────────────────────────────────────
        private List<StartupApplicationInventoryDto> GetStartupApplications()
        {
            var items = new List<StartupApplicationInventoryDto>();
            if (!OperatingSystem.IsWindows()) return items;
            try
            {
                using var s = new ManagementObjectSearcher(
                    "SELECT Name, Command, Location, User FROM Win32_StartupCommand");
                foreach (ManagementObject obj in s.Get())
                {
                    items.Add(new StartupApplicationInventoryDto
                    {
                        Name = obj["Name"]?.ToString() ?? "Unknown",
                        Command = obj["Command"]?.ToString() ?? "",
                        Location = obj["Location"]?.ToString() ?? "",
                        User = obj["User"]?.ToString() ?? "",
                    });
                }
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to enumerate startup programs."); }
            return items;
        }

        // ─── Security Info (Defender, Firewall, SecureBoot, TPM, BitLocker) ──
        private SecurityInventoryDto GetSecurityInfo()
        {
            bool defender = false, firewall = false, secureBoot = false, tpm = false, bitLocker = false;
            string tpmVersion = "Unknown";

            // 1. Antivirus / Defender
            try
            {
                using var wmiSec = new ManagementObjectSearcher(
                    @"root\SecurityCenter2", "SELECT displayName FROM AntiVirusProduct");
                defender = wmiSec.Get().Count > 0;
            }
            catch { }

            // 2. Firewall
            try
            {
                using var fwSearcher = new ManagementObjectSearcher(
                    @"root\StandardCimv2",
                    "SELECT Enabled FROM MSFT_NetFirewallProfile WHERE Profile='Domain' OR Profile='Private' OR Profile='Public'");
                firewall = fwSearcher.Get().Cast<ManagementObject>().Any(o =>
                    o["Enabled"] != null && Convert.ToBoolean(o["Enabled"]));
            }
            catch { }

            // 3. UEFI SecureBoot from Registry
            try
            {
                using var key = Microsoft.Win32.Registry.LocalMachine.OpenSubKey(@"SYSTEM\CurrentControlSet\Control\SecureBoot\State");
                if (key != null)
                {
                    var val = key.GetValue("UEFISecureBootEnabled");
                    if (val != null && Convert.ToInt32(val) == 1)
                    {
                        secureBoot = true;
                    }
                }
            }
            catch { }

            // 4. TPM Device
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

            // 5. BitLocker Drive Encryption
            try
            {
                using var encSearcher = new ManagementObjectSearcher(
                    @"root\CIMv2\Security\MicrosoftVolumeEncryption", "SELECT ProtectionStatus FROM Win32_EncryptableVolume");
                bitLocker = encSearcher.Get().Cast<ManagementObject>().Any(v =>
                    v["ProtectionStatus"] != null && Convert.ToInt32(v["ProtectionStatus"]) == 1);
            }
            catch { }

            return new SecurityInventoryDto
            {
                WindowsDefenderEnabled = defender,
                FirewallEnabled = firewall,
                BitLockerEnabled = bitLocker,
                SecureBootEnabled = secureBoot,
                TpmEnabled = tpm,
                TpmVersion = tpmVersion,
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

    public class MemoryModuleInventoryDto
    {
        [System.Text.Json.Serialization.JsonPropertyName("slot")]
        public string Slot { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("capacityBytes")]
        public long CapacityBytes { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("speedMHz")]
        public int SpeedMHz { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("manufacturer")]
        public string Manufacturer { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("partNumber")]
        public string PartNumber { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("serialNumber")]
        public string SerialNumber { get; set; } = string.Empty;
    }

    public class DiskDriveInventoryDto
    {
        [System.Text.Json.Serialization.JsonPropertyName("driveName")]
        public string DriveName { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("model")]
        public string Model { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("serialNumber")]
        public string SerialNumber { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("mediaType")]
        public string MediaType { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("sizeBytes")]
        public long SizeBytes { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("fileSystem")]
        public string FileSystem { get; set; } = "NTFS";

        [System.Text.Json.Serialization.JsonPropertyName("isSystemDrive")]
        public bool IsSystemDrive { get; set; }
    }

    public class GpuInventoryDto
    {
        [System.Text.Json.Serialization.JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("manufacturer")]
        public string Manufacturer { get; set; } = "Unknown";

        [System.Text.Json.Serialization.JsonPropertyName("driverVersion")]
        public string DriverVersion { get; set; } = "Unknown";

        [System.Text.Json.Serialization.JsonPropertyName("vRamBytes")]
        public double VRamBytes { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("resolution")]
        public string Resolution { get; set; } = "Unknown";
    }

    public class InstalledSoftwareInventoryDto
    {
        [System.Text.Json.Serialization.JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("publisher")]
        public string Publisher { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("version")]
        public string Version { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("installDate")]
        public string InstallDate { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("installLocation")]
        public string InstallLocation { get; set; } = string.Empty;
    }

    public class WindowsServiceInventoryDto
    {
        [System.Text.Json.Serialization.JsonPropertyName("serviceName")]
        public string ServiceName { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("displayName")]
        public string DisplayName { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("status")]
        public string Status { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("startType")]
        public string StartType { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("account")]
        public string Account { get; set; } = "LocalSystem";
    }

    public class StartupApplicationInventoryDto
    {
        [System.Text.Json.Serialization.JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("command")]
        public string Command { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("location")]
        public string Location { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("user")]
        public string User { get; set; } = string.Empty;
    }

    public class SecurityInventoryDto
    {
        [System.Text.Json.Serialization.JsonPropertyName("windowsDefenderEnabled")]
        public bool WindowsDefenderEnabled { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("firewallEnabled")]
        public bool FirewallEnabled { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("bitLockerEnabled")]
        public bool BitLockerEnabled { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("secureBootEnabled")]
        public bool SecureBootEnabled { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("tpmEnabled")]
        public bool TpmEnabled { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("tpmVersion")]
        public string TpmVersion { get; set; } = "2.0";
    }

    public class FullInventoryPayloadDto
    {
        [System.Text.Json.Serialization.JsonPropertyName("deviceId")]
        public string DeviceId { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("manufacturer")]
        public string Manufacturer { get; set; } = "Unknown";

        [System.Text.Json.Serialization.JsonPropertyName("model")]
        public string Model { get; set; } = "Unknown";

        [System.Text.Json.Serialization.JsonPropertyName("serialNumber")]
        public string SerialNumber { get; set; } = "Unknown";

        [System.Text.Json.Serialization.JsonPropertyName("motherboard")]
        public string Motherboard { get; set; } = "Unknown";

        [System.Text.Json.Serialization.JsonPropertyName("biosVendor")]
        public string BiosVendor { get; set; } = "Unknown";

        [System.Text.Json.Serialization.JsonPropertyName("biosVersion")]
        public string BiosVersion { get; set; } = "Unknown";

        [System.Text.Json.Serialization.JsonPropertyName("biosReleaseDate")]
        public string BiosReleaseDate { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("cpuModel")]
        public string CpuModel { get; set; } = "Unknown";

        [System.Text.Json.Serialization.JsonPropertyName("cpuVendor")]
        public string CpuVendor { get; set; } = "Unknown";

        [System.Text.Json.Serialization.JsonPropertyName("physicalCores")]
        public int PhysicalCores { get; set; } = 1;

        [System.Text.Json.Serialization.JsonPropertyName("logicalCores")]
        public int LogicalCores { get; set; } = 1;

        [System.Text.Json.Serialization.JsonPropertyName("hostname")]
        public string Hostname { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("domain")]
        public string Domain { get; set; } = "WORKGROUP";

        [System.Text.Json.Serialization.JsonPropertyName("workgroup")]
        public string Workgroup { get; set; } = "WORKGROUP";

        [System.Text.Json.Serialization.JsonPropertyName("osEdition")]
        public string OsEdition { get; set; } = "Unknown";

        [System.Text.Json.Serialization.JsonPropertyName("osBuild")]
        public string OsBuild { get; set; } = "Unknown";

        [System.Text.Json.Serialization.JsonPropertyName("architecture")]
        public string Architecture { get; set; } = "x64";

        [System.Text.Json.Serialization.JsonPropertyName("agentVersion")]
        public string AgentVersion { get; set; } = "1.0.0";

        [System.Text.Json.Serialization.JsonPropertyName("schemaVersion")]
        public string SchemaVersion { get; set; } = "1.0.0";

        [System.Text.Json.Serialization.JsonPropertyName("memoryModules")]
        public List<MemoryModuleInventoryDto> MemoryModules { get; set; } = new();

        [System.Text.Json.Serialization.JsonPropertyName("diskDrives")]
        public List<DiskDriveInventoryDto> DiskDrives { get; set; } = new();

        [System.Text.Json.Serialization.JsonPropertyName("gpus")]
        public List<GpuInventoryDto> Gpus { get; set; } = new();

        [System.Text.Json.Serialization.JsonPropertyName("networkAdapters")]
        public List<NetworkAdapterInventoryDto> NetworkAdapters { get; set; } = new();

        [System.Text.Json.Serialization.JsonPropertyName("installedSoftware")]
        public List<InstalledSoftwareInventoryDto> InstalledSoftware { get; set; } = new();

        [System.Text.Json.Serialization.JsonPropertyName("windowsServices")]
        public List<WindowsServiceInventoryDto> WindowsServices { get; set; } = new();

        [System.Text.Json.Serialization.JsonPropertyName("startupApplications")]
        public List<StartupApplicationInventoryDto> StartupApplications { get; set; } = new();

        [System.Text.Json.Serialization.JsonPropertyName("security")]
        public SecurityInventoryDto Security { get; set; } = new();
    }

    public class NetworkAdapterInventoryDto
    {
        [System.Text.Json.Serialization.JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("description")]
        public string Description { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("macAddress")]
        public string MacAddress { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("ipv4")]
        public string Ipv4 { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("ipv6")]
        public string Ipv6 { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("gateway")]
        public string Gateway { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("dns")]
        public string Dns { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("speedMbps")]
        public int SpeedMbps { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("isWireless")]
        public bool IsWireless { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("isPhysical")]
        public bool IsPhysical { get; set; } = true;

        [System.Text.Json.Serialization.JsonPropertyName("isOperational")]
        public bool IsOperational { get; set; } = true;
    }
}
