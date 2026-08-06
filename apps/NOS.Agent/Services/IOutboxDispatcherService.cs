using System.Threading;
using System.Threading.Tasks;

namespace NOS.Agent.Services
{
    public interface IOutboxDispatcherService
    {
        Task DispatchPendingMessagesAsync(CancellationToken cancellationToken = default);
    }
}
