using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Microsoft.Extensions.Logging;

namespace NOS.Agent.Services;

public class LinuxMetricCollector : IMetricCollector
{
    private readonly ILogger<LinuxMetricCollector> _logger;
    private long _previousIdleTime = 0;
    private long _previousTotalTime = 0;

    public LinuxMetricCollector(ILogger<LinuxMetricCollector> logger)
    {
        _logger = logger;
    }

    public double GetCpuUsage()
    {
        try
        {
            if (!File.Exists("/proc/stat")) return 0.0;
            var line = File.ReadLines("/proc/stat").FirstOrDefault(l => l.StartsWith("cpu "));
            if (line == null) return 0.0;

            var parts = line.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length < 5) return 0.0;

            long user = long.Parse(parts[1]);
            long nice = long.Parse(parts[2]);
            long system = long.Parse(parts[3]);
            long idle = long.Parse(parts[4]);
            long iowait = parts.Length > 5 ? long.Parse(parts[5]) : 0;
            long irq = parts.Length > 6 ? long.Parse(parts[6]) : 0;
            long softirq = parts.Length > 7 ? long.Parse(parts[7]) : 0;

            long totalIdle = idle + iowait;
            long total = user + nice + system + totalIdle + irq + softirq;

            double diffIdle = totalIdle - _previousIdleTime;
            double diffTotal = total - _previousTotalTime;

            _previousIdleTime = totalIdle;
            _previousTotalTime = total;

            if (diffTotal <= 0) return 0.0;
            double usage = (1.0 - (diffIdle / diffTotal)) * 100.0;
            return Math.Min(100.0, Math.Max(0.0, Math.Round(usage, 1)));
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Failed reading Linux CPU metrics from /proc/stat");
            return 0.0;
        }
    }

    public MemoryMetricsDto GetMemoryMetrics()
    {
        try
        {
            if (!File.Exists("/proc/meminfo")) return new MemoryMetricsDto(0, 0, 0);
            var lines = File.ReadLines("/proc/meminfo");
            double totalKb = 0;
            double availableKb = 0;

            foreach (var line in lines)
            {
                if (line.StartsWith("MemTotal:"))
                {
                    totalKb = ParseMemInfoKb(line);
                }
                else if (line.StartsWith("MemAvailable:"))
                {
                    availableKb = ParseMemInfoKb(line);
                }
            }

            double totalBytes = totalKb * 1024;
            double availableBytes = availableKb * 1024;
            double usedBytes = Math.Max(0, totalBytes - availableBytes);
            double percentage = totalBytes > 0 ? Math.Round((usedBytes / totalBytes) * 100.0, 1) : 0.0;

            return new MemoryMetricsDto(percentage, totalBytes, usedBytes);
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Failed reading Linux RAM metrics from /proc/meminfo");
            return new MemoryMetricsDto(0, 0, 0);
        }
    }

    private double ParseMemInfoKb(string line)
    {
        var parts = line.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length >= 2 && double.TryParse(parts[1], out double val)) return val;
        return 0;
    }

    public DiskMetricsDto GetDiskThroughput()
    {
        return new DiskMetricsDto(0.0, 0.0);
    }

    public NetworkMetricsDto GetNetworkThroughput()
    {
        return new NetworkMetricsDto(0.0, 0.0);
    }

    public List<TemperatureDto> GetSystemTemperatures()
    {
        var list = new List<TemperatureDto>();
        try
        {
            var thermalZoneDir = "/sys/class/thermal";
            if (Directory.Exists(thermalZoneDir))
            {
                foreach (var zone in Directory.GetDirectories(thermalZoneDir, "thermal_zone*"))
                {
                    var tempFile = Path.Combine(zone, "temp");
                    var typeFile = Path.Combine(zone, "type");
                    if (File.Exists(tempFile) && File.Exists(typeFile))
                    {
                        string type = File.ReadAllText(typeFile).Trim();
                        if (double.TryParse(File.ReadAllText(tempFile).Trim(), out double tempMilli))
                        {
                            list.Add(new TemperatureDto(type, Math.Round(tempMilli / 1000.0, 1)));
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Failed reading sysfs thermal zones");
        }
        return list;
    }
}
