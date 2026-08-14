import {
  PrismaClient,
  Role,
  DeviceStatus,
  DeviceClaimStatus,
  AlertSeverity,
  AlertStatus,
  AlertCategory,
  AlertRulePriority,
  AlertRuleCategory,
  AlertRuleStatus,
  AlertRuleScheduleMode,
  TimelineEventType,
  TimelineSeverity,
} from "@prisma/client";
import * as argon2 from "argon2";
import * as crypto from "crypto";

const prisma = new PrismaClient();

async function hashPassword(plainText: string): Promise<string> {
  return argon2.hash(plainText, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  });
}

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

async function main() {
  const startTime = Date.now();
  console.log("🌱 [NOS Seed] Starting database seed for reviewers...");

  // =========================================================================
  // 1. CLEAR EXISTING DATA (Ordered deletion to satisfy Foreign Keys)
  // =========================================================================
  console.log("🧹 [1/7] Cleaning existing demo records...");

  await prisma.notificationLog.deleteMany({});
  await prisma.alertComment.deleteMany({});
  await prisma.alertAssignment.deleteMany({});
  await prisma.alertEscalation.deleteMany({});
  await prisma.alertHistory.deleteMany({});
  await prisma.alertBreachState.deleteMany({});
  await prisma.alert.deleteMany({});
  await prisma.alertRuleAuditLog.deleteMany({});
  await prisma.alertRule.deleteMany({});

  await prisma.telemetryAggregation.deleteMany({});
  await prisma.telemetrySnapshot.deleteMany({});
  await prisma.heartbeat.deleteMany({});
  await prisma.deviceTimelineEvent.deleteMany({});
  await prisma.inventoryAuditLog.deleteMany({});

  await prisma.memoryModule.deleteMany({});
  await prisma.diskDrive.deleteMany({});
  await prisma.gpu.deleteMany({});
  await prisma.networkAdapter.deleteMany({});
  await prisma.installedSoftware.deleteMany({});
  await prisma.windowsService.deleteMany({});
  await prisma.startupApplication.deleteMany({});
  await prisma.securityInventory.deleteMany({});
  await prisma.deviceCapabilities.deleteMany({});
  await prisma.deviceInventory.deleteMany({});
  await prisma.deviceOwnership.deleteMany({});
  await prisma.maintenanceWindow.deleteMany({});
  await prisma.device.deleteMany({});

  await prisma.userSession.deleteMany({});
  await prisma.userActivity.deleteMany({});
  await prisma.verificationOtp.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.organizationMember.deleteMany({});
  await prisma.organizationInvitation.deleteMany({});
  await prisma.apiKey.deleteMany({});
  await prisma.registrationKey.deleteMany({});
  await prisma.organizationQuota.deleteMany({});
  await prisma.deviceGroup.deleteMany({});
  await prisma.smartGroup.deleteMany({});
  await prisma.permissionProfile.deleteMany({});
  await prisma.organizationWebhook.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.organization.deleteMany({});

  // =========================================================================
  // 2. SEED WORKSPACE ORGANIZATION & QUOTA
  // =========================================================================
  console.log("🏢 [2/7] Seeding Personal Workspace organization...");

  const org = await prisma.organization.upsert({
    where: { slug: "personal" },
    update: {},
    create: {
      id: "default-org",
      name: "Personal Workspace",
      slug: "personal",
      status: "ACTIVE",
      timezone: "UTC",
      locale: "en-US",
      companyName: "NOS Personal Lab",
      supportEmail: "support@nos.local",
      retentionDays: 90,
    },
  });

  await prisma.organizationQuota.upsert({
    where: { organizationId: org.id },
    update: {},
    create: {
      organizationId: org.id,
      maxDevices: 50,
      maxUsers: 10,
      maxApiKeys: 10,
      maxStorageMb: 2048,
      maxDailyTelemetry: 100000,
      maxDailyAlerts: 5000,
      currentDevices: 10,
      currentUsers: 2,
    },
  });

  // =========================================================================
  // 3. SEED USERS
  // =========================================================================
  console.log("👤 [3/7] Seeding Demo & Guest users...");

  const demoPassHash = await hashPassword("Demo@123456");
  const guestPassHash = await hashPassword("Guest@123456");

  const demoUser = await prisma.user.upsert({
    where: { email: "demo@nos.local" },
    update: {
      passwordHash: demoPassHash,
      role: Role.ADMIN,
      isEmailVerified: true,
    },
    create: {
      id: "usr-demo-admin-01",
      email: "demo@nos.local",
      passwordHash: demoPassHash,
      firstName: "Demo",
      lastName: "Admin",
      role: Role.ADMIN,
      isEmailVerified: true,
    },
  });

  const guestUser = await prisma.user.upsert({
    where: { email: "guest@nos.local" },
    update: {
      passwordHash: guestPassHash,
      role: Role.USER,
      isEmailVerified: true,
    },
    create: {
      id: "usr-guest-user-02",
      email: "guest@nos.local",
      passwordHash: guestPassHash,
      firstName: "Guest",
      lastName: "User",
      role: Role.USER,
      isEmailVerified: true,
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: demoUser.id,
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      userId: demoUser.id,
      role: "OWNER",
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: guestUser.id,
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      userId: guestUser.id,
      role: "OPERATOR",
    },
  });

  // =========================================================================
  // 4. SEED 10 REALISTIC HOME LAB DEVICES & INVENTORIES
  // =========================================================================
  console.log(
    "🖥️  [4/7] Seeding 10 Home Lab devices with deep hardware inventories...",
  );

  const rawDevices = [
    {
      id: "dev-desktop-it-01",
      uuid: "11111111-1111-4111-8111-111111111101",
      hostname: "DESKTOP-IT-01",
      deviceName: "IT Workstation",
      os: "Windows",
      osVersion: "11 Pro 23H2",
      arch: "x64",
      status: DeviceStatus.ONLINE,
      ip: "192.168.1.101",
      mac: "D8:BB:C1:22:A1:01",
      make: "Dell",
      model: "Dell OptiPlex",
      cpu: "12th Gen Intel(R) Core(TM) i7-12700",
      ramGb: 16,
      cores: 12,
      logical: 20,
      gpu: "Intel UHD Graphics 770",
    },
    {
      id: "dev-laptop-dev-02",
      uuid: "22222222-2222-4222-8222-222222222202",
      hostname: "LAPTOP-DEV-02",
      deviceName: "Developer MacBook",
      os: "macOS",
      osVersion: "14.4.1 Sonoma",
      arch: "arm64",
      status: DeviceStatus.ONLINE,
      ip: "192.168.1.102",
      mac: "F4:D4:88:55:B2:02",
      make: "Apple",
      model: "MacBook Pro M2",
      cpu: "Apple M2 Pro (12-Core)",
      ramGb: 16,
      cores: 12,
      logical: 12,
      gpu: "Apple M2 Pro Integrated GPU",
    },
    {
      id: "dev-server-home-03",
      uuid: "33333333-3333-4333-8333-333333333303",
      hostname: "SERVER-HOME-03",
      deviceName: "Home Compute Server",
      os: "Linux",
      osVersion: "Ubuntu 22.04.4 LTS",
      arch: "x64",
      status: DeviceStatus.ONLINE,
      ip: "192.168.1.103",
      mac: "00:1E:67:AA:C3:03",
      make: "HP",
      model: "HP ProLiant",
      cpu: "Intel(R) Xeon(R) Silver 4214 CPU @ 2.20GHz",
      ramGb: 32,
      cores: 12,
      logical: 24,
      gpu: "Matrox G200eH2 Integrated",
    },
    {
      id: "dev-nas-storage-04",
      uuid: "44444444-4444-4444-8444-444444444404",
      hostname: "NAS-STORAGE-04",
      deviceName: "Home Storage Pool",
      os: "TrueNAS",
      osVersion: "TrueNAS SCALE 23.10.1",
      arch: "x64",
      status: DeviceStatus.ONLINE,
      ip: "192.168.1.104",
      mac: "70:85:C2:FF:D4:04",
      make: "DIY",
      model: "DIY Storage Rig",
      cpu: "AMD Ryzen 5 5600G with Radeon Graphics",
      ramGb: 64,
      cores: 6,
      logical: 12,
      gpu: "AMD Radeon Vega 7 Integrated",
    },
    {
      id: "dev-pi-hole-05",
      uuid: "55555555-5555-4555-8555-555555555505",
      hostname: "PI-HOLE-05",
      deviceName: "Pi-hole DNS Guard",
      os: "Raspberry Pi OS",
      osVersion: "Debian 12 Bookworm",
      arch: "aarch64",
      status: DeviceStatus.ONLINE,
      ip: "192.168.1.105",
      mac: "DC:A6:32:99:E5:05",
      make: "Raspberry Pi Foundation",
      model: "Pi 4 Model B",
      cpu: "Broadcom BCM2711 Quad-Core Cortex-A72",
      ramGb: 4,
      cores: 4,
      logical: 4,
      gpu: "Broadcom VideoCore VI",
    },
    {
      id: "dev-laptop-sales-06",
      uuid: "66666666-6666-4666-8666-666666666606",
      hostname: "LAPTOP-SALES-06",
      deviceName: "Field Ops Laptop",
      os: "Windows",
      osVersion: "10 Pro 22H2",
      arch: "x64",
      status: DeviceStatus.OFFLINE,
      ip: "192.168.1.106",
      mac: "54:E1:AD:12:F6:06",
      make: "Lenovo",
      model: "Lenovo ThinkPad",
      cpu: "Intel Core i5-1135G7 @ 2.40GHz",
      ramGb: 8,
      cores: 4,
      logical: 8,
      gpu: "Intel Iris Xe Graphics",
    },
    {
      id: "dev-desktop-design-07",
      uuid: "77777777-7777-4777-8777-777777777707",
      hostname: "DESKTOP-DESIGN-07",
      deviceName: "Design & Render Workstation",
      os: "Windows",
      osVersion: "11 Pro",
      arch: "x64",
      status: DeviceStatus.DEGRADED,
      ip: "192.168.1.107",
      mac: "A4:B1:C2:77:88:07",
      make: "Custom",
      model: "Custom Builder",
      cpu: "AMD Ryzen 9 7900X 12-Core Processor",
      ramGb: 32,
      cores: 12,
      logical: 24,
      gpu: "NVIDIA GeForce RTX 4070",
    },
    {
      id: "dev-printer-office-08",
      uuid: "88888888-8888-4888-8888-888888888808",
      hostname: "PRINTER-OFFICE-08",
      deviceName: "Network Office Printer",
      os: "Embedded Linux",
      osVersion: "HP FutureSmart 5.7",
      arch: "arm",
      status: DeviceStatus.ONLINE,
      ip: "192.168.1.108",
      mac: "00:08:74:33:99:08",
      make: "HP",
      model: "HP LaserJet",
      cpu: "ARM Cortex-A9 Dual-Core 1.2GHz",
      ramGb: 0.512,
      cores: 2,
      logical: 2,
      gpu: "None",
    },
    {
      id: "dev-router-main-09",
      uuid: "99999999-9999-4999-8999-999999999909",
      hostname: "ROUTER-MAIN-09",
      deviceName: "Perimeter Gateway Router",
      os: "OpenWrt",
      osVersion: "OpenWrt 23.05",
      arch: "mips",
      status: DeviceStatus.ONLINE,
      ip: "192.168.1.1",
      mac: "98:DA:C4:00:11:09",
      make: "TP-Link",
      model: "TP-Link Archer",
      cpu: "MediaTek MT7622 Tri-Core",
      ramGb: 0.256,
      cores: 3,
      logical: 3,
      gpu: "None",
    },
    {
      id: "dev-vm-test-10",
      uuid: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa10",
      hostname: "VM-TEST-10",
      deviceName: "Sandbox Testing VM",
      os: "Ubuntu",
      osVersion: "Ubuntu 22.04 LTS",
      arch: "x64",
      status: DeviceStatus.MAINTENANCE,
      ip: "192.168.1.110",
      mac: "00:50:56:AB:CD:10",
      make: "VMware",
      model: "VMware VM",
      cpu: "Virtual CPU (4 Cores)",
      ramGb: 4,
      cores: 4,
      logical: 4,
      gpu: "VMware SVGA II Adapter",
    },
  ];

  const now = new Date();

  for (let i = 0; i < rawDevices.length; i++) {
    const d = rawDevices[i];
    const lastSeen =
      d.status === DeviceStatus.OFFLINE
        ? new Date(now.getTime() - 48 * 60 * 60 * 1000)
        : new Date(now.getTime() - 45 * 1000);

    const device = await prisma.device.upsert({
      where: { id: d.id },
      update: {},
      create: {
        id: d.id,
        uuid: d.uuid,
        hostname: d.hostname,
        deviceName: d.deviceName,
        name: d.deviceName,
        os: d.os,
        osVersion: d.osVersion,
        architecture: d.arch,
        agentVersion: "1.2.4",
        status: d.status,
        claimStatus: DeviceClaimStatus.CLAIMED,
        lastSeen,
        registeredAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
        organizationId: org.id,
        tenantId: org.id,
        tokenHash: sha256(`device-token-secret-${d.id}`),
      },
    });

    // Device Ownership
    await prisma.deviceOwnership.upsert({
      where: { deviceId: device.id },
      update: {},
      create: {
        deviceId: device.id,
        organizationId: org.id,
        ownerUserId: demoUser.id,
        environment:
          d.status === DeviceStatus.MAINTENANCE ? "Staging" : "Production",
        criticality:
          d.hostname.includes("SERVER") || d.hostname.includes("ROUTER")
            ? "High Priority"
            : "Standard",
        purpose: d.deviceName,
        tags: [d.os.toLowerCase(), d.arch, d.status.toLowerCase()],
      },
    });

    // Device Inventory
    const inv = await prisma.deviceInventory.upsert({
      where: { deviceId: device.id },
      update: {},
      create: {
        deviceId: device.id,
        hostname: d.hostname,
        manufacturer: d.make,
        model: d.model,
        serialNumber: `SN-${d.hostname}-992834`,
        cpuModel: d.cpu,
        cpuVendor: d.cpu.includes("Intel")
          ? "Intel"
          : d.cpu.includes("AMD")
            ? "AMD"
            : "Apple",
        physicalCores: d.cores,
        logicalCores: d.logical,
        architecture: d.arch,
        osEdition: d.osVersion,
        assetFingerprint: sha256(`fingerprint-${d.id}`),
      },
    });

    // Memory Modules
    await prisma.memoryModule.create({
      data: {
        deviceInventoryId: inv.id,
        slot: "DIMM_0",
        capacityBytes: Math.round(d.ramGb * 1024 * 1024 * 1024),
        speedMHz: 3200,
        manufacturer: "Crucial / Kingston",
        partNumber: `MEM-${Math.round(d.ramGb)}GB-DDR4`,
        serialNumber: `RAM-SN-${d.id.slice(0, 6)}`,
      },
    });

    // Disk Drives
    await prisma.diskDrive.create({
      data: {
        deviceInventoryId: inv.id,
        driveName: "NVMe SSD (Disk 0)",
        model: "Samsung 980 PRO 1TB",
        mediaType: "NVMe SSD",
        sizeBytes: 1024 * 1024 * 1024 * 1024,
        fileSystem:
          d.os === "Windows" ? "NTFS" : d.os === "macOS" ? "APFS" : "ext4",
        isSystemDrive: true,
      },
    });

    // GPU
    await prisma.gpu.create({
      data: {
        deviceInventoryId: inv.id,
        name: d.gpu,
        manufacturer: d.gpu.includes("NVIDIA")
          ? "NVIDIA"
          : d.gpu.includes("AMD")
            ? "AMD"
            : "Apple",
        vRamBytes: d.gpu.includes("RTX") ? 8 * 1024 * 1024 * 1024 : 0,
      },
    });

    // Network Adapter
    await prisma.networkAdapter.create({
      data: {
        deviceInventoryId: inv.id,
        name: "Primary Ethernet NIC",
        macAddress: d.mac,
        ipv4: d.ip,
        gateway: "192.168.1.1",
        dns: "1.1.1.1, 8.8.8.8",
        speedMbps: 1000,
        isPhysical: true,
        isOperational: d.status !== DeviceStatus.OFFLINE,
      },
    });

    // Security & Capabilities
    await prisma.securityInventory.create({
      data: {
        deviceInventoryId: inv.id,
        windowsDefenderEnabled: d.os === "Windows",
        firewallEnabled: true,
        bitLockerEnabled: d.os === "Windows",
        secureBootEnabled: true,
        tpmEnabled: true,
      },
    });

    await prisma.deviceCapabilities.create({
      data: {
        deviceInventoryId: inv.id,
        supportsGPU: d.gpu !== "None",
        supportsVirtualization: true,
        supportsDocker: true,
      },
    });

    console.log(`Seeding: ${i + 1}/10 devices (${d.hostname})`);
  }

  // =========================================================================
  // 5. SEED ALERT RULES (5)
  // =========================================================================
  console.log("🚨 [5/7] Seeding 5 Core Alert Rules...");

  const rulesData = [
    {
      id: "rule-cpu-critical",
      name: "High CPU > 85%",
      description:
        "Triggers when node CPU exceeds 85% utilization across multiple polling intervals.",
      metric: "cpuUsage",
      operator: ">",
      threshold: 85.0,
      durationSeconds: 120,
      severity: AlertSeverity.CRITICAL,
      priority: AlertRulePriority.CRITICAL,
      category: AlertRuleCategory.PERFORMANCE,
      enabled: true,
    },
    {
      id: "rule-ram-warning",
      name: "High RAM > 90%",
      description:
        "Alerts when available RAM drops below 10% (usage exceeds 90%).",
      metric: "memoryUsagePercent",
      operator: ">",
      threshold: 90.0,
      durationSeconds: 180,
      severity: AlertSeverity.HIGH,
      priority: AlertRulePriority.HIGH,
      category: AlertRuleCategory.PERFORMANCE,
      enabled: true,
    },
    {
      id: "rule-disk-critical",
      name: "Disk Full > 95%",
      description:
        "Critical warning when fixed storage volume reaches 95% capacity.",
      metric: "diskUsagePercent",
      operator: ">",
      threshold: 95.0,
      durationSeconds: 60,
      severity: AlertSeverity.CRITICAL,
      priority: AlertRulePriority.CRITICAL,
      category: AlertRuleCategory.SYSTEM,
      enabled: true,
    },
    {
      id: "rule-heartbeat-offline",
      name: "Device Offline > 10 min",
      description:
        "Emits warning when node fails to report heartbeat within SLA window.",
      metric: "heartbeat",
      operator: ">",
      threshold: 600.0,
      durationSeconds: 600,
      severity: AlertSeverity.MEDIUM,
      priority: AlertRulePriority.NORMAL,
      category: AlertRuleCategory.AVAILABILITY,
      enabled: true,
    },
    {
      id: "rule-temp-warning",
      name: "Thermal > 85°C",
      description: "Hardware thermal protection threshold warning.",
      metric: "cpuTemperature",
      operator: ">",
      threshold: 85.0,
      durationSeconds: 60,
      severity: AlertSeverity.MEDIUM,
      priority: AlertRulePriority.NORMAL,
      category: AlertRuleCategory.PERFORMANCE,
      enabled: true,
    },
  ];

  for (const r of rulesData) {
    await prisma.alertRule.upsert({
      where: {
        tenantId_name: {
          tenantId: org.id,
          name: r.name,
        },
      },
      update: {},
      create: {
        id: r.id,
        tenantId: org.id,
        name: r.name,
        description: r.description,
        metric: r.metric,
        operator: r.operator,
        threshold: r.threshold,
        durationSeconds: r.durationSeconds,
        severity: r.severity,
        priority: r.priority,
        category: r.category,
        enabled: r.enabled,
        ruleStatus: AlertRuleStatus.ACTIVE,
      },
    });
  }

  // =========================================================================
  // 6. SEED REALISTIC 30-DAY HOURLY TELEMETRY & 7-DAY AGGREGATIONS (1m, 15m, 1h, 1d)
  // =========================================================================
  console.log(
    "📊 [6/7] Generating 30 days of hourly telemetry (7,200 points) + aggregations...",
  );

  const totalDays = 30;
  const hoursCount = totalDays * 24; // 720 snapshots per device
  const telemetryRecords: any[] = [];
  const aggregationRecords: any[] = [];

  for (const d of rawDevices) {
    const isServer =
      d.hostname.includes("SERVER") ||
      d.hostname.includes("NAS") ||
      d.hostname.includes("ROUTER");

    for (let h = hoursCount; h >= 0; h--) {
      const pointTime = new Date(now.getTime() - h * 60 * 60 * 1000);
      const hourOfDay = pointTime.getUTCHours();
      const isDay = hourOfDay >= 8 && hourOfDay <= 20;

      // Realistic diurnal pattern: day=50-80%, night=10-30%
      let baseCpu = isDay ? 50 + Math.random() * 30 : 10 + Math.random() * 20;
      let baseRam = isDay ? 55 + Math.random() * 25 : 25 + Math.random() * 20;

      // Random spike above threshold for incident alerts
      let spike = h % 73 === 0 ? 35.0 : 0.0;

      let cpu = Math.min(99.0, Math.max(5.0, baseCpu + spike));
      let ram = Math.min(98.0, Math.max(15.0, baseRam + (spike > 0 ? 15 : 0)));
      let temp = isServer ? 42 + cpu * 0.3 : 38 + cpu * 0.4;
      let disk = Math.min(96.0, 45.0 + (hoursCount - h) * 0.015);
      let netDown = isDay ? 45.0 + Math.random() * 80 : 2.5 + Math.random() * 5;
      let netUp = isDay ? 15.0 + Math.random() * 30 : 0.8 + Math.random() * 2;

      telemetryRecords.push({
        id: `telem-${d.id}-${h}`,
        deviceId: d.id,
        cpuUsage: Math.round(cpu * 100) / 100,
        cpuTemperature: Math.round(temp * 10) / 10,
        cpuFrequency: 3.2,
        logicalProcessors: d.logical,
        physicalProcessors: d.cores,
        memoryUsed: Math.round(d.ramGb * (ram / 100.0) * 100) / 100,
        memoryFree: Math.round(d.ramGb * (1 - ram / 100.0) * 100) / 100,
        memoryTotal: d.ramGb,
        memoryUsagePercent: Math.round(ram * 100) / 100,
        diskReadSpeed: 12.4,
        diskWriteSpeed: 8.2,
        diskUsagePercent: Math.round(disk * 100) / 100,
        diskFree: 500 * (1 - disk / 100),
        diskTotal: 500,
        networkUploadSpeed: Math.round(netUp * 100) / 100,
        networkDownloadSpeed: Math.round(netDown * 100) / 100,
        bytesSent: netUp * 1024 * 1024,
        bytesReceived: netDown * 1024 * 1024,
        activeConnections: isServer ? 142 : 38,
        runningProcesses: isServer ? 220 : 165,
        runningServices: 88,
        systemUptime: 86400 * 14 + (hoursCount - h) * 3600,
        bootTime: new Date(
          now.getTime() - (86400 * 14 + (hoursCount - h) * 3600) * 1000,
        ),
        ipAddress: d.ip,
        macAddress: d.mac,
        timestamp: pointTime,
      });

      // 7-day aggregations for 1m, 15m, 1h, 1d buckets
      if (h <= 7 * 24) {
        aggregationRecords.push({
          deviceId: d.id,
          tenantId: org.id,
          tier: "1h",
          granularity: "1h",
          avgCpu: Math.round(cpu * 100) / 100,
          maxCpu: Math.round((cpu + 3) * 100) / 100,
          minCpu: Math.round(Math.max(1, cpu - 3) * 100) / 100,
          avgRam: Math.round(ram * 100) / 100,
          maxRam: Math.round((ram + 2) * 100) / 100,
          avgDisk: Math.round(disk * 100) / 100,
          avgNetwork: Math.round((netDown + netUp) * 100) / 100,
          sampleCount: 60,
          periodStart: pointTime,
          periodEnd: new Date(pointTime.getTime() + 3600 * 1000),
        });

        if (h % 24 === 0) {
          aggregationRecords.push({
            deviceId: d.id,
            tenantId: org.id,
            tier: "1d",
            granularity: "1d",
            avgCpu: Math.round(cpu * 100) / 100,
            maxCpu: Math.round((cpu + 5) * 100) / 100,
            minCpu: Math.round(Math.max(1, cpu - 5) * 100) / 100,
            avgRam: Math.round(ram * 100) / 100,
            maxRam: Math.round((ram + 4) * 100) / 100,
            avgDisk: Math.round(disk * 100) / 100,
            avgNetwork: Math.round((netDown + netUp) * 100) / 100,
            sampleCount: 1440,
            periodStart: pointTime,
            periodEnd: new Date(pointTime.getTime() + 86400 * 1000),
          });
        }
      }
    }
  }

  // Batch insert for < 30s performance
  await prisma.telemetrySnapshot.createMany({
    data: telemetryRecords,
    skipDuplicates: true,
  });

  await prisma.telemetryAggregation.createMany({
    data: aggregationRecords,
    skipDuplicates: true,
  });

  // =========================================================================
  // 7. SEED 15 REALISTIC ALERTS (Mix OPEN / RESOLVED / Varied Severities)
  // =========================================================================
  console.log("⚡ [7/7] Seeding 15 incident alerts across the last 30 days...");

  const alertTemplates = [
    {
      incidentNumber: "INC-000101",
      deviceIndex: 0,
      title: "CPU Thermal Throttle Exceeded",
      desc: "Package core reached 89.2°C during intensive build task.",
      metric: "cpuTemperature",
      val: 89.2,
      thresh: 85.0,
      sev: AlertSeverity.CRITICAL,
      status: AlertStatus.OPEN,
      cat: AlertCategory.TEMPERATURE,
      daysAgo: 1,
    },
    {
      incidentNumber: "INC-000102",
      deviceIndex: 3,
      title: "Storage Pool Degraded",
      desc: "Disk usage on /mnt/tank reached 96.4% of total capacity.",
      metric: "diskUsagePercent",
      val: 96.4,
      thresh: 95.0,
      sev: AlertSeverity.CRITICAL,
      status: AlertStatus.ACKNOWLEDGED,
      cat: AlertCategory.DISK,
      daysAgo: 2,
    },
    {
      incidentNumber: "INC-000103",
      deviceIndex: 5,
      title: "Agent Heartbeat Missed",
      desc: "Device did not send heartbeat within the expected 10-minute window.",
      metric: "heartbeat",
      val: 720.0,
      thresh: 600.0,
      sev: AlertSeverity.HIGH,
      status: AlertStatus.OPEN,
      cat: AlertCategory.HEARTBEAT,
      daysAgo: 2,
    },
    {
      incidentNumber: "INC-000104",
      deviceIndex: 6,
      title: "Rendering GPU Memory Spike",
      desc: "VRAM utilization hit 98% with 32GB system RAM saturated at 92.1%.",
      metric: "memoryUsagePercent",
      val: 92.1,
      thresh: 90.0,
      sev: AlertSeverity.HIGH,
      status: AlertStatus.OPEN,
      cat: AlertCategory.RAM,
      daysAgo: 3,
    },
    {
      incidentNumber: "INC-000105",
      deviceIndex: 2,
      title: "Sustained Docker Engine CPU Burst",
      desc: "Multi-tenant container build consumed 91.5% CPU over 5 consecutive minutes.",
      metric: "cpuUsage",
      val: 91.5,
      thresh: 85.0,
      sev: AlertSeverity.CRITICAL,
      status: AlertStatus.RESOLVED,
      cat: AlertCategory.CPU,
      daysAgo: 5,
    },
    {
      incidentNumber: "INC-000106",
      deviceIndex: 4,
      title: "DNS Query Rate Anomaly",
      desc: "Pi-hole processed 8,400 queries/min during network broadcast storm.",
      metric: "activeConnections",
      val: 8400,
      thresh: 5000,
      sev: AlertSeverity.MEDIUM,
      status: AlertStatus.RESOLVED,
      cat: AlertCategory.NETWORK,
      daysAgo: 8,
    },
    {
      incidentNumber: "INC-000107",
      deviceIndex: 1,
      title: "macOS Swap Memory Pressure Warning",
      desc: "System swap file expanded to 8GB due to unreleased local simulator processes.",
      metric: "memoryUsagePercent",
      val: 91.0,
      thresh: 90.0,
      sev: AlertSeverity.MEDIUM,
      status: AlertStatus.RESOLVED,
      cat: AlertCategory.RAM,
      daysAgo: 10,
    },
    {
      incidentNumber: "INC-000108",
      deviceIndex: 8,
      title: "Gateway WAN Ingress High Drop Rate",
      desc: "Router buffer exhaustion caused packet drop rate > 2.5% on eth0.",
      metric: "networkDownloadSpeed",
      val: 98.2,
      thresh: 90.0,
      sev: AlertSeverity.MEDIUM,
      status: AlertStatus.RESOLVED,
      cat: AlertCategory.NETWORK,
      daysAgo: 12,
    },
    {
      incidentNumber: "INC-000109",
      deviceIndex: 9,
      title: "VM Staging Sandbox Snapshot Locked",
      desc: "VMware snapshot operation held disk lock for > 180 seconds.",
      metric: "diskReadSpeed",
      val: 185.0,
      thresh: 150.0,
      sev: AlertSeverity.LOW,
      status: AlertStatus.RESOLVED,
      cat: AlertCategory.DISK,
      daysAgo: 15,
    },
    {
      incidentNumber: "INC-000110",
      deviceIndex: 0,
      title: "Windows Update Restart Required",
      desc: "Security rollup update requires host reboot to apply patch.",
      metric: "systemUptime",
      val: 28.0,
      thresh: 21.0,
      sev: AlertSeverity.INFO,
      status: AlertStatus.OPEN,
      cat: AlertCategory.SYSTEM,
      daysAgo: 18,
    },
    {
      incidentNumber: "INC-000111",
      deviceIndex: 7,
      title: "Print Spooler Buffer Depleted",
      desc: "Heavy batch printing document queue filled onboard RAM.",
      metric: "memoryUsagePercent",
      val: 88.5,
      thresh: 85.0,
      sev: AlertSeverity.LOW,
      status: AlertStatus.RESOLVED,
      cat: AlertCategory.SYSTEM,
      daysAgo: 20,
    },
    {
      incidentNumber: "INC-000112",
      deviceIndex: 2,
      title: "RAID Controller Battery Backup Self-Test",
      desc: "Periodic self-test completed with battery voltage nominal.",
      metric: "cpuTemperature",
      val: 42.0,
      thresh: 70.0,
      sev: AlertSeverity.INFO,
      status: AlertStatus.RESOLVED,
      cat: AlertCategory.SYSTEM,
      daysAgo: 22,
    },
    {
      incidentNumber: "INC-000113",
      deviceIndex: 3,
      title: "TrueNAS Parity Scrub Started",
      desc: "Monthly disk parity verification initiated across 8 spinning disks.",
      metric: "diskReadSpeed",
      val: 340.0,
      thresh: 300.0,
      sev: AlertSeverity.INFO,
      status: AlertStatus.RESOLVED,
      cat: AlertCategory.DISK,
      daysAgo: 25,
    },
    {
      incidentNumber: "INC-000114",
      deviceIndex: 6,
      title: "Blender GPU Out-of-Memory Warning",
      desc: "4K raytracing render allocated 11.8GB / 12GB VRAM.",
      metric: "memoryUsagePercent",
      val: 94.2,
      thresh: 90.0,
      sev: AlertSeverity.HIGH,
      status: AlertStatus.RESOLVED,
      cat: AlertCategory.RAM,
      daysAgo: 27,
    },
    {
      incidentNumber: "INC-000115",
      deviceIndex: 0,
      title: "System Drive Optimization Level High",
      desc: "SSD background TRIM scheduler triggered automatic optimization.",
      metric: "diskUsagePercent",
      val: 88.0,
      thresh: 85.0,
      sev: AlertSeverity.LOW,
      status: AlertStatus.RESOLVED,
      cat: AlertCategory.SYSTEM,
      daysAgo: 29,
    },
  ];

  for (const a of alertTemplates) {
    const targetDev = rawDevices[a.deviceIndex];
    const alertTime = new Date(now.getTime() - a.daysAgo * 24 * 60 * 60 * 1000);
    const isResolved = a.status === AlertStatus.RESOLVED;

    const alert = await prisma.alert.create({
      data: {
        incidentNumber: a.incidentNumber,
        tenantId: org.id,
        deviceId: targetDev.id,
        title: a.title,
        description: a.desc,
        message: a.desc,
        metric: a.metric,
        value: a.val,
        threshold: a.thresh,
        severity: a.sev,
        status: a.status,
        category: a.cat,
        source: "RuleEngine",
        fingerprint: sha256(`${targetDev.id}-${a.metric}-${a.incidentNumber}`),
        confidenceScore: "HIGH",
        riskScore:
          a.sev === AlertSeverity.CRITICAL
            ? 92
            : a.sev === AlertSeverity.HIGH
              ? 75
              : 40,
        firstOccurred: alertTime,
        lastOccurred: alertTime,
        createdAt: alertTime,
        acknowledgedBy:
          a.status === AlertStatus.ACKNOWLEDGED ? demoUser.email : null,
        acknowledgedAt:
          a.status === AlertStatus.ACKNOWLEDGED
            ? new Date(alertTime.getTime() + 15 * 60 * 1000)
            : null,
        resolvedAt: isResolved
          ? new Date(alertTime.getTime() + 2 * 60 * 60 * 1000)
          : null,
        assignedUserId: demoUser.id,
      },
    });

    // Alert History
    await prisma.alertHistory.create({
      data: {
        alertId: alert.id,
        action: "ALERT_CREATED",
        performedBy: "Engine",
        newValue: a.status,
        timestamp: alertTime,
      },
    });

    if (a.status === AlertStatus.ACKNOWLEDGED || isResolved) {
      await prisma.alertHistory.create({
        data: {
          alertId: alert.id,
          action: isResolved ? "ALERT_RESOLVED" : "ALERT_ACKNOWLEDGED",
          performedBy: demoUser.email,
          newValue: isResolved ? "RESOLVED" : "ACKNOWLEDGED",
          comment: isResolved
            ? "Automatic recovery confirmed via telemetry."
            : "Investigating threshold breach.",
          timestamp: new Date(alertTime.getTime() + 30 * 60 * 1000),
        },
      });
    }

    // Timeline event for device
    await prisma.deviceTimelineEvent.create({
      data: {
        deviceId: targetDev.id,
        eventType: isResolved
          ? TimelineEventType.ALERT_RESOLVED
          : TimelineEventType.ALERT_TRIGGERED,
        severity:
          a.sev === AlertSeverity.CRITICAL
            ? TimelineSeverity.CRITICAL
            : TimelineSeverity.WARNING,
        title: a.title,
        detail: a.desc,
        actorName: "AlertRuleEngine",
        timestamp: alertTime,
      },
    });
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(
    `\n🎉 [NOS Seed] Database successfully seeded in ${durationSec}s!`,
  );
  console.log(
    "---------------------------------------------------------------",
  );
  console.log("Credentials:");
  console.log("  • Admin: demo@nos.local / Demo@123456");
  console.log("  • User:  guest@nos.local / Guest@123456");
  console.log("Devices: 10 Home Lab devices seeded");
  console.log("Alert Rules: 5 Active Monitoring Rules");
  console.log(
    "Telemetry: 7,200 hourly snapshots (30 days) + 7 days aggregation",
  );
  console.log("Alerts: 15 incident records seeded");
  console.log(
    "---------------------------------------------------------------",
  );
}

main()
  .catch((e) => {
    console.error("❌ [NOS Seed Error]:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
