using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NOS.Agent.Data;
using NOS.Agent.Models;

namespace NOS.Agent.Services
{
    public class OutboxQueueService : IOutboxQueueService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private static readonly SemaphoreSlim _enqueueLock = new SemaphoreSlim(1, 1);
        private readonly JsonSerializerOptions _jsonOptions;

        public OutboxQueueService(IServiceScopeFactory scopeFactory)
        {
            _scopeFactory = scopeFactory;
            _jsonOptions = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = false
            };
        }

        public async Task EnqueueAsync(string messageType, object payload, int priority, CancellationToken cancellationToken = default)
        {
            var payloadJson = JsonSerializer.Serialize(payload, _jsonOptions);
            
            string? deviceId = null;
            string? tenantId = null;

            try
            {
                var node = JsonNode.Parse(payloadJson);
                if (node != null)
                {
                    deviceId = node["deviceId"]?.ToString();
                    tenantId = node["tenantId"]?.ToString();
                }
            }
            catch
            {
                // Ignore parse errors, fields will remain null
            }

            var message = new OutboxMessage
            {
                MessageType = messageType,
                Payload = payloadJson,
                Priority = priority,
                DeviceId = deviceId,
                TenantId = tenantId
            };

            await _enqueueLock.WaitAsync(cancellationToken);
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<OutboxDbContext>();
                await context.InitializeAsync(cancellationToken);

                var pendingCount = await context.OutboxMessages
                    .CountAsync(m => m.DeliveredAt == null && !m.IsDeadLetter, cancellationToken);

                if (pendingCount >= 10000)
                {
                    // Drop oldest lowest-priority message
                    var messageToDrop = await context.OutboxMessages
                        .Where(m => m.DeliveredAt == null && !m.IsDeadLetter)
                        .OrderByDescending(m => m.Priority)
                        .ThenBy(m => m.CreatedAt)
                        .FirstOrDefaultAsync(cancellationToken);

                    if (messageToDrop != null)
                    {
                        context.OutboxMessages.Remove(messageToDrop);
                    }
                }

                context.OutboxMessages.Add(message);
                await context.SaveChangesAsync(cancellationToken);
            }
            finally
            {
                _enqueueLock.Release();
            }
        }

        public async Task<List<OutboxMessage>> GetPendingMessagesAsync(int batchSize, CancellationToken cancellationToken = default)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<OutboxDbContext>();
            await context.InitializeAsync(cancellationToken);

            var now = DateTime.UtcNow;

            return await context.OutboxMessages
                .Where(m => m.DeliveredAt == null 
                            && !m.IsDeadLetter 
                            && (m.NextRetryAt == null || m.NextRetryAt <= now))
                .OrderBy(m => m.Priority)
                .ThenBy(m => m.NextRetryAt)
                .ThenBy(m => m.CreatedAt)
                .Take(batchSize)
                .ToListAsync(cancellationToken);
        }

        public async Task MarkDeliveredAsync(int messageId, CancellationToken cancellationToken = default)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<OutboxDbContext>();
            await context.InitializeAsync(cancellationToken);

            var message = await context.OutboxMessages.FindAsync(new object[] { messageId }, cancellationToken);
            if (message != null)
            {
                message.DeliveredAt = DateTime.UtcNow;
                await context.SaveChangesAsync(cancellationToken);
            }
        }

        public async Task MarkFailedAsync(int messageId, string error, CancellationToken cancellationToken = default)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<OutboxDbContext>();
            await context.InitializeAsync(cancellationToken);

            var message = await context.OutboxMessages.FindAsync(new object[] { messageId }, cancellationToken);
            if (message != null)
            {
                message.LastError = error.Length > 512 ? error.Substring(0, 512) : error;
                message.RetryCount++;

                if (message.RetryCount >= 10)
                {
                    message.IsDeadLetter = true;
                }
                else
                {
                    var backoffSeconds = Math.Min(5 * Math.Pow(2, message.RetryCount), 3600);
                    message.NextRetryAt = DateTime.UtcNow.AddSeconds(backoffSeconds);
                }

                await context.SaveChangesAsync(cancellationToken);
            }
        }

        public async Task<int> GetPendingCountAsync(CancellationToken cancellationToken = default)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<OutboxDbContext>();
            await context.InitializeAsync(cancellationToken);

            return await context.OutboxMessages
                .CountAsync(m => m.DeliveredAt == null && !m.IsDeadLetter, cancellationToken);
        }

        public async Task PurgeOldMessagesAsync(int maxAgeDays, CancellationToken cancellationToken = default)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<OutboxDbContext>();
            await context.InitializeAsync(cancellationToken);

            var cutoff = DateTime.UtcNow.AddDays(-maxAgeDays);
            
            var oldMessages = await context.OutboxMessages
                .Where(m => m.DeliveredAt != null && m.DeliveredAt < cutoff)
                .ToListAsync(cancellationToken);

            if (oldMessages.Any())
            {
                context.OutboxMessages.RemoveRange(oldMessages);
                await context.SaveChangesAsync(cancellationToken);
            }
        }

        public async Task PurgeDeadLettersAsync(CancellationToken cancellationToken = default)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<OutboxDbContext>();
            await context.InitializeAsync(cancellationToken);

            var cutoff = DateTime.UtcNow.AddDays(-7);
            
            var deadLetters = await context.OutboxMessages
                .Where(m => m.IsDeadLetter && m.CreatedAt < cutoff)
                .ToListAsync(cancellationToken);

            if (deadLetters.Any())
            {
                context.OutboxMessages.RemoveRange(deadLetters);
                await context.SaveChangesAsync(cancellationToken);
            }
        }
    }
}
