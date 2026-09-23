import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const c1 = await prisma.windowsService.count();
  const c2 = await prisma.installedSoftware.count();
  console.log({ services: c1, software: c2 });
}
main().finally(() => prisma.$disconnect());
