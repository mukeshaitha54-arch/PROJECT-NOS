using System;
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

        // BUG 3 FIX: Cache WMI admin availability — only log AccessDenied once per lifetime
        private static bool _cpuTempAdminChecked = false;
        private static bool _cpuTempAdminAvailable = false;

        /// <summary>
        /// Initializes a new instance of the <see cref="TelemetryCollector"/> class.
        /// </summary>
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

        /// <summary>
        /// Executes the background telemetry collection loop.
        /// </summary>
        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // Wait until device is registered
            while (string.IsNullOrEmpty(DeviceRegistrationService.CurrentToken) && !stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(1000, stoppingToken);
            }

            if (stoppingToken.IsCancellationRequested) return;

            int intervalSeconds = _configuration.TelemetryIntervalSeconds > 0 ? _configuration.TelemetryIntervalSeconds : 300;

            // Optional initial collection
            await CollectAndSendTelemetryAsync(stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
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

        /// <summary>
        /// Collects hardware metrics and sends the payload to the outbox queue.
        /// </summary>
        private async Task CollectAndSendTelemetryAsync(CancellationToken stoppingToken)
        {
            if (_safeMode.IsActive)
            {
                _logger.LogInformation("Skipping telemetry cycle due to Safe Mode being active.");
                return;
            }

            if (_resourceMonitor.IsThrottled || _resourceMonitor.IsSurvivalMode)
            {
                var msg = "Skipping telemetry cycle due to agent resource constraints (throttled).";
                _logger.LogWarning(msg);
                _eventLog.WriteEvent(2001, msg, EventLogEntryType.Warning);
                return;
            }

            try
            {
                var payload = CollectTelemetryData();
                await _outboxQueue.EnqueueAsync("telemetry", payload, 2, stoppingToken);
                _logger.LogInformation("Enqueued telemetry data successfully.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to collect and send telemetry data.");
            }
        }

        /// <summary>
        /// Gathers telemetry data from WMI and PerformanceCounters.
        /// </summary>
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
                // Static CPU metadata from Win32_Processor
                using var searcher = new ManagementObjectSearcher("SELECT CurrentClockSpeed, NumberOfLogicalProcessors, NumberOfCores FROM Win32_Processor");
                var cpu = searcher.Get().Cast<ManagementObject>().FirstOrDefault();
                if (cpu != null)
                {
                    dto.CpuFrequency = cpu["CurrentClockSpeed"] != null ? Convert.ToDouble(cpu["CurrentClockSpeed"]) / 1000.0 : 0.0;
                    dto.LogicalProcessors = cpu["NumberOfLogicalProcessors"] != null ? Convert.ToInt32(cpu["NumberOfLogicalProcessors"]) : 0;
                    dto.PhysicalProcessors = cpu["NumberOfCores"] != null ? Convert.ToInt32(cpu["NumberOfCores"]) : 0;
                }

                // BUG 1+4 FIX: Average 3 samples over 300ms using Win32_PerfFormattedData_PerfOS_Processor
                var samples = new System.Collections.Generic.List<double>();
                for (int i = 0; i < 3; i++)
                {
                    using var s2 = new ManagementObjectSearcher("SELECT PercentProcessorTime FROM Win32_PerfFormattedData_PerfOS_Processor WHERE Name='_Total'");
                    foreach (ManagementObject obj in s2.Get())
                    {
                        var pct = obj["PercentProcessorTime"];
                        if (pct != null) samples.Add(Convert.ToDouble(pct));
                    }
                    if (i < 2) Thread.Sleep(150);
                }

                if (samples.Count >= 3) { samples.Remove(samples.Min()); samples.Remove(samples.Max()); }
                // BUG 2 FIX: Round to 2dp
                dto.CpuUsage = samples.Count > 0 ? Math.Clamp(Math.Round(samples.Average(), 2), 0.0, 100.0) : 0.0;
            }
            catch (ManagementException ex) when (ex.ErrorCode == ManagementStatus.AccessDenied)
            {
                _logger.LogWarning("WMI Access Denied reading basic CPU data.");
            }
            catch (ManagementException ex)
            {
                _logger.LogWarning(ex, "WMI error reading basic CPU data: {ErrorCode}.", ex.ErrorCode);
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to collect basic CPU WMI data."); }

            // BUG 3 FIX: Only attempt WMI temp if we haven't already confirmed access denied
            if (_cpuTempAdminChecked && !_cpuTempAdminAvailable)
            {
                dto.CpuTemperature = 0.0; // silently return fallback — warning was already logged once
                return;
            }

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
                }
            }
            catch (ManagementException ex) when (ex.ErrorCode == ManagementStatus.AccessDenied)
            {
                _cpuTempAdminChecked = true;
                _cpuTempAdminAvailable = false;
                // BUG 3 FIX: Log ONLY once — this branch will never be reached again
                _logger.LogWarning(
                    "WMI Access Denied reading CPU temperature. Run agent as Administrator for thermal data. " +
                    "Temperature will report 0\u00b0C. This warning will NOT repeat.");
                dto.CpuTemperature = 0.0;
            }
            catch (ManagementException ex)
            {
                _logger.LogWarning(ex, "WMI error reading CPU temperature: {ErrorCode}. Falling back to 0.", ex.ErrorCode);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error reading CPU temperature. Falling back to 0.");
            }
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
                        // BUG 2 FIX: Round to 2 decimal places
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
            catch (ManagementException ex)
            {
                _logger.LogWarning(ex, "WMI error reading memory data: {ErrorCode}.", ex.ErrorCode);
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to collect memory WMI data."); }
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
                        // BUG 2 FIX: Round to 2 decimal places
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
            catch (ManagementException ex)
            {
                _logger.LogWarning(ex, "WMI error reading disk data: {ErrorCode}.", ex.ErrorCode);
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to collect disk WMI data."); }

            try
            {
                using var readCounter = new PerformanceCounter("PhysicalDisk", "Disk Read Bytes/sec", "_Total", true);
                using var writeCounter = new PerformanceCounter("PhysicalDisk", "Disk Write Bytes/sec", "_Total", true);
                
                readCounter.NextValue();
                writeCounter.NextValue();
                Thread.Sleep(100); // small delay to allow counter to gather sample
                
                dto.DiskReadSpeed = readCounter.NextValue() / Math.Pow(1024, 2);
                dto.DiskWriteSpeed = writeCounter.NextValue() / Math.Pow(1024, 2);
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
            catch (ManagementException ex)
            {
                _logger.LogWarning(ex, "WMI error reading network data: {ErrorCode}.", ex.ErrorCode);
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to collect network WMI data."); }

            try
            {
                var interfaces = NetworkInterface.GetAllNetworkInterfaces();
                NetworkInterface? activeInterface = null;

                if (!string.IsNullOrEmpty(macAddress))
                {
                    string formattedMac = macAddress.Replace(":", "");
                    activeInterface = interfaces.FirstOrDefault(ni => ni.GetPhysicalAddress().ToString().Equals(formattedMac, StringComparison.OrdinalIgnoreCase));
                }

                if (activeInterface == null)
                {
                    activeInterface = interfaces.FirstOrDefault(ni => ni.OperationalStatus == OperationalStatus.Up && ni.NetworkInterfaceType != NetworkInterfaceType.Loopback);
                }

                if (activeInterface != null)
                {
                    string instanceName = activeInterface.Description.Replace("(", "[").Replace(")", "]");
                    
                    try
                    {
                        using var sentCounter = new PerformanceCounter("Network Interface", "Bytes Sent/sec", instanceName, true);
                        using var recvCounter = new PerformanceCounter("Network Interface", "Bytes Received/sec", instanceName, true);

                        sentCounter.NextValue();
                        recvCounter.NextValue();
                        Thread.Sleep(100);

                        double bytesSentRaw = sentCounter.NextValue();
                        double bytesRecvRaw = recvCounter.NextValue();

                        dto.BytesSent = bytesSentRaw;
                        dto.BytesReceived = bytesRecvRaw;

                        // Convert to Mbps: (bytes * 8) / (1024 * 1024)
                        dto.NetworkUploadSpeed = (bytesSentRaw * 8) / Math.Pow(1024, 2);
                        dto.NetworkDownloadSpeed = (bytesRecvRaw * 8) / Math.Pow(1024, 2);
                    }
                    catch (Exception ex) { _logger.LogWarning(ex, $"Failed to collect network performance counters for {instanceName}."); }
                }
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to process network interfaces for speeds."); }

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
            try
            {
                dto.RunningProcesses = Process.GetProcesses().Length;
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to collect running processes."); }

            try
            {
                dto.RunningServices = ServiceController.GetServices().Count(s => s.Status == ServiceControllerStatus.Running);
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to collect running services."); }

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
            catch (ManagementException ex)
            {
                _logger.LogWarning(ex, "WMI error reading system boot time: {ErrorCode}.", ex.ErrorCode);
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to collect system uptime WMI data."); }
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
        public int LogicalProcessors { get; set; } = 0;
        public int PhysicalProcessors { get; set; } = 0;

        public double MemoryUsed { get; set; } = 0.0;
        public double MemoryFree { get; set; } = 0.0;
        public double MemoryTotal { get; set; } = 0.0;
        public double MemoryUsagePercent { get; set; } = 0.0;

        public double DiskReadSpeed { get; set; } = 0.0;
        public double DiskWriteSpeed { get; set; } = 0.0;
        public double DiskUsagePercent { get; set; } = 0.0;
        public double DiskFree { get; set; } = 0.0;
        public double DiskTotal { get; set; } = 0.0;

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
