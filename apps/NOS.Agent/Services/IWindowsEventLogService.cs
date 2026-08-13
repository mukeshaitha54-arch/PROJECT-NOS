using System;
using System.Diagnostics;
using System.Threading.Tasks;

namespace NOS.Agent.Services
{
    public interface IWindowsEventLogService
    {
        void WriteEvent(int eventId, string message, EventLogEntryType type);
    }
}
