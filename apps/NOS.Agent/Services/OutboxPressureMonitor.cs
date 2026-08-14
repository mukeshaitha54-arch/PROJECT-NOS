using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NOS.Agent.Configuration;
using NOS.Agent.Data;

namespace NOS.Agent.Services
{
    public class OutboxPressureMonitor : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<OutboxPressureMonitor> _logger;
        private readonly IWindowsEventLogService _eventLog;
        private readonly AgentConfiguration _config;
        private readonly string _dbPath;

        public OutboxPressureMonitor(
            IServiceProvider serviceProvider,
            ILogger<OutboxPressureMonitor> logger,
            IWindowsEventLogService eventLog,
            IOptions<AgentConfiguration> options)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
            _eventLog = eventLog;
            _config = options.Value;
            _dbPath = Path.Combine(AppContext.BaseDirectory, "outbox.db");
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await CheckPressureAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in OutboxPressureMonitor");
                }
                await Task.Delay(TimeSpan.FromSeconds(60), stoppingToken);
            }
        }

        private async Task CheckPressureAsync(CancellationToken stoppingToken)
        {
            long dbSizeBytes = 0;
            if (File.Exists(_dbPath))
            {
                dbSizeBytes = new FileInfo(_dbPath).Length;
            }
            double dbSizeMb = dbSizeBytes / (1024.0 * 1024.0);

            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<OutboxDbContext>();
            var outboxCount = await dbContext.OutboxMessages.CountAsync(stoppingToken);
            var deadLetterCount = await dbContext.DeadLetterMessages.CountAsync(stoppingToken);

            // BUG 5 FIX: Log queue depth every monitoring cycle
            _logger.LogInformation(
                "Outbox status: {Pending} pending, {Dead} dead-letter messages. DB size: {Size:F2}MB",
                outboxCount, deadLetterCount, dbSizeMb);

            if (outboxCount > 100)
            {
                _logger.LogWarning(
                    "Outbox queue depth is {Count} — dispatcher may be falling behind. Consider checking connectivity.",
                    outboxCount);
            }

            if (deadLetterCount > 100)
            {
                _eventLog.WriteEvent(1003, $"CRITICAL: Dead letter queue has {deadLetterCount} messages.", EventLogEntryType.Error);
            }

            if (outboxCount > 1000 || dbSizeMb > 50)
            {
                _logger.LogWarning("High pressure detected. DB Size: {Size}MB, Outbox: {Count}", dbSizeMb, outboxCount);
            }

            if (dbSizeMb > 100)
            {
                _logger.LogWarning("Emergency pruning: DB Size ({Size}MB) exceeds 100MB.", dbSizeMb);
                
                var connection = dbContext.Database.GetDbConnection();
                if (connection.State != System.Data.ConnectionState.Open)
                    await connection.OpenAsync(stoppingToken);

                using (var command = connection.CreateCommand())
                {
                    // Only delete Priority = 5 (telemetry), never heartbeats (1) or inventory (10)
                    // datetime('now', '-1 hour')
                    command.CommandText = "DELETE FROM OutboxMessages WHERE Id IN (SELECT Id FROM OutboxMessages WHERE Priority = 5 AND CreatedAt < datetime('now', '-1 hour') ORDER BY CreatedAt ASC LIMIT 100)";
                    int deleted = await command.ExecuteNonQueryAsync(stoppingToken);
                    
                    if (deleted > 0)
                    {
                        _logger.LogWarning("Pruned {Count} oldest telemetry messages to reduce DB size.", deleted);
                        _eventLog.WriteEvent(1001, $"Pruned {deleted} old telemetry messages to reduce pressure.", EventLogEntryType.Warning);
                    }
                }
            }
        }
    }
}
