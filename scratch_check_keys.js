const {
  PrismaClient,
} = require("/app/node_modules/.pnpm/@prisma+client@6.19.3_prisma@6.19.3_typescript@5.9.3__typescript@5.9.3/node_modules/@prisma/client");
const p = new PrismaClient();
p.registrationKey
  .findMany({
    select: {
      id: true,
      keyPrefix: true,
      status: true,
      currentUses: true,
      maxUses: true,
      expiresAt: true,
    },
  })
  .then((keys) => console.log("Keys:", keys))
  .finally(() => p.$disconnect());
