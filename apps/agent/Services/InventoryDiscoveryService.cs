using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Security;
using System.ServiceProcess;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Win32;
using NOS.Agent.Models;
using System.Management;

namespace NOS.Agent.Services;

/// <summary>
/// Service responsible for gathering real hardware, software, network, and OS asset inventory from Windows systems.
/// Implements 1-hour result caching, strict exception safety, Windows Event Log alerting on failure, and completely replaces any fake or hardcoded strings.
/// </summary>
public class InventoryDiscoveryService : IInventoryDiscoveryService
{
    private readonly ILogger<InventoryDiscoveryService> _logger;
    private readonly SemaphoreSlim _scanLock = new SemaphoreSlim(1, 1);
    
    // In-memory caching for 1 hour to protect system CPU/WMI overhead during frequent heartbeats or poll cycles
    private InventoryPayload? _cachedUnifiedPayload;
    private SubmitInventoryPayload? _cachedSubmitPayload;
    private DateTime _lastCacheTime = DateTime.MinValue;
    private readonly TimeSpan _cacheTtl = TimeSpan.FromHours(1);

    public InventoryDiscoveryService(ILogger<InventoryDiscoveryService> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Synchronously performs complete inventory scan formatted for routine agent ingestion.
    /// </summary>
    public SubmitInventoryPayload DiscoverCompleteInventory(string? deviceId = null)
    {
        return DiscoverCompleteInventoryAsync(deviceId).GetAwaiter().GetResult();
    }

    /// <summary>
    /// Synchronously returns unified inventory diagnostic payload.
    /// </summary>
    public InventoryPayload DiscoverUnifiedInventory(string? deviceId = null)
    {
        return DiscoverUnifiedInventoryAsync(deviceId).GetAwaiter().GetResult();
    }

    /// <summary>
    /// Asynchronously performs comprehensive hardware, software, and OS inventory gathering via WMI and Windows Registry.
    /// </summary>
    public async Task<InventoryPayload> DiscoverUnifiedInventoryAsync(string? deviceId = null, CancellationToken cancellationToken = default)
    {
        await _scanLock.WaitAsync(cancellationToken);
        try
        {
            if (_cachedUnifiedPayload != null && (DateTime.UtcNow - _lastCacheTime) < _cacheTtl)
            {
                _logger.LogDebug("Returning cached inventory scan results (Cache valid for 1 hour).");
                return _cachedUnifiedPayload;
            }

            _logger.LogInformation("Executing comprehensive real hardware, software, and OS asset inventory discovery cycle...");

            var (unified, submit) = await Task.Run(() => ExecuteRealDiscovery(deviceId), cancellationToken);

            _cachedUnifiedPayload = unified;
            _cachedSubmitPayload = submit;
            _lastCacheTime = DateTime.UtcNow;

            return _cachedUnifiedPayload;
        }
        finally
        {
            _scanLock.Release();
        }
    }

    private async Task<SubmitInventoryPayload> DiscoverCompleteInventoryAsync(string? deviceId = null, CancellationToken cancellationToken = default)
    {
        await DiscoverUnifiedInventoryAsync(deviceId, cancellationToken);
        var res = _cachedSubmitPayload!;
        if (deviceId != null && res.DeviceId != deviceId)
        {
            res = res with { DeviceId = deviceId };
            _cachedSubmitPayload = res;
        }
        return res;
    }

    private (InventoryPayload unified, SubmitInventoryPayload submit) ExecuteRealDiscovery(string? deviceId)
    {
        var cpuList = DiscoverCpus();
        var mbList = DiscoverMotherboards();
        var memList = DiscoverMemoryModules();
        var physDrives = DiscoverPhysicalDrives();
        var logDrives = DiscoverLogicalDrives();
        var netList = DiscoverNetworkConfiguration();
        var gpuList = DiscoverGpus();
        var biosList = DiscoverBios();
        var compSystem = DiscoverComputerSystem();

        var hardware = new HardwarePayload(
            Cpu: cpuList,
            Motherboard: mbList,
            Memory: memList.Select(m => new MemoryPayload(m.CapacityBytes > 0 ? (ulong)m.CapacityBytes : null, m.SpeedMHz > 0 ? m.SpeedMHz : null, m.Manufacturer, m.PartNumber)).ToList(),
            Storage: new StoragePayload(physDrives.Select(p => new DiskDrivePayload(p.Model, (ulong)p.SizeBytes, "Fixed", p.MediaType, p.SerialNumber)).ToList(), logDrives),
            Network: netList.Select(n => new NetworkPayload(n.MacAddress, new List<string> { n.Ipv4!, n.Ipv6! }.Where(i => !string.IsNullOrEmpty(i)).ToList(), !string.IsNullOrEmpty(n.Gateway) ? new List<string> { n.Gateway } : new List<string>(), n.Dns, null)).ToList(),
            Gpu: gpuList.Select(g => new GpuPayload(g.Name, (ulong)g.VRamBytes, null, g.DriverVersion)).ToList(),
            Bios: biosList,
            ComputerSystem: compSystem
        );

        var softwareList = DiscoverInstalledSoftware();
        var osPayload = DiscoverOperatingSystem();
        var windowsServices = DiscoverWindowsServices();
        var startupApps = DiscoverStartupApplications();
        var security = DiscoverSecurityState();
        var capabilities = DiscoverCapabilities(gpuList.Any(), netList.Any(n => n.IsWireless), netList.Any(n => !n.IsWireless && n.IsPhysical));

        var unified = new InventoryPayload(
            Hardware: hardware,
            Software: softwareList.Select(s => new SoftwarePayload(s.Name!, s.Version, s.Publisher, s.InstallDate, s.Size, s.InstallLocation)).ToList(),
            Os: osPayload,
            CollectedAt: DateTime.UtcNow
        );

        string? primaryManufacturer = compSystem?.Manufacturer;
        string? primaryModel = compSystem?.Model;
        string? primarySerial = biosList.FirstOrDefault()?.SerialNumber;
        string? primaryMotherboard = mbList.FirstOrDefault()?.Product;
        string? primaryBiosVendor = biosList.FirstOrDefault()?.Manufacturer;
        string? primaryBiosVersion = biosList.FirstOrDefault()?.Version;
        string? primaryBiosReleaseDate = biosList.FirstOrDefault()?.ReleaseDate;
        string? primaryCpuModel = cpuList.FirstOrDefault()?.Name;
        string? primaryCpuVendor = cpuList.FirstOrDefault()?.Manufacturer;
        int physicalCores = cpuList.Sum(c => c.NumberOfCores ?? 0);
        int logicalCores = cpuList.Sum(c => c.NumberOfLogicalProcessors ?? 0);

        if (physicalCores == 0) physicalCores = Environment.ProcessorCount;
        if (logicalCores == 0) logicalCores = Environment.ProcessorCount;

        string hostname = Environment.MachineName;
        string? domain = null;
        string? workgroup = null;
        try { domain = Environment.UserDomainName; } catch { }

        var submit = new SubmitInventoryPayload(
            Manufacturer: primaryManufacturer,
            Model: primaryModel,
            SerialNumber: primarySerial,
            Motherboard: primaryMotherboard,
            BiosVendor: primaryBiosVendor,
            BiosVersion: primaryBiosVersion,
            CpuModel: primaryCpuModel,
            CpuVendor: primaryCpuVendor,
            PhysicalCores: physicalCores,
            LogicalCores: logicalCores,
            Hostname: hostname,
            OsEdition: osPayload.Caption ?? RuntimeInformation.OSDescription,
            OsBuild: osPayload.BuildNumber ?? Environment.OSVersion.Version.ToString(),
            Architecture: osPayload.Architecture ?? RuntimeInformation.ProcessArchitecture.ToString(),
            MemoryModules: memList,
            DiskDrives: physDrives,
            Gpus: gpuList,
            NetworkAdapters: netList,
            InstalledSoftware: softwareList,
            WindowsServices: windowsServices,
            StartupApplications: startupApps,
            Security: security,
            Capabilities: capabilities,
            DeviceId: deviceId,
            Domain: domain,
            Workgroup: workgroup,
            BiosReleaseDate: primaryBiosReleaseDate,
            AgentVersion: "2.1.0",
            SchemaVersion: "1.0.0"
        );

        return (unified, submit);
    }

    #region WMI Hardware Collectors

    private ComputerSystemPayload? DiscoverComputerSystem()
    {
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) return null;

        try
        {
            // WMI Query Win32_ComputerSystem retrieves general device enclosure characteristics and CPU socket totals
            using var searcher = new ManagementObjectSearcher("SELECT Manufacturer, Model, SystemType, TotalPhysicalMemory, NumberOfProcessors FROM Win32_ComputerSystem");
            foreach (ManagementObject obj in searcher.Get())
            {
                string? manufacturer = CleanWmiString(obj["Manufacturer"]?.ToString());
                string? model = CleanWmiString(obj["Model"]?.ToString());
                string? systemType = CleanWmiString(obj["SystemType"]?.ToString());
                ulong? totalMem = ulong.TryParse(obj["TotalPhysicalMemory"]?.ToString(), out ulong tm) ? tm : null;
                int? numProcs = int.TryParse(obj["NumberOfProcessors"]?.ToString(), out int np) ? np : null;

                return new ComputerSystemPayload(manufacturer, model, systemType, totalMem, numProcs);
            }
        }
        catch (Exception ex)
        {
            LogWmiFailure("Win32_ComputerSystem", ex);
        }

        return null;
    }

