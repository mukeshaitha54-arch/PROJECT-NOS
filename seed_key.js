const { PrismaClient } = require('./apps/backend/node_modules/@prisma/client');

async function seedKey() {
  const prisma = new PrismaClient();
  
  // Create or connect organization
  const org = await prisma.organization.upsert({
    where: { id: 'org-enterprise-alpha' },
    update: {},
    create: {
      id: 'org-enterprise-alpha',
      name: 'Enterprise Alpha (Seeded)',
      slug: 'enterprise-alpha-seeded'
    }
  });
  
  // Upsert the test registration key
  await prisma.registrationKey.upsert({
    where: { keyHash: '31aa303567cb69c2a1957f079d2d333bcd9001af50cc7d9a26e7c0881e281d02' },
    update: {},
    create: {
      organizationId: org.id,
      displayName: 'Test Registration Key',
      keyHash: '31aa303567cb69c2a1957f079d2d333bcd9001af50cc7d9a26e7c0881e281d02',
      keyPrefix: 'nos-reg-key-********',
      status: 'ACTIVE',
      maxUses: 100,
      currentUses: 0,
      createdBy: 'system',
    }
  });

  console.log('Test key seeded successfully!');
  await prisma.$disconnect();
}

seedKey().catch(console.error);
