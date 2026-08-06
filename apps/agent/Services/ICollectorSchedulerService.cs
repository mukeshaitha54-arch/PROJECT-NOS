using System;
using System.Threading.Tasks;

namespace NOS.Agent.Services
{
    public enum CollectorPriority
    {
        Critical = 10,   // 10s: CPU, RAM, Heartbeat
        Standard = 30,   // 30s: Disk, Network, Top Processes
        Inventory = 300  // 300s: Software, Services, Defender, BitLocker, USB, TPM, GPU, EventLogs
    }

    public interface ICollectorSchedulerService
    {
        bool ShouldRun(string collectorName, CollectorPriority priority);
        void RecordSuccess(string collectorName);
        void RecordFailure(string collectorName, Exception ex);
        bool IsCircuitOpen(string collectorName);
    }
}