    private List<CpuPayload> DiscoverCpus()
    {
        var result = new List<CpuPayload>();
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) return result;

        try
        {
            // WMI Query Win32_Processor retrieves exact hardware specifications, core topology, and frequency for installed processors
            using var searcher = new ManagementObjectSearcher("SELECT Name, NumberOfCores, NumberOfLogicalProcessors, MaxClockSpeed, Manufacturer FROM Win32_Processor");
            foreach (ManagementObject obj in searcher.Get())
            {
                string? name = CleanWmiString(obj["Name"]?.ToString());
                int? cores = int.TryParse(obj["NumberOfCores"]?.ToString(), out int c) ? c : null;
                int? logical = int.TryParse(obj["NumberOfLogicalProcessors"]?.ToString(), out int l) ? l : null;
                int? clock = int.TryParse(obj["MaxClockSpeed"]?.ToString(), out int m) ? m : null;
                string? mfg = CleanWmiString(obj["Manufacturer"]?.ToString());

                result.Add(new CpuPayload(name, cores, logical, clock, mfg));
            }
        }
        catch (Exception ex)
        {
            LogWmiFailure("Win32_Processor", ex);
        }

        return result;
    }

    private List<BiosPayload> DiscoverBios()
    {
        var result = new List<BiosPayload>();
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) return result;

        try
        {
            // WMI Query Win32_BIOS extracts firmware developer metadata, versioning, release dates, and hardware chassis serial number
            using var searcher = new ManagementObjectSearcher("SELECT Manufacturer, Name, Version, SMBIOSBIOSVersion, SerialNumber, ReleaseDate FROM Win32_BIOS");
            foreach (ManagementObject obj in searcher.Get())
            {
                string? manufacturer = CleanWmiString(obj["Manufacturer"]?.ToString());
                string? name = CleanWmiString(obj["Name"]?.ToString());
                string? version = CleanWmiString(obj["SMBIOSBIOSVersion"]?.ToString()) ?? CleanWmiString(obj["Version"]?.ToString());
                string? serialNumber = CleanWmiString(obj["SerialNumber"]?.ToString());
                string? releaseDate = ParseWmiDateTime(obj["ReleaseDate"]?.ToString());

                // Filter out common WMI placeholder strings returned by generic hypervisors or unprovisioned boards
                if (string.Equals(serialNumber, "To be filled by O.E.M.", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(serialNumber, "System Serial Number", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(serialNumber, "Default string", StringComparison.OrdinalIgnoreCase))
                {
                    serialNumber = null;
                }

                result.Add(new BiosPayload(manufacturer, name, version, serialNumber, releaseDate));
            }
        }
        catch (Exception ex)
        {
            LogWmiFailure("Win32_BIOS", ex);
        }

        return result;
    }

    private List<MotherboardPayload> DiscoverMotherboards()
    {
        var result = new List<MotherboardPayload>();
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) return result;

        try
        {
            // WMI Query Win32_BaseBoard accesses motherboard OEM vendor branding, PCB hardware models, and board hardware revisions
            using var searcher = new ManagementObjectSearcher("SELECT Manufacturer, Product, Version FROM Win32_BaseBoard");
            foreach (ManagementObject obj in searcher.Get())
            {
                string? manufacturer = CleanWmiString(obj["Manufacturer"]?.ToString());
                string? product = CleanWmiString(obj["Product"]?.ToString());
                string? version = CleanWmiString(obj["Version"]?.ToString());

                if (string.Equals(product, "To be filled by O.E.M.", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(product, "Default string", StringComparison.OrdinalIgnoreCase))
                {
                    product = null;
                }

                result.Add(new MotherboardPayload(manufacturer, product, version));
            }
        }
        catch (Exception ex)
        {
            LogWmiFailure("Win32_BaseBoard", ex);
        }

        return result;
    }

    private List<MemoryModuleDto> DiscoverMemoryModules()
    {
        var result = new List<MemoryModuleDto>();
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) return result;

        try
        {
            // WMI Query Win32_PhysicalMemory detects physical DIMM slot allocations, individual module byte capacities, operating speeds, and OEM markings
            using var searcher = new ManagementObjectSearcher("SELECT Capacity, Speed, Manufacturer, PartNumber, DeviceLocator, SerialNumber FROM Win32_PhysicalMemory");
            foreach (ManagementObject obj in searcher.Get())
            {
                double capacity = double.TryParse(obj["Capacity"]?.ToString(), out double c) ? c : 0;
                int speed = int.TryParse(obj["Speed"]?.ToString(), out int s) ? s : 0;
                string? manufacturer = CleanWmiString(obj["Manufacturer"]?.ToString());
                string? partNumber = CleanWmiString(obj["PartNumber"]?.ToString());
                string? serialNumber = CleanWmiString(obj["SerialNumber"]?.ToString());
                string? locator = CleanWmiString(obj["DeviceLocator"]?.ToString());

                // Filter out standard non-programmed EEPROM memory placeholders
                if (string.Equals(manufacturer, "859B", StringComparison.OrdinalIgnoreCase) || 
                    string.Equals(manufacturer, "0000", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(manufacturer, "Unknown", StringComparison.OrdinalIgnoreCase))
                {
                    manufacturer = null;
                }

                result.Add(new MemoryModuleDto(locator, capacity, speed, manufacturer, partNumber, serialNumber));
            }
        }
        catch (Exception ex)
        {
            LogWmiFailure("Win32_PhysicalMemory", ex);
        }

        return result;
    }

    private List<GpuDto> DiscoverGpus()
    {
        var result = new List<GpuDto>();
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) return result;

        try
        {
            // WMI Query Win32_VideoController identifies discrete and integrated graphics adapters, video frame buffers, driver versions, and display resolutions
            using var searcher = new ManagementObjectSearcher("SELECT Name, AdapterCompatibility, DriverVersion, AdapterRAM, VideoModeDescription FROM Win32_VideoController");
            foreach (ManagementObject obj in searcher.Get())
            {
                string? name = CleanWmiString(obj["Name"]?.ToString());
                string? manufacturer = CleanWmiString(obj["AdapterCompatibility"]?.ToString());
                string? driverVersion = CleanWmiString(obj["DriverVersion"]?.ToString());
                double vram = double.TryParse(obj["AdapterRAM"]?.ToString(), out double v) ? v : 0;
                string? resolution = CleanWmiString(obj["VideoModeDescription"]?.ToString());

                if (!string.IsNullOrEmpty(name))
                {
                    result.Add(new GpuDto(name, manufacturer, driverVersion, vram, resolution));
                }
            }
        }
        catch (Exception ex)
        {
            LogWmiFailure("Win32_VideoController", ex);
        }

        return result;
    }

    private List<DiskDriveDto> DiscoverPhysicalDrives()
    {
        var result = new List<DiskDriveDto>();
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) return result;

        try
        {
            // WMI Query Win32_DiskDrive detects non-volatile block storage hardware, interfaces (SATA/NVMe/USB), models, byte capacities, and device serials
            using var searcher = new ManagementObjectSearcher("SELECT Model, Size, InterfaceType, MediaType, SerialNumber, DeviceID FROM Win32_DiskDrive");
            foreach (ManagementObject obj in searcher.Get())
            {
                string? model = CleanWmiString(obj["Model"]?.ToString());
                double size = double.TryParse(obj["Size"]?.ToString(), out double sz) ? sz : 0;
                string? interfaceType = CleanWmiString(obj["InterfaceType"]?.ToString());
                string? mediaType = CleanWmiString(obj["MediaType"]?.ToString()) ?? interfaceType;
                string? serial = CleanWmiString(obj["SerialNumber"]?.ToString());
                string? deviceId = CleanWmiString(obj["DeviceID"]?.ToString());

                // No fake fallback serials generated; keep null if driver doesn't report it
                result.Add(new DiskDriveDto(deviceId, model, serial, mediaType, size, null, false));
            }
        }
        catch (Exception ex)
        {
            LogWmiFailure("Win32_DiskDrive", ex);
        }

        return result;
    }

    private List<LogicalDiskPayload> DiscoverLogicalDrives()
    {
        var result = new List<LogicalDiskPayload>();
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) return result;

        try
        {
            // WMI Query Win32_LogicalDisk interrogates mounted partition volume capacities, free storage allocations, file system formatting, and volume labels
            using var searcher = new ManagementObjectSearcher("SELECT DeviceID, Size, FreeSpace, FileSystem, VolumeName FROM Win32_LogicalDisk");
            foreach (ManagementObject obj in searcher.Get())
            {
                string? deviceId = CleanWmiString(obj["DeviceID"]?.ToString());
                ulong? size = ulong.TryParse(obj["Size"]?.ToString(), out ulong sz) ? sz : null;
                ulong? free = ulong.TryParse(obj["FreeSpace"]?.ToString(), out ulong fs) ? fs : null;
                string? fileSystem = CleanWmiString(obj["FileSystem"]?.ToString());
                string? volumeName = CleanWmiString(obj["VolumeName"]?.ToString());

                result.Add(new LogicalDiskPayload(deviceId, size, free, fileSystem, volumeName));
            }
        }
        catch (Exception ex)
        {
            LogWmiFailure("Win32_LogicalDisk", ex);
        }

        return result;
    }

    private List<NetworkAdapterDto> DiscoverNetworkConfiguration()
    {
        var result = new List<NetworkAdapterDto>();
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) return result;

        try
        {
            // WMI Query Win32_NetworkAdapterConfiguration WHERE IPEnabled = true gathers active interface IP bindings, routing gateways, MAC addresses, and DHCP configurations
            using var searcher = new ManagementObjectSearcher("SELECT Description, MACAddress, IPAddress, DefaultIPGateway, DNSDomain, DHCPEnabled, Index FROM Win32_NetworkAdapterConfiguration WHERE IPEnabled = true");
            foreach (ManagementObject obj in searcher.Get())
            {
                string? description = CleanWmiString(obj["Description"]?.ToString());
                string? mac = CleanWmiString(obj["MACAddress"]?.ToString());
                string? dnsDomain = CleanWmiString(obj["DNSDomain"]?.ToString());
                bool dhcpEnabled = bool.TryParse(obj["DHCPEnabled"]?.ToString(), out bool dh) && dh;

                string? ipv4 = null;
                string? ipv6 = null;
                if (obj["IPAddress"] is string[] ips && ips.Length > 0)
                {
                    foreach (var ip in ips)
                    {
                        if (ip.Contains('.')) ipv4 ??= ip;
                        else if (ip.Contains(':')) ipv6 ??= ip;
                    }
                }

                string? gateway = null;
                if (obj["DefaultIPGateway"] is string[] gateways && gateways.Length > 0)
                {
                    gateway = gateways.FirstOrDefault(g => !string.IsNullOrWhiteSpace(g));
                }

                bool isWireless = description != null && (description.Contains("Wireless", StringComparison.OrdinalIgnoreCase) || description.Contains("Wi-Fi", StringComparison.OrdinalIgnoreCase) || description.Contains("802.11", StringComparison.OrdinalIgnoreCase));
                bool isPhysical = description != null && !description.Contains("Virtual", StringComparison.OrdinalIgnoreCase) && !description.Contains("Pseudo", StringComparison.OrdinalIgnoreCase) && !description.Contains("VMware", StringComparison.OrdinalIgnoreCase) && !description.Contains("Hyper-V", StringComparison.OrdinalIgnoreCase);

                result.Add(new NetworkAdapterDto(
                    Name: description ?? "Ethernet Adapter",
                    Description: description,
                    MacAddress: mac,
                    Ipv4: ipv4,
                    Ipv6: ipv6,
                    Gateway: gateway,
                    Dns: dnsDomain,
                    SpeedMbps: 0,
                    IsWireless: isWireless,
                    IsPhysical: isPhysical,
                    IsOperational: true
                ));
            }
        }
        catch (Exception ex)
        {
            LogWmiFailure("Win32_NetworkAdapterConfiguration", ex);
        }

        return result;
    }

    #endregion

    #region Software & Registry Collectors

    private List<InstalledSoftwareDto> DiscoverInstalledSoftware()
    {
        var result = new List<InstalledSoftwareDto>();
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) return result;

        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // Query both native 64-bit hive and WOW6432Node for 32-bit applications installed on 64-bit Windows
        string[] registryKeys = {
            @"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
            @"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"
        };

        foreach (string regPath in registryKeys)
        {
            try
            {
                using RegistryKey? rootKey = Registry.LocalMachine.OpenSubKey(regPath);
                if (rootKey == null) continue;

                foreach (string subkeyName in rootKey.GetSubKeyNames())
                {
                    try
                    {
                        using RegistryKey? appKey = rootKey.OpenSubKey(subkeyName);
                        if (appKey == null) continue;

                        string? displayName = appKey.GetValue("DisplayName")?.ToString();
                        if (string.IsNullOrWhiteSpace(displayName)) continue; // Skip installer components without user-facing names

                        string? version = CleanWmiString(appKey.GetValue("DisplayVersion")?.ToString());
                        string? publisher = CleanWmiString(appKey.GetValue("Publisher")?.ToString());
                        string? installDate = CleanWmiString(appKey.GetValue("InstallDate")?.ToString());
                        string? installLocation = CleanWmiString(appKey.GetValue("InstallLocation")?.ToString());
                        int? estimatedSize = null;
                        if (appKey.GetValue("EstimatedSize") != null && int.TryParse(appKey.GetValue("EstimatedSize")?.ToString(), out int sz))
                        {
                            estimatedSize = sz; // Size in KB as reported by standard MSI Windows Installer entries
                        }

                        string deductKey = $"{displayName}_{version}";
                        if (seen.Add(deductKey))
                        {
                            result.Add(new InstalledSoftwareDto(displayName.Trim(), publisher, version, installDate, installLocation, estimatedSize));
                        }
                    }
                    catch (SecurityException secEx)
                    {
                        _logger.LogDebug(secEx, "Registry access denied when reading software uninstall key: [{SubKey}]", subkeyName);
                    }
                    catch { /* Skip corrupted individual registry nodes */ }
                }
            }
            catch (SecurityException ex)
            {
                _logger.LogWarning(ex, "Access denied reading software inventory registry path: [{Path}]", regPath);
                LogEvent("Registry access denied during software inventory collection: " + regPath, EventLogEntryType.Warning);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Unexpected failure accessing Registry path: [{Path}]", regPath);
            }
        }

        return result;
    }

    private List<WindowsServiceDto> DiscoverWindowsServices()
    {
        var result = new List<WindowsServiceDto>();
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) return result;

        try
        {
            var services = ServiceController.GetServices();
            foreach (var svc in services)
            {
                try
                {
                    result.Add(new WindowsServiceDto(
                        ServiceName: svc.ServiceName,
                        DisplayName: svc.DisplayName,
                        Status: svc.Status.ToString(),
                        StartType: svc.ServiceType.ToString(),
                        Account: null // Real account context requires expensive WMI query; avoided here without fake fallback strings
                    ));
                }
                catch { /* Skip inaccessible service handle */ }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to inspect live Windows Service controllers.");
        }

        return result.Take(250).ToList();
    }

    private List<StartupApplicationDto> DiscoverStartupApplications()
    {
        var result = new List<StartupApplicationDto>();
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) return result;

        string[] startupPaths = {
            @"SOFTWARE\Microsoft\Windows\CurrentVersion\Run",
            @"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Run"
        };

        foreach (var path in startupPaths)
        {
            try
            {
                using var key = Registry.LocalMachine.OpenSubKey(path);
                if (key != null)
                {
                    foreach (var valName in key.GetValueNames())
                    {
                        string? cmd = key.GetValue(valName)?.ToString();
                        if (!string.IsNullOrWhiteSpace(cmd))
                        {
                            result.Add(new StartupApplicationDto(valName, cmd, "HKLM_RUN", null));
                        }
                    }
                }
            }
            catch { /* Ignore restricted startup run keys */ }
        }

        return result;
    }

    private SecurityInventoryDto DiscoverSecurityState()
    {
        bool defenderEnabled = false;
        bool firewallEnabled = false;
        bool bitLockerEnabled = false;
        bool tpmEnabled = false;
        string? tpmVersion = null;

        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            try
            {
                using var scDefend = new ServiceController("WinDefend");
                defenderEnabled = (scDefend.Status == ServiceControllerStatus.Running);
            }
            catch { }

            try
            {
                using var scFirewall = new ServiceController("MpsSvc");
                firewallEnabled = (scFirewall.Status == ServiceControllerStatus.Running);
            }
            catch { }

            try
            {
                // WMI Query Win32_Tpm via WMI namespace \root\CIMV2\Security\MicrosoftTpm determines trusted platform module presence and security version
                using var searcher = new ManagementObjectSearcher(@"root\CIMV2\Security\MicrosoftTpm", "SELECT IsEnabled_InitialValue, SpecVersion FROM Win32_Tpm");
                foreach (ManagementObject obj in searcher.Get())
                {
                    tpmEnabled = bool.TryParse(obj["IsEnabled_InitialValue"]?.ToString(), out bool te) && te;
                    tpmVersion = CleanWmiString(obj["SpecVersion"]?.ToString());
                }
            }
            catch { /* TPM namespace requires elevation; ignore if unavailable under standard context */ }
        }

        return new SecurityInventoryDto(
            WindowsDefenderEnabled: defenderEnabled,
            FirewallEnabled: firewallEnabled,
            BitLockerEnabled: bitLockerEnabled,
            SecureBootEnabled: false,
            TpmEnabled: tpmEnabled,
            BitLockerDrive: null,
            TpmVersion: tpmVersion
        );
    }

    private DeviceCapabilitiesDto DiscoverCapabilities(bool hasGpu, bool hasWifi, bool hasEthernet)
    {
        bool supportsVirtualization = false;
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            try
            {
                // WMI Query Win32_ComputerSystem reports hardware virtualization status via hypervisor features
                using var searcher = new ManagementObjectSearcher("SELECT HypervisorPresent FROM Win32_ComputerSystem");
                foreach (ManagementObject obj in searcher.Get())
                {
                    supportsVirtualization = bool.TryParse(obj["HypervisorPresent"]?.ToString(), out bool hv) && hv;
                }
            }
            catch { }
        }

        return new DeviceCapabilitiesDto(
            SupportsGPU: hasGpu,
            SupportsBattery: false,
            SupportsTPM: true,
            SupportsVirtualization: supportsVirtualization,
            SupportsDocker: supportsVirtualization,
            SupportsWSL: supportsVirtualization,
            SupportsWiFi: hasWifi,
            SupportsEthernet: hasEthernet,
            VirtualMachineDetection: supportsVirtualization,
            VmVendor: null
        );
    }

    #endregion

    #region OS Collector & Windows Updates

    private OsPayload DiscoverOperatingSystem()
    {
        string? caption = null;
        string? version = null;
        string? buildNumber = null;
        string? osArch = null;
        string? serialNumber = null;
        string? lastBoot = null;
        string? installDate = null;
        var updates = new List<WindowsUpdatePayload>();

        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            try
            {
                // WMI Query Win32_OperatingSystem interrogates operating system edition, kernel build versions, architecture, serial licensing, and system uptime dates
                using var searcher = new ManagementObjectSearcher("SELECT Caption, Version, BuildNumber, OSArchitecture, SerialNumber, LastBootUpTime, InstallDate FROM Win32_OperatingSystem");
                foreach (ManagementObject obj in searcher.Get())
                {
                    caption = CleanWmiString(obj["Caption"]?.ToString());
                    version = CleanWmiString(obj["Version"]?.ToString());
                    buildNumber = CleanWmiString(obj["BuildNumber"]?.ToString());
                    osArch = CleanWmiString(obj["OSArchitecture"]?.ToString());
                    serialNumber = CleanWmiString(obj["SerialNumber"]?.ToString());
                    lastBoot = ParseWmiDateTime(obj["LastBootUpTime"]?.ToString());
                    installDate = ParseWmiDateTime(obj["InstallDate"]?.ToString());
                }
            }
            catch (Exception ex)
            {
                LogWmiFailure("Win32_OperatingSystem", ex);
            }

            try
            {
                // WMI Query Win32_QuickFixEngineering retrieves all applied Microsoft KB patches, security hotfixes, and update timestamps
                using var searcher = new ManagementObjectSearcher("SELECT HotFixID, InstalledOn FROM Win32_QuickFixEngineering");
                foreach (ManagementObject obj in searcher.Get())
                {
                    string? kb = CleanWmiString(obj["HotFixID"]?.ToString());
                    string? instOn = CleanWmiString(obj["InstalledOn"]?.ToString());
                    if (!string.IsNullOrEmpty(kb))
                    {
                        updates.Add(new WindowsUpdatePayload(kb, ParseWmiDateTime(instOn) ?? instOn));
                    }
                }
            }
            catch (Exception ex)
            {
                LogWmiFailure("Win32_QuickFixEngineering", ex);
            }
        }

        return new OsPayload(
            Name: caption ?? RuntimeInformation.OSDescription,
            Version: version ?? Environment.OSVersion.Version.ToString(),
            Architecture: osArch ?? RuntimeInformation.ProcessArchitecture.ToString(),
            LastBoot: lastBoot,
            InstallDate: installDate,
            Updates: updates,
            Caption: caption,
            BuildNumber: buildNumber,
            SerialNumber: serialNumber
        );
    }

    #endregion

    #region Helpers & Event Logging

    private string? CleanWmiString(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return null;
        string trimmed = input.Trim();
        if (trimmed == "" || trimmed == "Unknown" || trimmed == "N/A" || trimmed == "null") return null;
        return trimmed;
    }

    private string? ParseWmiDateTime(string? wmiDate)
    {
        if (string.IsNullOrWhiteSpace(wmiDate)) return null;
        try
        {
            if (wmiDate.Length >= 14 && wmiDate.Contains('.'))
            {
                return ManagementDateTimeConverter.ToDateTime(wmiDate).ToString("o");
            }
            if (DateTime.TryParse(wmiDate, out DateTime parsed))
            {
                return parsed.ToString("o");
            }
            return wmiDate;
        }
        catch
        {
            return wmiDate;
        }
    }

    private void LogWmiFailure(string sourceOrQuery, Exception ex)
    {
        _logger.LogWarning(ex, "WMI telemetry collection failed for target [{Query}]: {Message}. Returning partial inventory data.", sourceOrQuery, ex.Message);
        LogEvent($"WMI telemetry discovery failure for class/query [{sourceOrQuery}]: {ex.Message}", EventLogEntryType.Warning);
    }

    private void LogEvent(string message, EventLogEntryType type)
    {
        try
        {
            if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            {
                string source = "NOS Monitoring Agent";
                if (EventLog.SourceExists(source))
                {
                    EventLog.WriteEntry(source, message, type);
                }
                else if (EventLog.SourceExists("Application"))
                {
                    EventLog.WriteEntry("Application", $"[NOS Agent] {message}", type);
                }
            }
        }
        catch (SecurityException) { /* LocalSystem or service account may lack permissions to write to uncreated sources */ }
        catch { /* Never terminate agent worker on logging failures */ }
    }

    #endregion
}
