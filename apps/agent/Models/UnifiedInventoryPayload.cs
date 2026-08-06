using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace NOS.Agent.Models;

public record InventoryPayload(
    [property: JsonPropertyName("hardware")] HardwarePayload Hardware,
    [property: JsonPropertyName("software")] List<SoftwarePayload> Software,
    [property: JsonPropertyName("os")] OsPayload Os,
    [property: JsonPropertyName("collectedAt")] DateTime CollectedAt
);

public record HardwarePayload(
    [property: JsonPropertyName("cpu")] List<CpuPayload> Cpu,
    [property: JsonPropertyName("motherboard")] List<MotherboardPayload> Motherboard,
    [property: JsonPropertyName("memory")] List<MemoryPayload> Memory,
    [property: JsonPropertyName("storage")] StoragePayload Storage,
    [property: JsonPropertyName("network")] List<NetworkPayload> Network,
    [property: JsonPropertyName("gpu")] List<GpuPayload> Gpu,
    [property: JsonPropertyName("bios")] List<BiosPayload> Bios,
    [property: JsonPropertyName("computerSystem")] ComputerSystemPayload? ComputerSystem = null
);

public record StoragePayload(
    [property: JsonPropertyName("physicalDrives")] List<DiskDrivePayload> PhysicalDrives,
    [property: JsonPropertyName("logicalDrives")] List<LogicalDiskPayload> LogicalDrives
);

public record CpuPayload(
    [property: JsonPropertyName("name")] string? Name,
    [property: JsonPropertyName("numberOfCores")] int? NumberOfCores,
    [property: JsonPropertyName("numberOfLogicalProcessors")] int? NumberOfLogicalProcessors,
    [property: JsonPropertyName("maxClockSpeed")] int? MaxClockSpeed,
    [property: JsonPropertyName("manufacturer")] string? Manufacturer
);

public record MotherboardPayload(
    [property: JsonPropertyName("manufacturer")] string? Manufacturer,
    [property: JsonPropertyName("product")] string? Product,
    [property: JsonPropertyName("version")] string? Version
);

public record MemoryPayload(
    [property: JsonPropertyName("capacity")] ulong? Capacity,
    [property: JsonPropertyName("speed")] int? Speed,
    [property: JsonPropertyName("manufacturer")] string? Manufacturer,
    [property: JsonPropertyName("partNumber")] string? PartNumber
);

public record DiskDrivePayload(
    [property: JsonPropertyName("model")] string? Model,
    [property: JsonPropertyName("size")] ulong? Size,
    [property: JsonPropertyName("interfaceType")] string? InterfaceType,
    [property: JsonPropertyName("mediaType")] string? MediaType,
    [property: JsonPropertyName("serialNumber")] string? SerialNumber
);

public record LogicalDiskPayload(
    [property: JsonPropertyName("deviceId")] string? DeviceId,
    [property: JsonPropertyName("size")] ulong? Size,
    [property: JsonPropertyName("freeSpace")] ulong? FreeSpace,
    [property: JsonPropertyName("fileSystem")] string? FileSystem,
    [property: JsonPropertyName("volumeName")] string? VolumeName
);

public record NetworkPayload(
    [property: JsonPropertyName("macAddress")] string? MacAddress,
    [property: JsonPropertyName("ipAddress")] List<string>? IpAddress,
    [property: JsonPropertyName("defaultIPGateway")] List<string>? DefaultIPGateway,
    [property: JsonPropertyName("dnsDomain")] string? DnsDomain,
    [property: JsonPropertyName("dhcpEnabled")] bool? DhcpEnabled
);

public record GpuPayload(
    [property: JsonPropertyName("name")] string? Name,
    [property: JsonPropertyName("adapterRAM")] ulong? AdapterRAM,
    [property: JsonPropertyName("videoProcessor")] string? VideoProcessor,
    [property: JsonPropertyName("driverVersion")] string? DriverVersion
);

public record BiosPayload(
    [property: JsonPropertyName("manufacturer")] string? Manufacturer,
    [property: JsonPropertyName("name")] string? Name,
    [property: JsonPropertyName("version")] string? Version,
    [property: JsonPropertyName("serialNumber")] string? SerialNumber,
    [property: JsonPropertyName("releaseDate")] string? ReleaseDate
);

public record ComputerSystemPayload(
    [property: JsonPropertyName("manufacturer")] string? Manufacturer,
    [property: JsonPropertyName("model")] string? Model,
    [property: JsonPropertyName("systemType")] string? SystemType,
    [property: JsonPropertyName("totalPhysicalMemory")] ulong? TotalPhysicalMemory,
    [property: JsonPropertyName("numberOfProcessors")] int? NumberOfProcessors
);

public record SoftwarePayload(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("version")] string? Version,
    [property: JsonPropertyName("publisher")] string? Publisher,
    [property: JsonPropertyName("installDate")] string? InstallDate,
    [property: JsonPropertyName("size")] int? Size,
    [property: JsonPropertyName("installLocation")] string? InstallLocation = null
);

public record OsPayload(
    [property: JsonPropertyName("name")] string? Name,
    [property: JsonPropertyName("version")] string? Version,
    [property: JsonPropertyName("architecture")] string? Architecture,
    [property: JsonPropertyName("lastBoot")] string? LastBoot,
    [property: JsonPropertyName("installDate")] string? InstallDate,
    [property: JsonPropertyName("updates")] List<WindowsUpdatePayload> Updates,
    [property: JsonPropertyName("caption")] string? Caption = null,
    [property: JsonPropertyName("buildNumber")] string? BuildNumber = null,
    [property: JsonPropertyName("serialNumber")] string? SerialNumber = null
);

public record WindowsUpdatePayload(
    [property: JsonPropertyName("hotFixId")] string? HotFixId,
    [property: JsonPropertyName("installedOn")] string? InstalledOn
);
