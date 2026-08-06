using System;
using System.Collections.Generic;
using Microsoft.Extensions.Logging;

namespace NOS.Agent.Services;

/// <summary>
/// Deterministic replayable metrics collector strictly for CI/CD automated acceptance tests and local dry-runs.
/// Contains zero random generators or unpredictable jitter per Zero Guess / Zero Mock rules.
/// </summary>
public class SimulationMetricCollector : IMetricCollector
{
    private readonly ILogger<SimulationMetricCollector> _logger;
    private int _cycleCount = 0;

    public SimulationMetricCollector(ILogger<SimulationMetricCollector> logger)
    {
        _logger = logger;
    }

    public double GetCpuUsage()
    {
        _cycleCount++;
        // Deterministic oscillating wave between 15% and 65% across 10 sample ticks
        double baseUsage = 15.0 + ((_cycleCount % 10) * 5.0);
        return Math.Round(baseUsage, 1);
    }

    public MemoryMetricsDto GetMemoryMetrics()
    {
        double totalBytes = 16UL * 1024 * 1024 * 1024; // Standard 16GB profile
        double usedBytes = 8UL * 1024 * 1024 * 1024;   // Steady 50% utilization
        return new MemoryMetricsDto(50.0, totalBytes, usedBytes);
    }

    public DiskMetricsDto GetDiskThroughput()
    {
        return new DiskMetricsDto(10240.0, 5120.0); // Constant deterministic 10KB/s read, 5KB/s write
    }

    public NetworkMetricsDto GetNetworkThroughput()
    {
        return new NetworkMetricsDto(2560.0, 102400.0); // Constant deterministic 2.5KB/s up, 100KB/s down
    }

    public List<TemperatureDto> GetSystemTemperatures()
    {
        return new List<TemperatureDto>
        {
            new TemperatureDto("Simulation-Core-0", 45.5),
            new TemperatureDto("Simulation-Chassis", 32.0)
        };
    }
}
