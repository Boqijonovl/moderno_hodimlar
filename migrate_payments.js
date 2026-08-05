import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const sales = await prisma.sale.findMany({
    include: { payments: true }
  });

  let migrated = 0;

  for (const sale of sales) {
    // If it already has payments, skip
    if (sale.payments.length > 0) continue;

    if (sale.advance > 0) {
      // Determine the best method name based on legacy system
      let method = sale.paymentMethod;
      if (method === 'CASH') method = 'Naqd';
      if (method === 'CARD') method = 'Plastik Karta';
      if (method === 'INSTALLMENT') method = 'Naqd'; // Fallback for old avans

      await prisma.salePayment.create({
        data: {
          saleId: sale.id,
          method: method,
          amount: sale.advance,
          createdAt: sale.createdAt // Keep original date so it shows up in that day's report
        }
      });
      migrated++;
    }
  }

  console.log(`Migrated ${migrated} historical sales into SalePayment records.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
