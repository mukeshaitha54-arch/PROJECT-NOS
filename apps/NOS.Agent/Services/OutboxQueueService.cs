using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using NOS.Agent.Data;
using NOS.Agent.Models;

namespace NOS.Agent.Services
{
    public class OutboxQueueService : IOutboxQueueService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<OutboxQueueService> _logger;

        public OutboxQueueService(IServiceProvider serviceProvider, ILogger<OutboxQueueService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        public async Task EnqueueAsync(string messageType, object payload, int priority, CancellationToken cancellationToken = default)
        {
            await ExecuteWithRetryAsync(async () =>
            {
                using var scope = _serviceProvider.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<OutboxDbContext>();
                
                var message = new OutboxMessage
                {
                    MessageType = messageType,
                    Payload = System.Text.Json.JsonSerializer.Serialize(payload, new System.Text.Json.JsonSerializerOptions 
                    { 
                        PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase 
                    }),
                    Priority = priority,
                    CreatedAt = DateTime.UtcNow,
                    NextRetryAt = DateTime.UtcNow,
                    RetryCount = 0,
                    IsDeadLetter = false
                };
                dbContext.OutboxMessages.Add(message);
                await dbContext.SaveChangesAsync(cancellationToken);
                
                _logger.LogDebug("Enqueued message {MessageType} with priority {Priority}", messageType, priority);
                return true;
            });
        }

        public async Task<List<OutboxMessage>> GetPendingMessagesAsync(int batchSize, CancellationToken cancellationToken = default)
        {
            return await ExecuteWithRetryAsync(async () =>
            {
                using var scope = _serviceProvider.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<OutboxDbContext>();
                
                return await dbContext.OutboxMessages
                    .Where(m => m.DeliveredAt == null && !m.IsDeadLetter && m.NextRetryAt <= DateTime.UtcNow)
                    .OrderBy(m => m.Priority)
                    .ThenBy(m => m.CreatedAt)
                    .Take(batchSize)
                    .ToListAsync(cancellationToken);
            });
        }

        public async Task MarkDeliveredAsync(int messageId, CancellationToken cancellationToken = default)
        {
            await ExecuteWithRetryAsync(async () =>
            {
                using var scope = _serviceProvider.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<OutboxDbContext>();
                
                var message = await dbContext.OutboxMessages.FindAsync(new object[] { messageId }, cancellationToken);
                if (message != null)
                {
                    message.DeliveredAt = DateTime.UtcNow;
                    await dbContext.SaveChangesAsync(cancellationToken);
                }
                return true;
            });
        }

        public async Task MarkFailedAsync(int messageId, string error, CancellationToken cancellationToken = default)
        {
            await ExecuteWithRetryAsync(async () =>
            {
                using var scope = _serviceProvider.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<OutboxDbContext>();
                
                var message = await dbContext.OutboxMessages.FindAsync(new object[] { messageId }, cancellationToken);
                if (message != null)
                {
                    message.RetryCount++;
                    message.LastError = error;
                    message.NextRetryAt = DateTime.UtcNow.AddSeconds(Math.Pow(2, message.RetryCount)); // Exponential backoff
                    
                    if (message.RetryCount >= 10)
                    {
                        var dlqMsg = new DeadLetterMessage
                        {
                            MessageType = message.MessageType,
                            Payload = message.Payload,
                            CreatedAt = message.CreatedAt,
                            FailedAt = DateTime.UtcNow,
                            FinalError = error,
                            Priority = message.Priority,
                            DeviceId = message.DeviceId,
                            TenantId = message.TenantId
                        };
                        dbContext.DeadLetterMessages.Add(dlqMsg);
                        dbContext.OutboxMessages.Remove(message);
                    }
                    await dbContext.SaveChangesAsync(cancellationToken);
                }
                return true;
            });
        }

        public async Task<int> GetPendingCountAsync(CancellationToken cancellationToken = default)
        {
            return await ExecuteWithRetryAsync(async () =>
            {
                using var scope = _serviceProvider.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<OutboxDbContext>();
                
                return await dbContext.OutboxMessages
                    .CountAsync(m => m.DeliveredAt == null && !m.IsDeadLetter, cancellationToken);
            });
        }

        public async Task PurgeOldMessagesAsync(int maxAgeDays, CancellationToken cancellationToken = default)
        {
            await ExecuteWithRetryAsync(async () =>
            {
                using var scope = _serviceProvider.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<OutboxDbContext>();
                
                var cutoff = DateTime.UtcNow.AddDays(-maxAgeDays);
                var oldMessages = await dbContext.OutboxMessages
                    .Where(m => m.DeliveredAt != null && m.DeliveredAt < cutoff)
                    .ToListAsync(cancellationToken);
                
                dbContext.OutboxMessages.RemoveRange(oldMessages);
                await dbContext.SaveChangesAsync(cancellationToken);
                
                _logger.LogInformation("Purged {Count} old delivered messages", oldMessages.Count);
                return true;
            });
        }

        public async Task PurgeDeadLettersAsync(CancellationToken cancellationToken = default)
        {
            await ExecuteWithRetryAsync(async () =>
            {
                using var scope = _serviceProvider.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<OutboxDbContext>();
                
                var deadLetters = await dbContext.OutboxMessages
                    .Where(m => m.IsDeadLetter)
                    .ToListAsync(cancellationToken);
                
                dbContext.OutboxMessages.RemoveRange(deadLetters);
                await dbContext.SaveChangesAsync(cancellationToken);
                
                _logger.LogInformation("Purged {Count} dead letter messages", deadLetters.Count);
                return true;
            });
        }

        private async Task<T> ExecuteWithRetryAsync<T>(Func<Task<T>> action)
        {
            int maxRetries = 3;
            for (int i = 0; i < maxRetries; i++)
            {
                try
                {
                    return await action();
                }
                catch (Microsoft.Data.Sqlite.SqliteException ex) when (i < maxRetries - 1)
                {
                    _logger.LogWarning(ex, "SQLite operation failed. Retrying in 100ms. Attempt {Attempt}", i + 1);
                    await Task.Delay(100);
                }
                catch (DbUpdateException ex) when (i < maxRetries - 1)
                {
                    _logger.LogWarning(ex, "DbUpdateException failed. Retrying in 100ms. Attempt {Attempt}", i + 1);
                    await Task.Delay(100);
                }
            }
            // Let it throw on the final attempt
            return await action();
        }
    }
}