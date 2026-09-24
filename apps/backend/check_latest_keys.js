const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const keys = await prisma.registrationKey.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  console.log("Latest Keys:", keys);
}

main().finally(() => prisma.$disconnect());
