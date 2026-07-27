import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Telegraf } from 'telegraf';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { categoryId, itemName, price, paymentMethod, telegramId } = body;

    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const sale = await prisma.sale.create({
      data: {
        userId: user.id,
        categoryId,
        itemName,
        price,
        paymentMethod,
      },
      include: { category: true }
    });

    // Send notification to all Admins
    try {
      if (process.env.BOT_TOKEN) {
        const bot = new Telegraf(process.env.BOT_TOKEN);
        const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
        
        const message = `🟢 <b>Yangi Savdo!</b>\n\n👤 Xodim: ${user.name}\n🏷 Mebel: ${itemName} (${sale.category.name})\n💰 Narxi: ${price.toLocaleString()} so'm\n💳 To'lov turi: ${paymentMethod === 'CASH' ? 'Naqd' : paymentMethod === 'CARD' ? 'Karta' : 'Muddatli'}`;

        for (const admin of admins) {
          if (admin.telegramId) {
            await bot.telegram.sendMessage(admin.telegramId, message, { parse_mode: 'HTML' }).catch(() => {});
          }
        }
      }
    } catch (e) {
      console.error('Failed to send notification', e);
    }
    return NextResponse.json(sale);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create sale' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const sales = await prisma.sale.findMany({
      include: { user: true, category: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(sales);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}
