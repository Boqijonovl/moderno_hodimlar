import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const methods = ['Naqd', 'Plastik Karta', "Pul o'tkazma"];
  
  for (const name of methods) {
    await prisma.paymentMethod.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }
  
  console.log("Seeded payment methods.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
