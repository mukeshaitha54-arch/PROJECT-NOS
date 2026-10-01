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
    public class HeartbeatCollector : BackgroundService
    {
        private readonly IOutboxQueueService _outboxQueue;
        private readonly AgentConfiguration _configuration;
        private readonly ILogger<HeartbeatCollector> _logger;

        public HeartbeatCollector(
            IOutboxQueueService outboxQueue,
            IOptions<AgentConfiguration> options,
            ILogger<HeartbeatCollector> logger)
        {
            _outboxQueue = outboxQueue;
            _configuration = options.Value;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (string.IsNullOrEmpty(DeviceRegistrationService.CurrentToken) && !stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(1000, stoppingToken);
            }

            if (stoppingToken.IsCancellationRequested) return;

            await SendHeartbeatAsync(stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    int intervalSeconds = _configuration.HeartbeatIntervalSeconds > 0 ? _configuration.HeartbeatIntervalSeconds : 30;
                    await Task.Delay(TimeSpan.FromSeconds(intervalSeconds), stoppingToken);
                    await SendHeartbeatAsync(stoppingToken);
                }
                catch (TaskCanceledException) { }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Unhandled exception in HeartbeatCollector loop.");
                }
            }
        }

        private async Task SendHeartbeatAsync(CancellationToken stoppingToken)
        {
            try
            {
                var payload = CollectHeartbeatData();
                if (payload == null)
                {
                    _logger.LogWarning("Skipping heartbeat cycle due to WMI failure.");
                    return;
                }

                await _outboxQueue.EnqueueAsync("heartbeat", payload, 1, stoppingToken);
                _logger.LogInformation(
                    "Enqueued heartbeat. CPU: {CpuUsage}%, RAM: {RamUsage}%, Procs: {Procs}, DiskR: {DR:F2} MB/s, DiskW: {DW:F2} MB/s, NetUp: {NU:F2} Mbps, NetDn: {ND:F2} Mbps",
                    Math.Round(payload.CpuUsage, 2),
                    Math.Round(payload.RamUsage, 2),
                    payload.RunningProcesses,
                    payload.DiskReadSpeed,
                    payload.DiskWriteSpeed,
                    payload.NetworkUploadSpeed,
                    payload.NetworkDownloadSpeed);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send heartbeat.");
            }
        }

        /// <summary>
        /// Average 3 CPU samples over 300ms, remove outliers, clamp to 0-100.
        /// </summary>
        private double GetCpuUsageAveraged()
        {
            var samples = new List<double>();
            try
            {
                for (int i = 0; i < 3; i++)
                {
                    using var searcher = new ManagementObjectSearcher(
                        "SELECT PercentProcessorTime FROM Win32_PerfFormattedData_PerfOS_Processor WHERE Name='_Total'");

                    foreach (ManagementObject obj in searcher.Get())
                    {
                        var cpu = obj["PercentProcessorTime"];
                        if (cpu != null)
                            samples.Add(Convert.ToDouble(cpu));
                    }

                    if (i < 2) Thread.Sleep(100);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "WMI CPU usage failed. Attempting PerformanceCounter fallback.");
            }

            if (samples.Count == 0)
            {
                try
                {
                    using var pc = new PerformanceCounter("Processor", "% Processor Time", "_Total");
                    pc.NextValue();
                    Thread.Sleep(300);
                    return Math.Clamp(Math.Round((double)pc.NextValue(), 2), 0.0, 100.0);
                }
                catch (Exception ex2)
                {
                    _logger.LogWarning(ex2, "PerformanceCounter fallback also failed. Returning 0.0.");
                    return 0.0;
                }
            }

            if (samples.Count >= 3)
            {
                samples.Remove(samples.Min());
                samples.Remove(samples.Max());
            }

            return Math.Clamp(Math.Round(samples.Average(), 2), 0.0, 100.0);
        }

        /// <summary>
        /// Read disk read/write bytes/sec via PerformanceCounter with a 500ms sample for accuracy.
        /// Returns values in MB/s.
        /// </summary>
        private (double readMbs, double writeMbs) GetDiskSpeeds()
        {
            try
            {
                using var readCounter = new PerformanceCounter("PhysicalDisk", "Disk Read Bytes/sec", "_Total", true);
                using var writeCounter = new PerformanceCounter("PhysicalDisk", "Disk Write Bytes/sec", "_Total", true);

                readCounter.NextValue();
                writeCounter.NextValue();
                Thread.Sleep(500); // 500ms for accurate sample

                double readMbs = Math.Round(readCounter.NextValue() / (1024.0 * 1024.0), 3);
                double writeMbs = Math.Round(writeCounter.NextValue() / (1024.0 * 1024.0), 3);
                return (readMbs, writeMbs);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to collect disk speed counters.");
                return (0.0, 0.0);
            }
        }

        /// <summary>
        /// Get network upload/download speed in Mbps (megabits per second).
        /// Uses PerformanceCounterCategory to reliably find the active NIC instance.
        /// </summary>
        private (double uploadMbps, double downloadMbps) GetNetworkSpeeds()
        {
            try
            {
                // Find the best active NIC
                var activeNic = NetworkInterface.GetAllNetworkInterfaces()
                    .Where(ni => ni.OperationalStatus == OperationalStatus.Up
                              && ni.NetworkInterfaceType != NetworkInterfaceType.Loopback
                              && ni.NetworkInterfaceType != NetworkInterfaceType.Tunnel)
                    .OrderByDescending(ni => ni.Speed)
                    .FirstOrDefault();

                if (activeNic == null) return (0.0, 0.0);

                // Enumerate actual PerformanceCounter instance names to find our NIC
                var cat = new PerformanceCounterCategory("Network Interface");
                string[] instances = cat.GetInstanceNames();

                // Fuzzy match: normalize both sides (strip special chars) and find best match
                string nicDescNorm = NormalizeNicName(activeNic.Description);
                string? instanceName = instances.FirstOrDefault(inst =>
                    NormalizeNicName(inst).Equals(nicDescNorm, StringComparison.OrdinalIgnoreCase));

                // Fallback: pick first non-loopback instance
                if (string.IsNullOrEmpty(instanceName))
                {
                    instanceName = instances.FirstOrDefault(inst =>
                        !inst.Contains("Loopback", StringComparison.OrdinalIgnoreCase) &&
                        !inst.Contains("WFP", StringComparison.OrdinalIgnoreCase));
                }

                if (string.IsNullOrEmpty(instanceName)) return (0.0, 0.0);

                using var sentCounter = new PerformanceCounter("Network Interface", "Bytes Sent/sec", instanceName, true);
                using var recvCounter = new PerformanceCounter("Network Interface", "Bytes Received/sec", instanceName, true);

                sentCounter.NextValue();
                recvCounter.NextValue();
                Thread.Sleep(500); // 500ms sample

                double bytesSent = sentCounter.NextValue();
                double bytesRecv = recvCounter.NextValue();

                // Convert bytes/sec to Mbps (megabits = *8 / 1,000,000)
                double uploadMbps = Math.Round((bytesSent * 8.0) / 1_000_000.0, 3);
                double downloadMbps = Math.Round((bytesRecv * 8.0) / 1_000_000.0, 3);

                return (uploadMbps, downloadMbps);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to collect network speed counters.");
                return (0.0, 0.0);
            }
        }

        private static string NormalizeNicName(string name)
        {
            return System.Text.RegularExpressions.Regex
                .Replace(name, @"[^a-zA-Z0-9]", "")
                .ToLowerInvariant();
        }

        private HeartbeatPayload? CollectHeartbeatData()
        {
            double cpuUsage = 0.0;
            double ramUsage = 0.0;
            double uptime = 0.0;
            string ipAddress = "Unknown";
            int runningProcesses = 0;
            int activeConnections = 0;

            try
            {
                // CPU (averaged 3 samples)
                try { cpuUsage = GetCpuUsageAveraged(); }
                catch (Exception ex) { _logger.LogWarning(ex, "Failed to collect CPU usage."); }

                // RAM + uptime from WMI
                try
                {
                    using var searcher = new ManagementObjectSearcher(
                        "SELECT TotalVisibleMemorySize, FreePhysicalMemory, LastBootUpTime FROM Win32_OperatingSystem");
                    var os = searcher.Get().Cast<ManagementObject>().FirstOrDefault();
                    if (os != null)
                    {
                        if (os["TotalVisibleMemorySize"] != null && os["FreePhysicalMemory"] != null)
                        {
                            double totalRam = Convert.ToDouble(os["TotalVisibleMemorySize"]);
                            double freeRam = Convert.ToDouble(os["FreePhysicalMemory"]);
                            if (totalRam > 0)
                                ramUsage = Math.Round(((totalRam - freeRam) / totalRam) * 100.0, 2);
                        }
                        if (os["LastBootUpTime"] != null)
                        {
                            string bootStr = os["LastBootUpTime"].ToString()!;
                            DateTime bootTime = ManagementDateTimeConverter.ToDateTime(bootStr);
                            uptime = (DateTime.Now - bootTime).TotalSeconds;
                        }
                    }
                }
                catch (Exception ex) { _logger.LogWarning(ex, "Failed to collect RAM/uptime from WMI."); }

                // RAM fallback
                if (ramUsage == 0.0)
                {
                    try
                    {
                        var gcInfo = GC.GetGCMemoryInfo();
                        double totalBytes = gcInfo.TotalAvailableMemoryBytes;
                        using var pcMem = new PerformanceCounter("Memory", "Available Bytes");
                        double availableBytes = (double)pcMem.NextValue();
                        if (totalBytes > 0)
                            ramUsage = Math.Clamp(Math.Round(((totalBytes - availableBytes) / totalBytes) * 100.0, 2), 0.0, 100.0);
                    }
                    catch (Exception fallbackEx)
                    {
                        _logger.LogWarning(fallbackEx, "PerformanceCounter memory fallback failed.");
                    }
                }

                // IP address
                try
                {
                    using var searcher = new ManagementObjectSearcher(
                        "SELECT IPAddress FROM Win32_NetworkAdapterConfiguration WHERE IPEnabled = True");
                    var adapter = searcher.Get().Cast<ManagementObject>().FirstOrDefault();
                    if (adapter != null && adapter["IPAddress"] is string[] ips && ips.Length > 0)
                        ipAddress = ips.FirstOrDefault(ip => !ip.Contains(":")) ?? ips[0];
                }
                catch (Exception ex) { _logger.LogWarning(ex, "Failed to collect IP address."); }

                // Running process count (live, dynamic)
                try { runningProcesses = Process.GetProcesses().Length; }
                catch (Exception ex) { _logger.LogWarning(ex, "Failed to get process count."); }

                // Active TCP connections
                try
                {
                    var globalProps = System.Net.NetworkInformation.IPGlobalProperties.GetIPGlobalProperties();
                    activeConnections = globalProps.GetActiveTcpConnections().Length;
                }
                catch (Exception ex) { _logger.LogWarning(ex, "Failed to get TCP connections."); }

                // Disk speeds (MB/s)
                var (diskRead, diskWrite) = GetDiskSpeeds();

                // Network speeds (Mbps)
                var (netUp, netDown) = GetNetworkSpeeds();

                return new HeartbeatPayload
                {
                    DeviceId = DeviceRegistrationService.CurrentDeviceId,
                    Status = "ONLINE",
                    Timestamp = DateTime.UtcNow.ToString("O"),
                    CpuUsage = cpuUsage,
                    RamUsage = ramUsage,
                    Uptime = uptime,
                    IpAddress = string.IsNullOrEmpty(ipAddress) ? "0.0.0.0" : ipAddress,
                    RunningProcesses = runningProcesses,
                    ActiveConnections = activeConnections,
                    DiskReadSpeed = diskRead,
                    DiskWriteSpeed = diskWrite,
                    NetworkUploadSpeed = netUp,
                    NetworkDownloadSpeed = netDown,
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Fatal error collecting heartbeat data.");
                return null;
            }
        }

        private class HeartbeatPayload
        {
            public string? DeviceId { get; set; }
            public string Status { get; set; } = "ONLINE";
            public string Timestamp { get; set; } = string.Empty;
            public double CpuUsage { get; set; } = 0.0;
            public double RamUsage { get; set; } = 0.0;
            public double Uptime { get; set; } = 0.0;
            public string IpAddress { get; set; } = "0.0.0.0";
            // === New dynamic metrics (30s update cycle) ===
            public int RunningProcesses { get; set; } = 0;
            public int ActiveConnections { get; set; } = 0;
            public double DiskReadSpeed { get; set; } = 0.0;   // MB/s
            public double DiskWriteSpeed { get; set; } = 0.0;  // MB/s
            public double NetworkUploadSpeed { get; set; } = 0.0;   // Mbps
            public double NetworkDownloadSpeed { get; set; } = 0.0; // Mbps
        }
    }
}