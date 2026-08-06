using System.Collections.Generic;
using System.Threading.Tasks;
using NOS.Agent.Models;

namespace NOS.Agent.Services
{
    public interface IOfflineBufferService
    {
        Task EnqueueAsync<T>(T payload);
        Task<List<T>> DequeueBatchAsync<T>(int batchSize);
        int Count { get; }
        Task PersistAsync();
        Task LoadAsync();
    }
}
