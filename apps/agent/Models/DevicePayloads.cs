using System.Text.Json.Serialization;

namespace NOS.Agent.Models;

public record RegisterDevicePayload(
    [property: JsonPropertyName("uuid")] string Uuid,
    [property: JsonPropertyName("hostname")] string Hostname,
    [property: JsonPropertyName("deviceName")] string DeviceName,
    [property: JsonPropertyName("os")] string Os,
    [property: JsonPropertyName("osVersion")] string OsVersion,
    [property: JsonPropertyName("architecture")] string Architecture,
    [property: JsonPropertyName("agentVersion")] string AgentVersion,
    [property: JsonPropertyName("organizationId")] string? OrganizationId = null
);

public record RegisterDeviceData(
    [property: JsonPropertyName("deviceId")] string DeviceId,
    [property: JsonPropertyName("registrationToken")] string RegistrationToken
);

public record ApiResponse<T>(
    [property: JsonPropertyName("success")] bool Success,
    [property: JsonPropertyName("message")] string Message,
    [property: JsonPropertyName("data")] T Data
);

public record HeartbeatPayload(
    [property: JsonPropertyName("deviceId")] string? DeviceId,
    [property: JsonPropertyName("cpuUsage")] double CpuUsage,
    [property: JsonPropertyName("ramUsage")] double RamUsage,
    [property: JsonPropertyName("uptime")] double Uptime,
    [property: JsonPropertyName("ipAddress")] string IpAddress,
    [property: JsonPropertyName("timestamp")] string Timestamp,
    [property: JsonPropertyName("hostname")] string? Hostname,
    [property: JsonPropertyName("os")] string? Os
);

public record TokenCredentials(
    [property: JsonPropertyName("deviceId")] string DeviceId,
    [property: JsonPropertyName("registrationToken")] string RegistrationToken,
    [property: JsonPropertyName("registeredAt")] string RegisteredAt
);

// =========================================================
// PHASE 2B: TELEMETRY COLLECTION PAYLOADS & RESPONSES
// =========================================================

public record TelemetrySnapshotPayload(
    [property: JsonPropertyName("deviceId")] string? DeviceId,
    [property: JsonPropertyName("cpuUsage")] double CpuUsage,
    [property: JsonPropertyName("cpuTemperature")] double CpuTemperature,
    [property: JsonPropertyName("cpuFrequency")] double CpuFrequency,
    [property: JsonPropertyName("logicalProcessors")] int LogicalProcessors,
    [property: JsonPropertyName("physicalProcessors")] int PhysicalProcessors,
    [property: JsonPropertyName("memoryUsed")] double MemoryUsed,
    [property: JsonPropertyName("memoryFree")] double MemoryFree,
    [property: JsonPropertyName("memoryTotal")] double MemoryTotal,
    [property: JsonPropertyName("memoryUsagePercent")] double MemoryUsagePercent,
    [property: JsonPropertyName("diskReadSpeed")] double DiskReadSpeed,
    [property: JsonPropertyName("diskWriteSpeed")] double DiskWriteSpeed,
    [property: JsonPropertyName("diskUsagePercent")] double DiskUsagePercent,
    [property: JsonPropertyName("diskFree")] double DiskFree,
    [property: JsonPropertyName("diskTotal")] double DiskTotal,
    [property: JsonPropertyName("networkUploadSpeed")] double NetworkUploadSpeed,
    [property: JsonPropertyName("networkDownloadSpeed")] double NetworkDownloadSpeed,
    [property: JsonPropertyName("bytesSent")] double BytesSent,
    [property: JsonPropertyName("bytesReceived")] double BytesReceived,
    [property: JsonPropertyName("activeConnections")] int ActiveConnections,
    [property: JsonPropertyName("runningProcesses")] int RunningProcesses,
    [property: JsonPropertyName("systemUptime")] double SystemUptime,
    [property: JsonPropertyName("bootTime")] string BootTime,
    [property: JsonPropertyName("ipAddress")] string IpAddress,
    [property: JsonPropertyName("macAddress")] string MacAddress,
    [property: JsonPropertyName("timestamp")] string Timestamp
);

public record SubmitTelemetryResponseData(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("deviceId")] string DeviceId,
    [property: JsonPropertyName("timestamp")] string Timestamp
);
