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
    public class AgentResourceMonitor : BackgroundService, IResourceMonitorService
    {
        private readonly ILogger<AgentResourceMonitor> _logger;
        private readonly IWindowsEventLogService _eventLog;
        private readonly AgentConfiguration _config;
        private readonly ISafeModeService _safeMode;

        private TimeSpan _lastProcessorTime;
        private DateTime _lastCheckTime;
        private int _cpuSustainedCount = 0;
        private readonly int _processorCount = Environment.ProcessorCount;

        public bool IsThrottled { get; private set; }
        public bool IsSurvivalMode { get; private set; }

        public AgentResourceMonitor(
            ILogger<AgentResourceMonitor> logger,
            IWindowsEventLogService eventLog,
            IOptions<AgentConfiguration> options,
            ISafeModeService safeMode)
        {
            _logger = logger;
            _eventLog = eventLog;
            _config = options.Value;
            _safeMode = safeMode;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // Initialize CPU tracking
            using (var process = Process.GetCurrentProcess())
            {
                _lastProcessorTime = process.TotalProcessorTime;
                _lastCheckTime = DateTime.UtcNow;
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

                try
                {
                    await CheckResourcesAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in AgentResourceMonitor");
                }
            }
        }

        private async Task CheckResourcesAsync(CancellationToken cancellationToken)
        {
            await Task.CompletedTask;
            using var process = Process.GetCurrentProcess();
            
            // Calculate RAM
            double ramMb = process.WorkingSet64 / (1024.0 * 1024.0);
            double maxRam = _config.ResourceGuardrails?.MaxRamMB ?? 128;
            double emergencyRam = _config.ResourceGuardrails?.EmergencyRamMB ?? 200;

            if (ramMb > emergencyRam)
            {
                _eventLog.WriteEvent(1003, $"CRITICAL: RAM usage {ramMb}MB exceeded emergency limit {emergencyRam}MB. Triggering emergency shutdown.", EventLogEntryType.Error);
                Environment.Exit(99);
            }
            else if (ramMb > maxRam && !IsSurvivalMode)
            {
                IsSurvivalMode = true;
                _logger.LogWarning("WARNING: Agent RAM usage {Ram} MB exceeds threshold {Max} MB. Pausing non-critical collectors.", ramMb, maxRam);
                _eventLog.WriteEvent(1001, $"WARNING: Agent RAM usage {ramMb} MB exceeds threshold {maxRam} MB. Throttling activated.", EventLogEntryType.Warning);
            }
            else if (ramMb <= maxRam && IsSurvivalMode)
            {
                IsSurvivalMode = false;
                _logger.LogInformation("Agent RAM usage {Ram} MB returned to normal. Resuming collectors.", ramMb);
            }

            // Calculate CPU
            var currentProcessorTime = process.TotalProcessorTime;
            var currentTime = DateTime.UtcNow;

            var cpuUsedMs = (currentProcessorTime - _lastProcessorTime).TotalMilliseconds;
            var timePassedMs = (currentTime - _lastCheckTime).TotalMilliseconds;
            double cpuUsage = (cpuUsedMs / (timePassedMs * _processorCount)) * 100.0;

            _lastProcessorTime = currentProcessorTime;
            _lastCheckTime = currentTime;

            double maxCpu = _config.ResourceGuardrails?.MaxCpuPercent ?? 3.0;

            if (cpuUsage > maxCpu)
            {
                _cpuSustainedCount++;
                // 4 checks * 30 seconds = 120 seconds (2 minutes)
                if (_cpuSustainedCount >= 4 && !IsThrottled)
                {
                    IsThrottled = true;
                    _config.HeartbeatIntervalSeconds = _config.ResourceGuardrails?.ThrottleHeartbeatIntervalSec ?? 120;
                    _config.TelemetryIntervalSeconds = _config.ResourceGuardrails?.ThrottleTelemetryIntervalSec ?? 600;
                    
                    _logger.LogWarning("CPU > {MaxCpu}% sustained over 2 minutes. Throttling dispatch interval.", maxCpu);
                    _eventLog.WriteEvent(1001, $"Throttling activated due to high CPU ({cpuUsage}%).", EventLogEntryType.Warning);
                }
            }
            else
            {
                _cpuSustainedCount = 0;
            }
        }
    }
}
