const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
p.device
  .findMany()
  .then((d) => {
    console.log(d.map((x) => ({ id: x.id, name: x.hostname })));
  })
  .finally(() => p.$disconnect());
