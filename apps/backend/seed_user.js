const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await argon2.hash('admin');
  
  const user = await prisma.user.upsert({
    where: { email: 'admin@nos.dev' },
    update: { passwordHash },
    create: {
      email: 'admin@nos.dev',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'SUPER_ADMIN',
      isEmailVerified: true
    }
  });

  console.log('User created:', user.email);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
