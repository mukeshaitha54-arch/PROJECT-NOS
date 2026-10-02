namespace NOS.Agent.Services
{
    /// <summary>
    /// Thread-safe runtime state store for the agent.
    /// Reflects server-directed operational states without persisting to local config.
    /// </summary>
    public static class AgentRuntimeState
    {
        private static volatile bool _isTelemetryPaused = true;

        public static bool IsTelemetryPaused
        {
            get => _isTelemetryPaused;
            set => _isTelemetryPaused = value;
        }
    }
}
