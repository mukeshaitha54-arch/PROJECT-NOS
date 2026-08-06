using System;
using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;

namespace NOS.Agent.Services
{
    public class CollectorSchedulerService : ICollectorSchedulerService
    {
        private class CollectorState
        {
            public DateTime LastRun { get; set; } = DateTime.MinValue;
            public int FailureCount { get; set; } = 0;
            public DateTime DisabledUntil { get; set; } = DateTime.MinValue;
        }

        private readonly ILogger<CollectorSchedulerService> _logger;
        private readonly ConcurrentDictionary<string, CollectorState> _states = new ConcurrentDictionary<string, CollectorState>();
        private const int MaxConsecutiveFailures = 5;
        private static readonly TimeSpan CircuitBreakerCooldown = TimeSpan.FromMinutes(2);

        public CollectorSchedulerService(ILogger<CollectorSchedulerService> logger)
        {
            _logger = logger;
        }

        public bool ShouldRun(string collectorName, CollectorPriority priority)
        {
            var state = _states.GetOrAdd(collectorName, _ => new CollectorState());

            // Circuit breaker check
            if (DateTime.UtcNow < state.DisabledUntil)
            {
                return false;
            }

            var intervalSeconds = (int)priority;
            if ((DateTime.UtcNow - state.LastRun).TotalSeconds >= intervalSeconds)
            {
                state.LastRun = DateTime.UtcNow;
                return true;
            }

            return false;
        }

        public void RecordSuccess(string collectorName)
        {
            if (_states.TryGetValue(collectorName, out var state))
            {
                state.FailureCount = 0;
            }
        }

        public void RecordFailure(string collectorName, Exception ex)
        {
            var state = _states.GetOrAdd(collectorName, _ => new CollectorState());
            state.FailureCount++;

            _logger.LogWarning($"[CollectorScheduler] Collector '{collectorName}' failed ({state.FailureCount}/{MaxConsecutiveFailures}): {ex.Message}");

            if (state.FailureCount >= MaxConsecutiveFailures)
            {
                state.DisabledUntil = DateTime.UtcNow.Add(CircuitBreakerCooldown);
                _logger.LogError($"[CollectorScheduler] Circuit breaker OPENED for '{collectorName}'. Paused for {CircuitBreakerCooldown.TotalMinutes} minutes.");
            }
        }

        public bool IsCircuitOpen(string collectorName)
        {
            if (_states.TryGetValue(collectorName, out var state))
            {
                return DateTime.UtcNow < state.DisabledUntil;
            }
            return false;
        }
    }
}
