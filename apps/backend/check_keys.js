const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const regKeys = await prisma.registrationKey.findMany();
  console.log("Keys:", regKeys);
}

main().finally(() => prisma.$disconnect());
