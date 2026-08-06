using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Net.NetworkInformation;
using System.Runtime.InteropServices;
using Microsoft.Extensions.Logging;
using NOS.Agent.Models;
using System.Management;

namespace NOS.Agent.Services;

public class SystemDiagnosticsService : ISystemDiagnosticsService
{
    private readonly ILogger<SystemDiagnosticsService> _logger;
    private readonly IMetricCollector _metricCollector;

    public SystemDiagnosticsService(ILogger<SystemDiagnosticsService> logger, IMetricCollector metricCollector)
    {
        _logger = logger;
        _metricCollector = metricCollector;
    }

    public RegisterDevicePayload GetRegistrationInfo(string stableUuid, string? registrationKey = null)
    {
        var hostname = Environment.MachineName;
        var os = RuntimeInformation.OSDescription;
        var osVersion = Environment.OSVersion.Version.ToString();
        var arch = RuntimeInformation.ProcessArchitecture.ToString();

        return new RegisterDevicePayload(
            Uuid: stableUuid,
            Hostname: hostname,
            DeviceName: hostname,
            Os: os,
            OsVersion: osVersion,
            Architecture: arch,
            AgentVersion: "2.1.0",
            RegistrationKey: registrationKey
        );
    }

    public HeartbeatPayload GetHeartbeatMetrics(string? deviceId = null)
    {
        double uptime = Math.Round(TimeSpan.FromMilliseconds(Environment.TickCount64).TotalSeconds, 1);
        string ip = GetLocalIPAddress(out _);
        
        double cpuUsage = _metricCollector.GetCpuUsage();
        var memMetrics = _metricCollector.GetMemoryMetrics();

        return new HeartbeatPayload(
            DeviceId: deviceId,
            CpuUsage: cpuUsage,
            RamUsage: memMetrics.UsedPercentage,
            Uptime: uptime,
            IpAddress: ip,
            Timestamp: DateTime.UtcNow.ToString("O"),
            Hostname: Environment.MachineName,
            Os: RuntimeInformation.OSDescription
        );
    }

    public TelemetrySnapshotPayload GetTelemetrySnapshot(string? deviceId = null)
    {
        double uptime = Math.Round(TimeSpan.FromMilliseconds(Environment.TickCount64).TotalSeconds, 1);
        DateTime bootTimeUtc = DateTime.UtcNow.AddMilliseconds(-Environment.TickCount64);
        
        string ip = GetLocalIPAddress(out string mac);

        // CPU & Memory from collector
        double cpuUsage = _metricCollector.GetCpuUsage();
        var temps = _metricCollector.GetSystemTemperatures();
        double cpuTemp = temps.Count > 0 ? temps[0].Celsius : 0.0;
        
        double cpuFrequency = 0.0;
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            try
            {
                using var searcher = new ManagementObjectSearcher("SELECT CurrentClockSpeed FROM Win32_Processor");
                foreach (var obj in searcher.Get())
                {
                    if (obj["CurrentClockSpeed"] != null)
                    {
                        cpuFrequency = Convert.ToDouble(obj["CurrentClockSpeed"]);
                        break;
                    }
                }
            }
            catch { }
        }

        int logicalCores = Environment.ProcessorCount;
        int physicalCores = logicalCores; // Fallback
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            try
            {
                using var searcher = new ManagementObjectSearcher("SELECT NumberOfCores FROM Win32_Processor");
                foreach (var obj in searcher.Get())
                {
                    if (obj["NumberOfCores"] != null)
                    {
                        physicalCores = Convert.ToInt32(obj["NumberOfCores"]);
                        break;
                    }
                }
            }
            catch { }
        }

        var memMetrics = _metricCollector.GetMemoryMetrics();

        // Disk
        double diskTotal = 0;
        double diskFree = 0;
        try
        {
            foreach (var drive in DriveInfo.GetDrives().Where(d => d.IsReady && d.DriveType == DriveType.Fixed))
            {
                diskTotal += drive.TotalSize;
                diskFree += drive.TotalFreeSpace;
            }
        }
        catch { }

        double diskUsagePercent = diskTotal > 0 ? Math.Round(((diskTotal - diskFree) / diskTotal) * 100.0, 1) : 0;
        var diskThroughput = _metricCollector.GetDiskThroughput();
        var netThroughput = _metricCollector.GetNetworkThroughput();

        int activeConnections = 0;
        try
        {
            activeConnections = IPGlobalProperties.GetIPGlobalProperties().GetActiveTcpConnections().Length;
        }
        catch { }

        int runningProcesses = 0;
        try
        {
            runningProcesses = Process.GetProcesses().Length;
        }
        catch { }

        return new TelemetrySnapshotPayload(
            DeviceId: deviceId,
            CpuUsage: cpuUsage,
            CpuTemperature: cpuTemp,
            CpuFrequency: cpuFrequency,
            LogicalProcessors: logicalCores,
            PhysicalProcessors: physicalCores,
            MemoryUsed: memMetrics.UsedBytes,
            MemoryFree: Math.Max(0, memMetrics.TotalBytes - memMetrics.UsedBytes),
            MemoryTotal: memMetrics.TotalBytes,
            MemoryUsagePercent: memMetrics.UsedPercentage,
            DiskReadSpeed: Math.Round(diskThroughput.ReadBytesPerSec, 0),
            DiskWriteSpeed: Math.Round(diskThroughput.WriteBytesPerSec, 0),
            DiskUsagePercent: diskUsagePercent,
            DiskFree: diskFree,
            DiskTotal: diskTotal,
            NetworkUploadSpeed: Math.Max(0, netThroughput.UploadBytesPerSec),
            NetworkDownloadSpeed: Math.Max(0, netThroughput.DownloadBytesPerSec),
            BytesSent: 0,
            BytesReceived: 0,
            ActiveConnections: activeConnections,
            RunningProcesses: runningProcesses,
            SystemUptime: uptime,
            BootTime: bootTimeUtc.ToString("O"),
            IpAddress: ip,
            MacAddress: mac,
            Timestamp: DateTime.UtcNow.ToString("O")
        );
    }

    private string GetLocalIPAddress(out string macAddress)
    {
        macAddress = "00:00:00:00:00:00";
        try
        {
            foreach (var item in NetworkInterface.GetAllNetworkInterfaces())
            {
                if (item.OperationalStatus == OperationalStatus.Up && 
                    item.NetworkInterfaceType != NetworkInterfaceType.Loopback &&
                    item.NetworkInterfaceType != NetworkInterfaceType.Tunnel)
                {
                    try
                    {
                        var macBytes = item.GetPhysicalAddress().GetAddressBytes();
                        if (macBytes != null && macBytes.Length > 0)
                        {
                            macAddress = string.Join(":", macBytes.Select(b => b.ToString("X2")));
                        }
                    }
                    catch { }

                    var props = item.GetIPProperties();
                    foreach (var ip in props.UnicastAddresses)
                    {
                        if (ip.Address.AddressFamily == AddressFamily.InterNetwork)
                        {
                            return ip.Address.ToString();
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Could not discover primary network adapter IPv4/MAC address.");
        }
        return "127.0.0.1";
    }
}
