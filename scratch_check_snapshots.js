const {
  PrismaClient,
} = require("/app/node_modules/.pnpm/@prisma+client@6.19.3_prisma@6.19.3_typescript@5.9.3__typescript@5.9.3/node_modules/@prisma/client");
const p = new PrismaClient();
p.telemetrySnapshot
  .findMany({
    select: { id: true, deviceId: true, timestamp: true },
    orderBy: { timestamp: "desc" },
    take: 10,
  })
  .then((r) => {
    console.log("Latest snapshots count:", r.length);
    console.log("Snapshots:", r);
  })
  .finally(() => p.$disconnect());
