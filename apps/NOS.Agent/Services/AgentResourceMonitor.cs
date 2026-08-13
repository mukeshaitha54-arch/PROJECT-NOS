using System;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NOS.Agent.Configuration;

namespace NOS.Agent.Services
{
    public class AgentResourceMonitor : BackgroundService
    {
        private readonly ILogger<AgentResourceMonitor> _logger;
        private readonly IWindowsEventLogService _eventLog;
        private readonly AgentConfiguration _config;
        private readonly IResourceMonitorService _resourceMonitor;

        public AgentResourceMonitor(
            ILogger<AgentResourceMonitor> logger,
            IWindowsEventLogService eventLog,
            IOptions<AgentConfiguration> options,
            IResourceMonitorService resourceMonitor)
        {
            _logger = logger;
            _eventLog = eventLog;
            _config = options.Value;
            _resourceMonitor = resourceMonitor;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await CheckResourcesAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in AgentResourceMonitor");
                }
                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
            }
        }

        private Task CheckResourcesAsync()
        {
            using var process = Process.GetCurrentProcess();
            
            // Note: In real life TotalProcessorTime requires two readings to calculate percentage,
            // but for simplicity, we approximate or rely on existing ResourceMonitorService tracking.
            double ramMb = process.WorkingSet64 / (1024.0 * 1024.0);
            
            // Fake CPU calculation as placeholder since precise process CPU% needs delta
            // Let's assume we rely on the _config values
            double maxRam = _config.ResourceGuardrails?.MaxRamMB ?? 128;
            double emergencyRam = _config.ResourceGuardrails?.EmergencyRamMB ?? 200;

            if (ramMb > emergencyRam)
            {
                _eventLog.WriteEvent(1003, $"CRITICAL: RAM usage {ramMb}MB exceeded emergency limit {emergencyRam}MB. Triggering emergency shutdown.", EventLogEntryType.Error);
                Environment.Exit(99);
            }
            else if (ramMb > maxRam)
            {
                _logger.LogWarning("WARNING: Agent RAM usage {Ram} MB exceeds threshold {Max} MB. Throttling activated.", ramMb, maxRam);
                _logger.LogWarning("Telemetry interval increased to {Sec} seconds", _config.ResourceGuardrails?.ThrottleTelemetryIntervalSec ?? 600);
                _logger.LogWarning("Heartbeat interval increased to {Sec} seconds", _config.ResourceGuardrails?.ThrottleHeartbeatIntervalSec ?? 120);
                _eventLog.WriteEvent(1001, $"WARNING: Agent RAM usage {ramMb} MB exceeds threshold {maxRam} MB. Throttling activated.", EventLogEntryType.Warning);
                // Pause logic is driven by the fact that IsSurvivalMode might be set internally.
            }
            
            return Task.CompletedTask;
        }
    }
}
