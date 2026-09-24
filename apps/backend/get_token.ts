const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const d = await prisma.device.findUnique({
    where: { id: "c31ad257-181a-459f-a931-221b245eb996" },
  });
  if (d) {
    console.log(d.registrationToken);
  } else {
    console.log("Device not found in database");
  }
}

main().finally(() => prisma.$disconnect());
