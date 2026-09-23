using System;
using System.Collections.Generic;
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
        string ip = GetLocalIPAddress(out _, out _, out _);
        
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
        
        string ip = GetLocalIPAddress(out string mac, out string gateway, out string dns);

        // CPU
        double cpuUsage = _metricCollector.GetCpuUsage();
        var temps = _metricCollector.GetSystemTemperatures();
        double cpuTemp = temps.Count > 0 ? temps[0].Celsius : 0.0;
        
        // CPU Frequency & Physical Cores via WMI
        double cpuFrequency = 0.0;
        int logicalCores = Environment.ProcessorCount;
        int physicalCores = logicalCores;
        try
        {
            using var searcher = new ManagementObjectSearcher("SELECT CurrentClockSpeed, NumberOfCores, NumberOfLogicalProcessors FROM Win32_Processor");
            foreach (ManagementObject obj in searcher.Get())
            {
                if (obj["CurrentClockSpeed"] != null)
                    cpuFrequency = Convert.ToDouble(obj["CurrentClockSpeed"]) / 1000.0; // MHz -> GHz
                if (obj["NumberOfCores"] != null)
                    physicalCores = Convert.ToInt32(obj["NumberOfCores"]);
                if (obj["NumberOfLogicalProcessors"] != null)
                    logicalCores = Convert.ToInt32(obj["NumberOfLogicalProcessors"]);
                break;
            }
        }
        catch { }

        // Memory — use WMI Win32_OperatingSystem for real physical RAM values
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

        // Active TCP connections
        int activeConnections = 0;
        try
        {
            activeConnections = IPGlobalProperties.GetIPGlobalProperties().GetActiveTcpConnections().Length;
        }
        catch { }

        // Running Processes (real count)
        int runningProcesses = 0;
        try
        {
            runningProcesses = Process.GetProcesses().Length;
        }
        catch { }

        // Running Services via WMI
        int runningServices = 0;
        try
        {
            using var searcher = new ManagementObjectSearcher("SELECT Name FROM Win32_Service WHERE State='Running'");
            runningServices = searcher.Get().Count;
        }
        catch { }

        // Total bytes sent/received
        ulong bytesSent = 0;
        ulong bytesReceived = 0;
        try
        {
            foreach (var iface in NetworkInterface.GetAllNetworkInterfaces())
            {
                if (iface.OperationalStatus == OperationalStatus.Up &&
                    iface.NetworkInterfaceType != NetworkInterfaceType.Loopback &&
                    iface.NetworkInterfaceType != NetworkInterfaceType.Tunnel)
                {
                    var stats = iface.GetIPv4Statistics();
                    bytesSent += (ulong)stats.BytesSent;
                    bytesReceived += (ulong)stats.BytesReceived;
                }
            }
        }
        catch { }

        return new TelemetrySnapshotPayload(
            DeviceId: deviceId,
            CpuUsage: cpuUsage,
            CpuTemperature: cpuTemp,
            CpuFrequency: Math.Round(cpuFrequency, 2),
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
            BytesSent: bytesSent,
            BytesReceived: bytesReceived,
            ActiveConnections: activeConnections,
            RunningProcesses: runningProcesses,
            RunningServices: runningServices,
            SystemUptime: uptime,
            BootTime: bootTimeUtc.ToString("O"),
            IpAddress: ip,
            MacAddress: mac,
            Gateway: gateway,
            Dns: dns,
            Timestamp: DateTime.UtcNow.ToString("O")
        );
    }

    private string GetLocalIPAddress(out string macAddress, out string gateway, out string dns)
    {
        macAddress = "00:00:00:00:00:00";
        gateway = "0.0.0.0";
        dns = "8.8.8.8";
        string ipResult = "127.0.0.1";

        try
        {
            // Find the active adapter that has a gateway (i.e., the one actually connected to a network)
            foreach (var iface in NetworkInterface.GetAllNetworkInterfaces())
            {
                if (iface.OperationalStatus != OperationalStatus.Up) continue;
                if (iface.NetworkInterfaceType == NetworkInterfaceType.Loopback) continue;
                if (iface.NetworkInterfaceType == NetworkInterfaceType.Tunnel) continue;

                var props = iface.GetIPProperties();

                // Only pick interfaces that have a valid gateway — this is the real connected adapter
                var gw = props.GatewayAddresses
                    .Select(g => g.Address)
                    .FirstOrDefault(a => a.AddressFamily == AddressFamily.InterNetwork);

                if (gw == null) continue;
                gateway = gw.ToString();

                // MAC address
                try
                {
                    var macBytes = iface.GetPhysicalAddress().GetAddressBytes();
                    if (macBytes != null && macBytes.Length == 6)
                        macAddress = string.Join(":", macBytes.Select(b => b.ToString("X2")));
                }
                catch { }

                // DNS
                try
                {
                    var dnsAddr = props.DnsAddresses
                        .FirstOrDefault(a => a.AddressFamily == AddressFamily.InterNetwork);
                    if (dnsAddr != null) dns = dnsAddr.ToString();
                }
                catch { }

                // IPv4 address
                var unicast = props.UnicastAddresses
                    .FirstOrDefault(u => u.Address.AddressFamily == AddressFamily.InterNetwork
                                        && !IPAddress.IsLoopback(u.Address));
                if (unicast != null)
                {
                    ipResult = unicast.Address.ToString();
                }

                break; // Stop at first valid connected adapter
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Network adapter discovery failed.");
        }

        return ipResult;
    }
}
