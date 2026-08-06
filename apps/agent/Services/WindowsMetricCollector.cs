using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Management;
using Microsoft.Extensions.Logging;

namespace NOS.Agent.Services;

public class WindowsMetricCollector : IMetricCollector, IDisposable
{
    private readonly ILogger<WindowsMetricCollector> _logger;
    private readonly PerformanceCounter? _cpuCounter;
    private readonly PerformanceCounter? _ramCounter;
    private readonly PerformanceCounter? _diskReadCounter;
    private readonly PerformanceCounter? _diskWriteCounter;
    private bool _disposed;

    private ulong _lastRxBytes;
    private ulong _lastTxBytes;
    private DateTime _lastNetworkSampleTime = DateTime.MinValue;
    private readonly object _networkLock = new object();

    public WindowsMetricCollector(ILogger<WindowsMetricCollector> logger)
    {
        _logger = logger;
        try
        {
            if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            {
                _cpuCounter = new PerformanceCounter("Processor Information", "% Processor Utility", "_Total", true);
                _ramCounter = new PerformanceCounter("Memory", "Available MBytes", true);
                _diskReadCounter = new PerformanceCounter("PhysicalDisk", "Disk Read Bytes/sec", "_Total", true);
                _diskWriteCounter = new PerformanceCounter("PhysicalDisk", "Disk Write Bytes/sec", "_Total", true);

                // Initial samples
                _cpuCounter.NextValue();
                _diskReadCounter?.NextValue();
                _diskWriteCounter?.NextValue();
                
                // Take initial base sample for network throughput delta calculation
                GetNetworkThroughput();
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to initialize Windows Performance Counters or Network telemetry. Verify telemetry permissions.");
        }
    }

    public double GetCpuUsage()
    {
        if (_cpuCounter == null) return 0.0;
        try
        {
            double val = _cpuCounter.NextValue();
            return Math.Min(100.0, Math.Max(0.0, Math.Round(val, 1)));
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Error reading CPU usage performance counter.");
            return 0.0;
        }
    }

    public MemoryMetricsDto GetMemoryMetrics()
    {
        try
        {
            var gcMemoryInfo = GC.GetGCMemoryInfo();
            double totalBytes = gcMemoryInfo.TotalAvailableMemoryBytes;
            if (totalBytes <= 0)
            {
                totalBytes = 16UL * 1024 * 1024 * 1024;
            }

            double availableBytes = 0;
            if (_ramCounter != null)
            {
                availableBytes = _ramCounter.NextValue() * 1024 * 1024;
            }
            else
            {
                availableBytes = totalBytes * 0.4;
            }

            double usedBytes = Math.Max(0, totalBytes - availableBytes);
            double percentage = Math.Min(100.0, Math.Max(0.0, Math.Round((usedBytes / totalBytes) * 100.0, 1)));

            return new MemoryMetricsDto(percentage, totalBytes, usedBytes);
        }
        catch
        {
            return new MemoryMetricsDto(0.0, 16UL * 1024 * 1024 * 1024, 0.0);
        }
    }

    public DiskMetricsDto GetDiskThroughput()
    {
        double readSpeed = 0.0;
        double writeSpeed = 0.0;
        try
        {
            if (_diskReadCounter != null) readSpeed = Math.Round(_diskReadCounter.NextValue(), 1);
            if (_diskWriteCounter != null) writeSpeed = Math.Round(_diskWriteCounter.NextValue(), 1);
        }
        catch
        {
            // Ignore temporary counter read lock errors
        }
        return new DiskMetricsDto(readSpeed, writeSpeed);
    }

    public NetworkMetricsDto GetNetworkThroughput()
    {
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            return new NetworkMetricsDto(0.0, 0.0);
        }

        lock (_networkLock)
        {
            try
            {
                ulong currentRxBytes = 0;
                ulong currentTxBytes = 0;

                // WMI Query Win32_PerfRawData_Tcpip_NetworkInterface aggregates cumulative upload and download byte counters across all active host adapters
                using (var searcher = new ManagementObjectSearcher("SELECT BytesReceivedPersec, BytesSentPersec FROM Win32_PerfRawData_Tcpip_NetworkInterface"))
                {
                    foreach (ManagementObject obj in searcher.Get())
                    {
                        if (obj["BytesReceivedPersec"] != null && ulong.TryParse(obj["BytesReceivedPersec"].ToString(), out ulong rx))
                        {
                            currentRxBytes += rx;
                        }
                        if (obj["BytesSentPersec"] != null && ulong.TryParse(obj["BytesSentPersec"].ToString(), out ulong tx))
                        {
                            currentTxBytes += tx;
                        }
                    }
                }

                var now = DateTime.UtcNow;
                if (_lastNetworkSampleTime == DateTime.MinValue || now <= _lastNetworkSampleTime)
                {
                    _lastRxBytes = currentRxBytes;
                    _lastTxBytes = currentTxBytes;
                    _lastNetworkSampleTime = now;
                    return new NetworkMetricsDto(0.0, 0.0);
                }

                double elapsedSeconds = (now - _lastNetworkSampleTime).TotalSeconds;
                double downloadBytesPerSec = currentRxBytes >= _lastRxBytes ? (currentRxBytes - _lastRxBytes) / elapsedSeconds : 0.0;
                double uploadBytesPerSec = currentTxBytes >= _lastTxBytes ? (currentTxBytes - _lastTxBytes) / elapsedSeconds : 0.0;

                _lastRxBytes = currentRxBytes;
                _lastTxBytes = currentTxBytes;
                _lastNetworkSampleTime = now;

                return new NetworkMetricsDto(Math.Round(uploadBytesPerSec, 2), Math.Round(downloadBytesPerSec, 2));
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Failed to query real-time network throughput via Win32_PerfRawData_Tcpip_NetworkInterface.");
                return new NetworkMetricsDto(0.0, 0.0);
            }
        }
    }

    public List<TemperatureDto> GetSystemTemperatures()
    {
        var sensors = new List<TemperatureDto>();
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            try
            {
                // WMI Query MSAcpi_ThermalZoneTemperature via \root\wmi reports system hardware thermal readings in tenths of Kelvin
                using var searcher = new ManagementObjectSearcher(@"root\wmi", "SELECT CurrentTemperature, InstanceName FROM MSAcpi_ThermalZoneTemperature");
                foreach (ManagementObject obj in searcher.Get())
                {
                    if (obj["CurrentTemperature"] != null && double.TryParse(obj["CurrentTemperature"].ToString(), out double tenthsKelvin))
                    {
                        double celsius = Math.Round((tenthsKelvin / 10.0) - 273.15, 1);
                        string sensorName = obj["InstanceName"]?.ToString() ?? "ThermalZone";
                        sensors.Add(new TemperatureDto(sensorName, celsius));
                    }
                }
            }
            catch
            {
                // Thermal zone querying in \root\wmi requires elevated privileges and OEM BIOS ACPI support
            }
        }
        return sensors;
    }

    public void Dispose()
    {
        if (_disposed) return;
        _cpuCounter?.Dispose();
        _ramCounter?.Dispose();
        _diskReadCounter?.Dispose();
        _diskWriteCounter?.Dispose();
        _disposed = true;
        GC.SuppressFinalize(this);
    }
}
