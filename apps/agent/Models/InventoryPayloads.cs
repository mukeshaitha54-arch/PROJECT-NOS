using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace NOS.Agent.Models;

public record MemoryModuleDto(
    [property: JsonPropertyName("slot")] string? Slot,
    [property: JsonPropertyName("capacityBytes")] double CapacityBytes,
    [property: JsonPropertyName("speedMHz")] int SpeedMHz,
    [property: JsonPropertyName("manufacturer")] string? Manufacturer,
    [property: JsonPropertyName("partNumber")] string? PartNumber,
    [property: JsonPropertyName("serialNumber")] string? SerialNumber
);

public record DiskDriveDto(
    [property: JsonPropertyName("driveName")] string? DriveName,
    [property: JsonPropertyName("model")] string? Model,
    [property: JsonPropertyName("serialNumber")] string? SerialNumber,
    [property: JsonPropertyName("mediaType")] string? MediaType,
    [property: JsonPropertyName("sizeBytes")] double SizeBytes,
    [property: JsonPropertyName("fileSystem")] string? FileSystem,
    [property: JsonPropertyName("isSystemDrive")] bool IsSystemDrive
);

public record GpuDto(
    [property: JsonPropertyName("name")] string? Name,
    [property: JsonPropertyName("manufacturer")] string? Manufacturer,
    [property: JsonPropertyName("driverVersion")] string? DriverVersion,
    [property: JsonPropertyName("vRamBytes")] double VRamBytes,
    [property: JsonPropertyName("resolution")] string? Resolution
);

public record NetworkAdapterDto(
    [property: JsonPropertyName("name")] string? Name,
    [property: JsonPropertyName("description")] string? Description,
    [property: JsonPropertyName("macAddress")] string? MacAddress,
    [property: JsonPropertyName("ipv4")] string? Ipv4,
    [property: JsonPropertyName("ipv6")] string? Ipv6,
    [property: JsonPropertyName("gateway")] string? Gateway,
    [property: JsonPropertyName("dns")] string? Dns,
    [property: JsonPropertyName("speedMbps")] double SpeedMbps,
    [property: JsonPropertyName("isWireless")] bool IsWireless,
    [property: JsonPropertyName("isPhysical")] bool IsPhysical,
    [property: JsonPropertyName("isOperational")] bool IsOperational
);

public record InstalledSoftwareDto(
    [property: JsonPropertyName("name")] string? Name,
    [property: JsonPropertyName("publisher")] string? Publisher,
    [property: JsonPropertyName("version")] string? Version,
    [property: JsonPropertyName("installDate")] string? InstallDate,
    [property: JsonPropertyName("installLocation")] string? InstallLocation = null,
    [property: JsonPropertyName("size")] int? Size = null
);

public record WindowsServiceDto(
    [property: JsonPropertyName("serviceName")] string? ServiceName,
    [property: JsonPropertyName("displayName")] string? DisplayName,
    [property: JsonPropertyName("status")] string? Status,
    [property: JsonPropertyName("startType")] string? StartType,
    [property: JsonPropertyName("account")] string? Account
);

public record StartupApplicationDto(
    [property: JsonPropertyName("name")] string? Name,
    [property: JsonPropertyName("command")] string? Command,
    [property: JsonPropertyName("location")] string? Location,
    [property: JsonPropertyName("user")] string? User
);

public record SecurityInventoryDto(
    [property: JsonPropertyName("windowsDefenderEnabled")] bool WindowsDefenderEnabled,
    [property: JsonPropertyName("firewallEnabled")] bool FirewallEnabled,
    [property: JsonPropertyName("bitLockerEnabled")] bool BitLockerEnabled,
    [property: JsonPropertyName("secureBootEnabled")] bool SecureBootEnabled,
    [property: JsonPropertyName("tpmEnabled")] bool TpmEnabled,
    [property: JsonPropertyName("bitLockerDrive")] string? BitLockerDrive = null,
    [property: JsonPropertyName("tpmVersion")] string? TpmVersion = null
);

public record DeviceCapabilitiesDto(
    [property: JsonPropertyName("supportsGPU")] bool SupportsGPU,
    [property: JsonPropertyName("supportsBattery")] bool SupportsBattery,
    [property: JsonPropertyName("supportsTPM")] bool SupportsTPM,
    [property: JsonPropertyName("supportsVirtualization")] bool SupportsVirtualization,
    [property: JsonPropertyName("supportsDocker")] bool SupportsDocker,
    [property: JsonPropertyName("supportsWSL")] bool SupportsWSL,
    [property: JsonPropertyName("supportsWiFi")] bool SupportsWiFi,
    [property: JsonPropertyName("supportsEthernet")] bool SupportsEthernet,
    [property: JsonPropertyName("virtualMachineDetection")] bool VirtualMachineDetection,
    [property: JsonPropertyName("vmVendor")] string? VmVendor = null
);

public record SubmitInventoryPayload(
    [property: JsonPropertyName("manufacturer")] string? Manufacturer,
    [property: JsonPropertyName("model")] string? Model,
    [property: JsonPropertyName("serialNumber")] string? SerialNumber,
    [property: JsonPropertyName("motherboard")] string? Motherboard,
    [property: JsonPropertyName("biosVendor")] string? BiosVendor,
    [property: JsonPropertyName("biosVersion")] string? BiosVersion,
    [property: JsonPropertyName("cpuModel")] string? CpuModel,
    [property: JsonPropertyName("cpuVendor")] string? CpuVendor,
    [property: JsonPropertyName("physicalCores")] int PhysicalCores,
    [property: JsonPropertyName("logicalCores")] int LogicalCores,
    [property: JsonPropertyName("hostname")] string? Hostname,
    [property: JsonPropertyName("osEdition")] string? OsEdition,
    [property: JsonPropertyName("osBuild")] string? OsBuild,
    [property: JsonPropertyName("architecture")] string? Architecture,
    [property: JsonPropertyName("memoryModules")] List<MemoryModuleDto> MemoryModules,
    [property: JsonPropertyName("diskDrives")] List<DiskDriveDto> DiskDrives,
    [property: JsonPropertyName("gpus")] List<GpuDto> Gpus,
    [property: JsonPropertyName("networkAdapters")] List<NetworkAdapterDto> NetworkAdapters,
    [property: JsonPropertyName("installedSoftware")] List<InstalledSoftwareDto> InstalledSoftware,
    [property: JsonPropertyName("windowsServices")] List<WindowsServiceDto> WindowsServices,
    [property: JsonPropertyName("startupApplications")] List<StartupApplicationDto> StartupApplications,
    [property: JsonPropertyName("security")] SecurityInventoryDto Security,
    [property: JsonPropertyName("capabilities")] DeviceCapabilitiesDto Capabilities,
    [property: JsonPropertyName("deviceId")] string? DeviceId = null,
    [property: JsonPropertyName("domain")] string? Domain = null,
    [property: JsonPropertyName("workgroup")] string? Workgroup = null,
    [property: JsonPropertyName("biosReleaseDate")] string? BiosReleaseDate = null,
    [property: JsonPropertyName("agentVersion")] string? AgentVersion = null,
    [property: JsonPropertyName("schemaVersion")] string? SchemaVersion = null
);
