const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const telegramId = "1037362053";
  
  const user = await prisma.user.upsert({
    where: { telegramId: telegramId },
    update: { role: 'ADMIN' },
    create: {
      telegramId: telegramId,
      name: 'Admin',
      role: 'ADMIN'
    }
  });

  console.log("Admin user created/updated:", user);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
