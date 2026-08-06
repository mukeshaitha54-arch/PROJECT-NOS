using System;
using System.Diagnostics;
using System.Runtime.Versioning;
using System.Threading.Tasks;

namespace NOS.Agent.Services
{
    [SupportedOSPlatform("windows")]
    public class WindowsEventLogService : IWindowsEventLogService
    {
        private const string SourceName = "NOS-Agent";
        private const string LogName = "Application";

        public WindowsEventLogService()
        {
            EnsureEventLogSource();
        }

        private void EnsureEventLogSource()
        {
            try
            {
                if (!EventLog.SourceExists(SourceName))
                {
                    EventLog.CreateEventSource(SourceName, LogName);
                }
            }
            catch
            {
                // Might fail if not running as admin/LocalSystem, ignore or handle appropriately
            }
        }

        public Task LogAsync(string message, EventLogEntryType type, int eventId, Exception? ex = null)
        {
            try
            {
                var fullMessage = message;
                if (ex != null)
                {
                    fullMessage += $"\n\nException: {ex.GetType().Name}\n{ex.Message}\n{ex.StackTrace}";
                }

                EventLog.WriteEntry(SourceName, fullMessage, type, eventId);
            }
            catch
            {
                // Fallback or ignore if event log fails
            }

            return Task.CompletedTask;
        }
    }
}
