using NOS.Agent.Models;

namespace NOS.Agent.Services;

public interface ISystemDiagnosticsService
{
    RegisterDevicePayload GetRegistrationInfo(string stableUuid, string? registrationKey = null);
    HeartbeatPayload GetHeartbeatMetrics(string? deviceId = null);
    TelemetrySnapshotPayload GetTelemetrySnapshot(string? deviceId = null);
}
