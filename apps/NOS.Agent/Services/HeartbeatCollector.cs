using System;
using System.Linq;
using System.Management;
using System.Reflection;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace NOS.Agent.Services
{
    public class HeartbeatCollector : BackgroundService
    {
        private readonly IOutboxQueueService _outboxQueue;
        private readonly IConfiguration _configuration;
        private readonly ILogger<HeartbeatCollector> _logger;

        public HeartbeatCollector(
            IOutboxQueueService outboxQueue,
            IConfiguration configuration,
            ILogger<HeartbeatCollector> logger)
        {
            _outboxQueue = outboxQueue;
            _configuration = configuration;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (string.IsNullOrEmpty(DeviceRegistrationService.CurrentToken) && !stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(1000, stoppingToken);
            }

            if (stoppingToken.IsCancellationRequested) return;

            int intervalSeconds = _configuration.GetValue<int>("AgentConfiguration:HeartbeatIntervalSeconds", 60);
            await SendHeartbeatAsync(stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
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
                _logger.LogInformation("Enqueued heartbeat. CPU: {CpuUsage}, RAM: {RamUsage}", payload.CpuUsage, payload.RamUsage);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send heartbeat.");
            }
        }

        private HeartbeatPayload? CollectHeartbeatData()
        {
            double? cpuUsage = null;
            double? ramUsage = null;
            double uptime = 0.0;
            string ipAddress = "Unknown";

            try
            {
                try
                {
                    using var searcher = new ManagementObjectSearcher("SELECT LoadPercentage FROM Win32_Processor");
                    var cpu = searcher.Get().Cast<ManagementObject>().FirstOrDefault();
                    if (cpu != null && cpu["LoadPercentage"] != null)
                        cpuUsage = Convert.ToDouble(cpu["LoadPercentage"]);
                }
                catch (Exception ex) { _logger.LogWarning(ex, "Failed to collect CPU usage."); }

                try
                {
                    using var searcher = new ManagementObjectSearcher("SELECT TotalVisibleMemorySize, FreePhysicalMemory, LastBootUpTime FROM Win32_OperatingSystem");
                    var os = searcher.Get().Cast<ManagementObject>().FirstOrDefault();
                    if (os != null)
                    {
                        if (os["TotalVisibleMemorySize"] != null && os["FreePhysicalMemory"] != null)
                        {
                            double totalRam = Convert.ToDouble(os["TotalVisibleMemorySize"]);
                            double freeRam = Convert.ToDouble(os["FreePhysicalMemory"]);
                            if (totalRam > 0)
                                ramUsage = ((totalRam - freeRam) / totalRam) * 100.0;
                        }
                        if (os["LastBootUpTime"] != null)
                        {
                            string bootStr = os["LastBootUpTime"].ToString()!;
                            DateTime bootTime = ManagementDateTimeConverter.ToDateTime(bootStr);
                            uptime = (DateTime.Now - bootTime).TotalSeconds;
                        }
                    }
                }
                catch (Exception ex) { _logger.LogWarning(ex, "Failed to collect RAM/uptime."); }

                try
                {
                    using var searcher = new ManagementObjectSearcher("SELECT IPAddress FROM Win32_NetworkAdapterConfiguration WHERE IPEnabled = True");
                    var adapter = searcher.Get().Cast<ManagementObject>().FirstOrDefault();
                    if (adapter != null && adapter["IPAddress"] is string[] ips && ips.Length > 0)
                        ipAddress = ips.FirstOrDefault(ip => !ip.Contains(":")) ?? ips[0];
                }
                catch (Exception ex) { _logger.LogWarning(ex, "Failed to collect IP address."); }

                return new HeartbeatPayload
                {
                    Timestamp = DateTime.UtcNow.ToString("O"),
                    CpuUsage = cpuUsage ?? 0.0,
                    RamUsage = ramUsage ?? 0.0,
                    Uptime = uptime,
                    IpAddress = string.IsNullOrEmpty(ipAddress) ? "0.0.0.0" : ipAddress,
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
            public string Timestamp { get; set; } = string.Empty;
            public double CpuUsage { get; set; } = 0.0;
            public double RamUsage { get; set; } = 0.0;
            public double Uptime { get; set; } = 0.0;
            public string IpAddress { get; set; } = "0.0.0.0";
        }
    }
}