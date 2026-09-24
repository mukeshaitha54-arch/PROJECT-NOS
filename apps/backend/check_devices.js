const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const devices = await prisma.device.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  console.log(
    "Devices:",
    devices.map((d) => ({
      id: d.id,
      deviceName: d.deviceName,
      tenantId: d.tenantId,
      createdAt: d.createdAt,
      lastBeat: d.lastBeatAt,
    })),
  );

  const telemetry = await prisma.telemetrySnapshot.findMany({
    orderBy: { timestamp: "desc" },
    take: 5,
  });
  console.log("Telemetry count:", telemetry.length);
  if (telemetry.length > 0) {
    console.log(
      "Latest Telemetry:",
      telemetry.map((t) => ({
        id: t.id,
        deviceId: t.deviceId,
        timestamp: t.timestamp,
      })),
    );
  }
}

main().finally(() => prisma.$disconnect());
