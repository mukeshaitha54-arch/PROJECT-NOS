const {
  PrismaClient,
} = require("/app/node_modules/.pnpm/@prisma+client@6.19.3_prisma@6.19.3_typescript@5.9.3__typescript@5.9.3/node_modules/@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const devices = await prisma.device.findMany({
    include: {
      inventory: {
        include: {
          _count: {
            select: {
              installedSoftware: true,
              windowsServices: true,
              startupApplications: true,
            },
          },
        },
      },
    },
  });

  console.log(
    JSON.stringify(
      devices.map((d) => ({
        id: d.id,
        uuid: d.uuid,
        hostname: d.hostname,
        status: d.status,
        hasInventory: !!d.inventory,
        softwareCount: d.inventory ? d.inventory._count.installedSoftware : 0,
        servicesCount: d.inventory ? d.inventory._count.windowsServices : 0,
        startupCount: d.inventory ? d.inventory._count.startupApplications : 0,
        lastSeen: d.lastSeen,
      })),
      null,
      2,
    ),
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
