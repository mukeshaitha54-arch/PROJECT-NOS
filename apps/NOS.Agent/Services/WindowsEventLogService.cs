using System;
using System.Diagnostics;
using System.Runtime.Versioning;

namespace NOS.Agent.Services
{
    [SupportedOSPlatform("windows")]
    public class WindowsEventLogService : IWindowsEventLogService
    {
        private const string SourceName = "NOS-Agent";

        public void WriteEvent(int eventId, string message, EventLogEntryType type)
        {
            try
            {
                EventLog.WriteEntry(SourceName, message, type, eventId);
            }
            catch
            {
                // Fallback or ignore if event log fails
            }
        }
    }
}
