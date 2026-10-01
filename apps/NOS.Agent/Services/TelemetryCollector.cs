using System;
using System.Diagnostics;
using System.Linq;
using System.Management;
using System.Net.NetworkInformation;
using System.ServiceProcess;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NOS.Agent.Configuration;

namespace NOS.Agent.Services
{
    /// <summary>
    /// Background service that periodically collects comprehensive hardware and system telemetry
    /// and queues it for dispatch to the central API.
    /// </summary>
    public class TelemetryCollector : BackgroundService
    {
        private readonly IOutboxQueueService _outboxQueue;
        private readonly IResourceMonitorService _resourceMonitor;
        private readonly AgentConfiguration _configuration;
        private readonly ILogger<TelemetryCollector> _logger;
        private readonly IWindowsEventLogService _eventLog;
        private readonly ISafeModeService _safeMode;

        // Cache WMI admin availability — only log AccessDenied once per lifetime
        private static bool _cpuTempAdminChecked = false;
        private static bool _cpuTempAdminAvailable = false;

        public TelemetryCollector(
            IOutboxQueueService outboxQueue,
            IResourceMonitorService resourceMonitor,
            IOptions<AgentConfiguration> options,
            ILogger<TelemetryCollector> logger,
            IWindowsEventLogService eventLog,
            ISafeModeService safeMode)
        {
            _outboxQueue = outboxQueue;
            _resourceMonitor = resourceMonitor;
            _configuration = options.Value;
            _logger = logger;
            _eventLog = eventLog;
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

            await CollectAndSendTelemetryAsync(stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    int intervalSeconds = _configuration.TelemetryIntervalSeconds > 0 ? _configuration.TelemetryIntervalSeconds : 30;
                    await Task.Delay(TimeSpan.FromSeconds(intervalSeconds), stoppingToken);
                    await CollectAndSendTelemetryAsync(stoppingToken);
                }
                catch (TaskCanceledException) { }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Unhandled exception in TelemetryCollector loop.");
                }
            }
        }

        private async Task CollectAndSendTelemetryAsync(CancellationToken stoppingToken)
        {
            if (_safeMode.IsActive)
            {
                _logger.LogInformation("Skipping telemetry cycle due to Safe Mode being active.");
                return;
            }

            if (_resourceMonitor.IsSurvivalMode)
            {
                var msg = "Skipping telemetry cycle due to agent emergency survival mode.";
                _logger.LogWarning(msg);
                _eventLog.WriteEvent(2001, msg, EventLogEntryType.Warning);
                return;
            }

            try
            {
                var payload = CollectTelemetryData();
                await _outboxQueue.EnqueueAsync("telemetry", payload, 2, stoppingToken);
                _logger.LogInformation("Enqueued telemetry data. CPU: {Cpu}%, Temp: {Temp}°C, DiskR: {DR:F2}MB/s, DiskW: {DW:F2}MB/s, NetUp: {NU:F2}Mbps, NetDn: {ND:F2}Mbps, Procs: {Procs}",
                    Math.Round(payload.CpuUsage, 2),
                    Math.Round(payload.CpuTemperature, 1),
                    payload.DiskReadSpeed,
                    payload.DiskWriteSpeed,
                    payload.NetworkUploadSpeed,
                    payload.NetworkDownloadSpeed,
                    payload.RunningProcesses);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to collect and send telemetry data.");
            }
        }

        private SubmitTelemetryDto CollectTelemetryData()
        {
            var dto = new SubmitTelemetryDto();

            CollectCpuData(dto);
            CollectMemoryData(dto);
            CollectDiskData(dto);
            CollectNetworkData(dto);
            CollectSystemData(dto);

            return dto;
        }

        private void CollectCpuData(SubmitTelemetryDto dto)
        {
            try
            {
                // Static CPU metadata
                using var searcher = new ManagementObjectSearcher("SELECT CurrentClockSpeed, NumberOfLogicalProcessors, NumberOfCores FROM Win32_Processor");
                var cpu = searcher.Get().Cast<ManagementObject>().FirstOrDefault();
                if (cpu != null)
                {
                    dto.CpuFrequency = cpu["CurrentClockSpeed"] != null ? Convert.ToDouble(cpu["CurrentClockSpeed"]) / 1000.0 : 0.0;
                    int logical = cpu["NumberOfLogicalProcessors"] != null ? Convert.ToInt32(cpu["NumberOfLogicalProcessors"]) : 0;
                    int physical = cpu["NumberOfCores"] != null ? Convert.ToInt32(cpu["NumberOfCores"]) : 0;
                    dto.LogicalProcessors = logical > 0 ? logical : Math.Max(1, Environment.ProcessorCount);
                    dto.PhysicalProcessors = physical > 0 ? physical : Math.Max(1, Environment.ProcessorCount / 2);
                }

                // Average 3 samples over 300ms
                var samples = new System.Collections.Generic.List<double>();
                for (int i = 0; i < 3; i++)
                {
                    using var s2 = new ManagementObjectSearcher("SELECT PercentProcessorTime FROM Win32_PerfFormattedData_PerfOS_Processor WHERE Name='_Total'");
                    foreach (ManagementObject obj in s2.Get())
                    {
                        var pct = obj["PercentProcessorTime"];
                        if (pct != null) samples.Add(Convert.ToDouble(pct));
                    }
                    if (i < 2) Thread.Sleep(100);
                }

                if (samples.Count >= 3) { samples.Remove(samples.Min()); samples.Remove(samples.Max()); }

                if (samples.Count > 0)
                    dto.CpuUsage = Math.Clamp(Math.Round(samples.Average(), 2), 0.0, 100.0);
                else
                {
                    using var pc = new PerformanceCounter("Processor", "% Processor Time", "_Total");
                    pc.NextValue();
                    Thread.Sleep(300);
                    dto.CpuUsage = Math.Clamp(Math.Round((double)pc.NextValue(), 2), 0.0, 100.0);
                }
            }
            catch (ManagementException ex) when (ex.ErrorCode == ManagementStatus.AccessDenied)
            {
                _logger.LogWarning("WMI Access Denied reading basic CPU data.");
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to collect basic CPU WMI data."); }

            // CPU Temperature — try multiple WMI namespaces + fallback chain
            CollectCpuTemperature(dto);
        }

        private void CollectCpuTemperature(SubmitTelemetryDto dto)
        {
            // If we already confirmed access denied, skip silently
            if (_cpuTempAdminChecked && !_cpuTempAdminAvailable)
            {
                dto.CpuTemperature = 0.0;
                return;
            }

            // Strategy 1: MSAcpi_ThermalZoneTemperature (requires admin, most accurate)
            try
            {
                using var thermalSearcher = new ManagementObjectSearcher(@"root\WMI", "SELECT CurrentTemperature FROM MSAcpi_ThermalZoneTemperature");
                var thermal = thermalSearcher.Get().Cast<ManagementObject>().FirstOrDefault();
                if (thermal != null && thermal["CurrentTemperature"] != null)
                {
                    _cpuTempAdminChecked = true;
                    _cpuTempAdminAvailable = true;
                    double tempTenthsKelvin = Convert.ToDouble(thermal["CurrentTemperature"]);
                    dto.CpuTemperature = Math.Round((tempTenthsKelvin / 10.0) - 273.15, 2);
                    return;
                }
            }
            catch (ManagementException ex) when (ex.ErrorCode == ManagementStatus.AccessDenied)
            {
                _cpuTempAdminChecked = true;
                _cpuTempAdminAvailable = false;
                _logger.LogWarning(
                    "WMI Access Denied reading CPU temperature (MSAcpi_ThermalZoneTemperature). " +
                    "Run agent as Administrator for thermal data. Trying Win32_TemperatureProbe fallback. " +
                    "This warning will NOT repeat.");
            }
            catch (ManagementException ex)
            {
                _logger.LogWarning(ex, "WMI error reading CPU temperature via MSAcpi: {ErrorCode}.", ex.ErrorCode);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Unexpected error reading CPU temperature via MSAcpi.");
            }

            // Strategy 2: Win32_TemperatureProbe (available on some BIOSes without full admin)
            try
            {
                using var probeSearcher = new ManagementObjectSearcher("SELECT CurrentReading FROM Win32_TemperatureProbe");
                var probe = probeSearcher.Get().Cast<ManagementObject>().FirstOrDefault();
                if (probe != null && probe["CurrentReading"] != null)
                {
                    double tempTenthsCelsius = Convert.ToDouble(probe["CurrentReading"]);
                    // Win32_TemperatureProbe returns in tenths of degrees Kelvin
                    double tempCelsius = (tempTenthsCelsius / 10.0) - 273.15;
                    if (tempCelsius > 0 && tempCelsius < 120) // sanity check
                    {
                        dto.CpuTemperature = Math.Round(tempCelsius, 2);
                        return;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Win32_TemperatureProbe fallback failed.");
            }

            // Strategy 3: OpenHardwareMonitor WMI namespace (if OHM is running on the machine)
            try
            {
                using var ohmSearcher = new ManagementObjectSearcher(@"root\OpenHardwareMonitor", "SELECT Value FROM Sensor WHERE SensorType='Temperature' AND Name LIKE 'CPU%'");
                var sensor = ohmSearcher.Get().Cast<ManagementObject>().FirstOrDefault();
                if (sensor != null && sensor["Value"] != null)
                {
                    double temp = Convert.ToDouble(sensor["Value"]);
                    if (temp > 0 && temp < 120)
                    {
                        dto.CpuTemperature = Math.Round(temp, 2);
                        return;
                    }
                }
            }
            catch
            {
                // OHM not installed — silent fail
            }

            // Final fallback: report 0 (insufficient permissions)
            dto.CpuTemperature = 0.0;
        }

        private void CollectMemoryData(SubmitTelemetryDto dto)
        {
            try
            {
                using var searcher = new ManagementObjectSearcher("SELECT TotalVisibleMemorySize, FreePhysicalMemory FROM Win32_OperatingSystem");
                var os = searcher.Get().Cast<ManagementObject>().FirstOrDefault();
                if (os != null)
                {
                    double totalKb = os["TotalVisibleMemorySize"] != null ? Convert.ToDouble(os["TotalVisibleMemorySize"]) : 0.0;
                    double freeKb = os["FreePhysicalMemory"] != null ? Convert.ToDouble(os["FreePhysicalMemory"]) : 0.0;

                    dto.MemoryTotal = totalKb / (1024.0 * 1024.0);
                    dto.MemoryFree = freeKb / (1024.0 * 1024.0);
                    dto.MemoryUsed = dto.MemoryTotal - dto.MemoryFree;

                    if (dto.MemoryTotal > 0)
                    {
                        dto.MemoryUsagePercent = Math.Round((dto.MemoryUsed / dto.MemoryTotal) * 100.0, 2);
                        dto.MemoryTotal = Math.Round(dto.MemoryTotal, 3);
                        dto.MemoryFree = Math.Round(dto.MemoryFree, 3);
                        dto.MemoryUsed = Math.Round(dto.MemoryUsed, 3);
                    }
                }
            }
            catch (ManagementException ex) when (ex.ErrorCode == ManagementStatus.AccessDenied)
            {
                _logger.LogWarning("WMI Access Denied reading memory data. Run agent as Administrator.");
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to collect memory WMI data."); }

            if (dto.MemoryTotal == 0.0)
            {
                try
                {
                    var gcInfo = GC.GetGCMemoryInfo();
                    double totalBytes = gcInfo.TotalAvailableMemoryBytes;
                    using var pcMem = new PerformanceCounter("Memory", "Available Bytes");
                    double availableBytes = (double)pcMem.NextValue();

                    if (totalBytes > 0)
                    {
                        dto.MemoryTotal = Math.Round(totalBytes / (1024.0 * 1024.0 * 1024.0), 2);
                        dto.MemoryFree = Math.Round(availableBytes / (1024.0 * 1024.0 * 1024.0), 2);
                        dto.MemoryUsed = dto.MemoryTotal - dto.MemoryFree;
                        dto.MemoryUsagePercent = Math.Clamp(Math.Round(((totalBytes - availableBytes) / totalBytes) * 100.0, 2), 0.0, 100.0);
                    }
                }
                catch (Exception fallbackEx)
                {
                    _logger.LogWarning(fallbackEx, "PerformanceCounter memory fallback failed.");
                }
            }
        }

        private void CollectDiskData(SubmitTelemetryDto dto)
        {
            try
            {
                using var searcher = new ManagementObjectSearcher("SELECT DeviceID, Size, FreeSpace FROM Win32_LogicalDisk WHERE DriveType=3");
                var disks = searcher.Get().Cast<ManagementObject>();
                var systemDisk = disks.FirstOrDefault(d => d["DeviceID"]?.ToString() == "C:") ?? disks.FirstOrDefault();

                if (systemDisk != null)
                {
                    double totalBytes = systemDisk["Size"] != null ? Convert.ToDouble(systemDisk["Size"]) : 0.0;
                    double freeBytes = systemDisk["FreeSpace"] != null ? Convert.ToDouble(systemDisk["FreeSpace"]) : 0.0;

                    dto.DiskTotal = totalBytes / Math.Pow(1024, 3);
                    dto.DiskFree = freeBytes / Math.Pow(1024, 3);

                    if (dto.DiskTotal > 0)
                    {
                        dto.DiskUsagePercent = Math.Round(((dto.DiskTotal - dto.DiskFree) / dto.DiskTotal) * 100.0, 2);
                        dto.DiskTotal = Math.Round(dto.DiskTotal, 2);
                        dto.DiskFree = Math.Round(dto.DiskFree, 2);
                    }
                }
            }
            catch (ManagementException ex) when (ex.ErrorCode == ManagementStatus.AccessDenied)
            {
                _logger.LogWarning("WMI Access Denied reading disk data.");
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to collect disk WMI data."); }

            // Disk Read/Write speed — 500ms sample for accuracy (was 100ms, too short)
            try
            {
                using var readCounter = new PerformanceCounter("PhysicalDisk", "Disk Read Bytes/sec", "_Total", true);
                using var writeCounter = new PerformanceCounter("PhysicalDisk", "Disk Write Bytes/sec", "_Total", true);

                readCounter.NextValue();
                writeCounter.NextValue();
                Thread.Sleep(500); // FIXED: was 100ms — now 500ms for reliable measurement

                dto.DiskReadSpeed = Math.Round(readCounter.NextValue() / (1024.0 * 1024.0), 3); // MB/s
                dto.DiskWriteSpeed = Math.Round(writeCounter.NextValue() / (1024.0 * 1024.0), 3); // MB/s
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to collect disk performance counters."); }
        }

        private void CollectNetworkData(SubmitTelemetryDto dto)
        {
            string macAddress = string.Empty;
            try
            {
                using var searcher = new ManagementObjectSearcher("SELECT IPAddress, MACAddress, DefaultIPGateway, DNSServerSearchOrder FROM Win32_NetworkAdapterConfiguration WHERE IPEnabled=True");
                var adapter = searcher.Get().Cast<ManagementObject>().FirstOrDefault();

                if (adapter != null)
                {
                    if (adapter["IPAddress"] is string[] ips && ips.Length > 0)
                        dto.IpAddress = ips.FirstOrDefault(ip => !ip.Contains(":")) ?? ips[0];

                    if (adapter["MACAddress"] != null)
                    {
                        macAddress = adapter["MACAddress"].ToString() ?? "";
                        dto.MacAddress = macAddress;
                    }

                    if (adapter["DefaultIPGateway"] is string[] gateways && gateways.Length > 0)
                        dto.Gateway = gateways[0];

                    if (adapter["DNSServerSearchOrder"] is string[] dnsList && dnsList.Length > 0)
                        dto.Dns = dnsList[0];
                }
            }
            catch (ManagementException ex) when (ex.ErrorCode == ManagementStatus.AccessDenied)
            {
                _logger.LogWarning("WMI Access Denied reading network data.");
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to collect network WMI data."); }

            // Network speed via reliable PerformanceCounterCategory instance name lookup
            try
            {
                // Find best active NIC
                NetworkInterface? activeNic = null;

                if (!string.IsNullOrEmpty(macAddress))
                {
                    string formattedMac = macAddress.Replace(":", "");
                    activeNic = NetworkInterface.GetAllNetworkInterfaces()
                        .FirstOrDefault(ni => ni.GetPhysicalAddress().ToString().Equals(formattedMac, StringComparison.OrdinalIgnoreCase));
                }

                activeNic ??= NetworkInterface.GetAllNetworkInterfaces()
                    .Where(ni => ni.OperationalStatus == OperationalStatus.Up
                              && ni.NetworkInterfaceType != NetworkInterfaceType.Loopback
                              && ni.NetworkInterfaceType != NetworkInterfaceType.Tunnel)
                    .OrderByDescending(ni => ni.Speed)
                    .FirstOrDefault();

                if (activeNic != null)
                {
                    // FIXED: Use PerformanceCounterCategory.GetInstanceNames() for reliable matching
                    var cat = new PerformanceCounterCategory("Network Interface");
                    string[] instances = cat.GetInstanceNames();
                    string nicDescNorm = NormalizeNicName(activeNic.Description);

                    string? instanceName = instances.FirstOrDefault(inst =>
                        NormalizeNicName(inst).Equals(nicDescNorm, StringComparison.OrdinalIgnoreCase));

                    if (string.IsNullOrEmpty(instanceName))
                        instanceName = instances.FirstOrDefault(inst =>
                            !inst.Contains("Loopback", StringComparison.OrdinalIgnoreCase) &&
                            !inst.Contains("WFP", StringComparison.OrdinalIgnoreCase));

                    if (!string.IsNullOrEmpty(instanceName))
                    {
                        using var sentCounter = new PerformanceCounter("Network Interface", "Bytes Sent/sec", instanceName, true);
                        using var recvCounter = new PerformanceCounter("Network Interface", "Bytes Received/sec", instanceName, true);

                        sentCounter.NextValue();
                        recvCounter.NextValue();
                        Thread.Sleep(500); // FIXED: was 100ms, now 500ms for accuracy

                        double bytesSentRaw = sentCounter.NextValue();
                        double bytesRecvRaw = recvCounter.NextValue();

                        dto.BytesSent = bytesSentRaw;
                        dto.BytesReceived = bytesRecvRaw;

                        // FIXED: Mbps = (bytes/sec * 8) / 1,000,000 (not /1024^2 which gives Mibps)
                        dto.NetworkUploadSpeed = Math.Round((bytesSentRaw * 8.0) / 1_000_000.0, 3);
                        dto.NetworkDownloadSpeed = Math.Round((bytesRecvRaw * 8.0) / 1_000_000.0, 3);
                    }
                }
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to collect network performance counters."); }

            try
            {
                var globalProperties = IPGlobalProperties.GetIPGlobalProperties();
                var tcpConnections = globalProperties.GetActiveTcpConnections();
                dto.ActiveConnections = tcpConnections.Length;
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to collect TCP connections."); }
        }

        private void CollectSystemData(SubmitTelemetryDto dto)
        {
            // Running process count — live, always current
            try
            {
                dto.RunningProcesses = Process.GetProcesses().Length;
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to collect running processes."); }

            // Running services count
            try
            {
                dto.RunningServices = ServiceController.GetServices().Count(s => s.Status == ServiceControllerStatus.Running);
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to collect running services."); }

            // Boot time + uptime
            try
            {
                using var searcher = new ManagementObjectSearcher("SELECT LastBootUpTime FROM Win32_OperatingSystem");
                var os = searcher.Get().Cast<ManagementObject>().FirstOrDefault();
                if (os != null && os["LastBootUpTime"] != null)
                {
                    string bootStr = os["LastBootUpTime"].ToString()!;
                    DateTime bootTime = ManagementDateTimeConverter.ToDateTime(bootStr);

                    dto.BootTime = bootTime.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ");
                    dto.SystemUptime = (DateTime.Now - bootTime).TotalSeconds;
                }
            }
            catch (ManagementException ex) when (ex.ErrorCode == ManagementStatus.AccessDenied)
            {
                _logger.LogWarning("WMI Access Denied reading system boot time.");
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to collect system uptime WMI data."); }
        }

        private static string NormalizeNicName(string name)
        {
            return Regex.Replace(name, @"[^a-zA-Z0-9]", "").ToLowerInvariant();
        }
    }

    /// <summary>
    /// Data Transfer Object representing a full telemetry snapshot.
    /// </summary>
    public class SubmitTelemetryDto
    {
        public double CpuUsage { get; set; } = 0.0;
        public double CpuTemperature { get; set; } = 0.0;
        public double CpuFrequency { get; set; } = 0.0;
        public int LogicalProcessors { get; set; } = Math.Max(1, Environment.ProcessorCount);
        public int PhysicalProcessors { get; set; } = Math.Max(1, Environment.ProcessorCount / 2);

        public double MemoryUsed { get; set; } = 0.0;
        public double MemoryFree { get; set; } = 0.0;
        public double MemoryTotal { get; set; } = 0.0;
        public double MemoryUsagePercent { get; set; } = 0.0;

        // MB/s
        public double DiskReadSpeed { get; set; } = 0.0;
        public double DiskWriteSpeed { get; set; } = 0.0;
        public double DiskUsagePercent { get; set; } = 0.0;
        public double DiskFree { get; set; } = 0.0;
        public double DiskTotal { get; set; } = 0.0;

        // Mbps (megabits per second)
        public double NetworkUploadSpeed { get; set; } = 0.0;
        public double NetworkDownloadSpeed { get; set; } = 0.0;
        public double BytesSent { get; set; } = 0.0;
        public double BytesReceived { get; set; } = 0.0;
        public int ActiveConnections { get; set; } = 0;

        public int RunningProcesses { get; set; } = 0;
        public int RunningServices { get; set; } = 0;
        public double SystemUptime { get; set; } = 0.0;
        public string BootTime { get; set; } = "Unknown";

        public string IpAddress { get; set; } = "Unknown";
        public string Gateway { get; set; } = "0.0.0.0";
        public string Dns { get; set; } = "8.8.8.8";
        public string MacAddress { get; set; } = "Unknown";
    }
}
