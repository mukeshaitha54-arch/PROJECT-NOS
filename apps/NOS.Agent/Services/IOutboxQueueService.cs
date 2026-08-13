using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using NOS.Agent.Models;

namespace NOS.Agent.Services
{
    public interface IOutboxQueueService
    {
        Task EnqueueAsync(string messageType, object payload, int priority, CancellationToken cancellationToken = default);
        Task<List<OutboxMessage>> GetPendingMessagesAsync(int batchSize, CancellationToken cancellationToken = default);
        Task MarkDeliveredAsync(int messageId, CancellationToken cancellationToken = default);
        Task MarkFailedAsync(int messageId, string error, CancellationToken cancellationToken = default);
        Task<int> GetPendingCountAsync(CancellationToken cancellationToken = default);
        Task PurgeOldMessagesAsync(int maxAgeDays, CancellationToken cancellationToken = default);
        Task PurgeDeadLettersAsync(CancellationToken cancellationToken = default);
    }
}
