using System;
using System.Diagnostics;
using System.Threading.Tasks;

namespace NOS.Agent.Services
{
    public interface IWindowsEventLogService
    {
        Task LogAsync(string message, EventLogEntryType type, int eventId, Exception? ex = null);
    }
}
