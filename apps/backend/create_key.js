const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const crypto = require("crypto");

async function main() {
  const user = await prisma.user.findFirst();
  const org = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
  });

  const rawKey = "nos-reg-key-test-1234";
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  await prisma.registrationKey.create({
    data: {
      id: crypto.randomUUID(),
      organizationId: org.organizationId,
      displayName: "Test Key",
      keyHash: keyHash,
      keyPrefix: "nos-reg-****",
      createdBy: user.id,
      status: "ACTIVE",
      currentUses: 0,
      maxUses: 100,
    },
  });
  console.log("Created valid key for raw string: nos-reg-key-test-1234");
}

main().finally(() => prisma.$disconnect());
