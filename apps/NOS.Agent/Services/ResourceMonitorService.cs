using System;
using System.Diagnostics;
using System.Runtime.Versioning;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using NOS.Agent.Configuration;
using NOS.Agent.Data;

namespace NOS.Agent.Services
{
    [SupportedOSPlatform("windows")]
    public class ResourceMonitorService : BackgroundService, IResourceMonitorService
    {
        private readonly AgentConfiguration _config;
        private readonly IWindowsEventLogService _eventLog;
        private readonly IServiceScopeFactory _scopeFactory;

        private int _highCpuCount = 0;
        private bool _isThrottled = false;
        private bool _isSurvivalMode = false;

        public bool IsThrottled => _isThrottled;
        public bool IsSurvivalMode => _isSurvivalMode;

        public ResourceMonitorService(
            IOptions<AgentConfiguration> configOptions,
            IWindowsEventLogService eventLog,
            IServiceScopeFactory scopeFactory)
        {
            _config = configOptions.Value;
            _eventLog = eventLog;
            _scopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (!_config.EnableSelfThrottling) return;

            PerformanceCounter? cpuCounter = null;
            PerformanceCounter? ramCounter = null;

            try
            {
                var processName = Process.GetCurrentProcess().ProcessName;
                cpuCounter = new PerformanceCounter("Process", "% Processor Time", processName, true);
                ramCounter = new PerformanceCounter("Memory", "Available MBytes", true);

                // Initialize counters
                cpuCounter.NextValue();
                ramCounter.NextValue();
            }
            catch (Exception ex)
            {
                _eventLog.WriteEvent(2000, $"Failed to initialize performance counters: {ex.Message}", EventLogEntryType.Warning);
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);

                try
                {
                    float cpuPercent = cpuCounter?.NextValue() ?? 0;
                    float availableRamMb = ramCounter?.NextValue() ?? 1024;
                    long workingSetMb = Process.GetCurrentProcess().WorkingSet64 / (1024 * 1024);

                    // CPU Check
                    if (cpuPercent > _config.MaxCpuPercent)
                    {
                        _highCpuCount++;
                        if (_highCpuCount >= 3 && !_isThrottled)
                        {
                            _isThrottled = true;
                            _config.HeartbeatIntervalSeconds *= 2;
                            _config.TelemetryIntervalSeconds *= 2;
                            _config.InventoryIntervalSeconds *= 2;
                            _config.SecurityScanIntervalSeconds *= 2;
                            _config.MaxConcurrentCollections = 1;

                            _eventLog.WriteEvent(2000, $"CPU throttling activated. CPU at {cpuPercent}%. Intervals doubled.", EventLogEntryType.Warning);
                        }
                    }
                    else
                    {
                        _highCpuCount = 0;
                    }

                    // RAM Check
                    if (workingSetMb > _config.MaxRamMb)
                    {
                        _eventLog.WriteEvent(1001, $"Memory limit exceeded ({workingSetMb} MB > {_config.MaxRamMb} MB). Emergency throttle.", EventLogEntryType.Error);
                        await VacuumDatabaseAsync(stoppingToken);
                        
                        // Collectors can check IsThrottled or we use an emergency flag
                        _isThrottled = true;
                    }

                    // System RAM check
                    if (availableRamMb < 100 && !_isSurvivalMode)
                    {
                        _isSurvivalMode = true;
                        _eventLog.WriteEvent(2000, $"Survival mode activated. System RAM low ({availableRamMb} MB).", EventLogEntryType.Warning);
                    }
                    else if (availableRamMb > 200 && _isSurvivalMode)
                    {
                        _isSurvivalMode = false;
                        _eventLog.WriteEvent(3000, $"Survival mode deactivated. System RAM restored ({availableRamMb} MB).", EventLogEntryType.Information);
                    }
                }
                catch (Exception ex)
                {
                    _eventLog.WriteEvent(1001, $"Error during resource monitoring: {ex.Message}", EventLogEntryType.Error);
                }
            }

            cpuCounter?.Dispose();
            ramCounter?.Dispose();
        }

        private async Task VacuumDatabaseAsync(CancellationToken cancellationToken)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<OutboxDbContext>();
                await context.Database.ExecuteSqlRawAsync("VACUUM;", cancellationToken);
            }
            catch (Exception ex)
            {
                _eventLog.WriteEvent(2000, $"Failed to VACUUM SQLite database: {ex.Message}", EventLogEntryType.Warning);
            }
        }
    }
}
