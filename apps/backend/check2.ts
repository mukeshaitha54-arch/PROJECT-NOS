const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.telemetrySnapshot.count({
    where: { deviceId: "c31ad257-181a-459f-a931-221b245eb996" },
  });
  console.log("Telemetry count:", count);
  const errs = await prisma.telemetrySnapshot.findMany({
    where: { deviceId: "c31ad257-181a-459f-a931-221b245eb996" },
    take: 1,
    orderBy: { timestamp: "desc" },
  });
  console.log("Latest:", errs);
}

main().finally(() => prisma.$disconnect());
