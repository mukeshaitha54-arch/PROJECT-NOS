using System.Threading;
using System.Threading.Tasks;

namespace NOS.Agent.Services
{
    public interface IResourceMonitorService
    {
        // Typically a background service, but we might expose current metrics
        bool IsThrottled { get; }
        bool IsSurvivalMode { get; }
    }
}
