const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst();
  if (!org) {
    console.log("No organization found. Please create one.");
    return;
  }

  const plainKey = "NOS-TEST-1234-5678-ABCD";
  const keyHash = crypto.createHash("sha256").update(plainKey).digest("hex");

  const key = await prisma.registrationKey.create({
    data: {
      keyPrefix: "NOS-TEST-1234********",
      keyHash: keyHash,
      displayName: "E2E Test Key",
      maxUses: 10,
      currentUses: 0,
      expiresAt: new Date(Date.now() + 86400000),
      organizationId: org.id,
      status: "ACTIVE",
      createdBy: "test-user",
      totalGenerated: 1,
      failedAttempts: 0,
      devicesCreated: 0,
    },
  });

  console.log(`Created key ID: ${key.id}`);
  console.log(`PLAIN KEY TO USE: ${plainKey}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
