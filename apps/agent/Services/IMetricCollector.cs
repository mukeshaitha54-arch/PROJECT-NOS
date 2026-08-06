using System;
using System.Collections.Generic;

namespace NOS.Agent.Services;

public record MemoryMetricsDto(double UsedPercentage, double TotalBytes, double UsedBytes);
public record DiskMetricsDto(double ReadBytesPerSec, double WriteBytesPerSec);
public record NetworkMetricsDto(double UploadBytesPerSec, double DownloadBytesPerSec);
public record TemperatureDto(string SensorName, double Celsius);

public interface IMetricCollector
{
    double GetCpuUsage();
    MemoryMetricsDto GetMemoryMetrics();
    DiskMetricsDto GetDiskThroughput();
    NetworkMetricsDto GetNetworkThroughput();
    List<TemperatureDto> GetSystemTemperatures();
}
