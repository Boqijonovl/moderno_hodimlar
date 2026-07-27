import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Telegraf } from 'telegraf';

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { id } = params;

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { user: true, items: true }
    });

    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    if (sale.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Bu savdo allaqachon yakunlangan' }, { status: 400 });
    }

    const paidBalance = sale.balance;

    const updatedSale = await prisma.sale.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        advance: sale.totalPrice,
        balance: 0
      }
    });

    try {
      if (process.env.BOT_TOKEN) {
        const bot = new Telegraf(process.env.BOT_TOKEN);
        const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
        
        let itemsText = sale.items.map((item: any) => `- ${item.name}`).join('\n');
        
        const message = `🟢 <b>Qarz to'landi!</b>\n\n👤 Xodim: ${sale.user.name}\n\n🛍 <b>Sotilgan tovarlar:</b>\n${itemsText}\n\n💰 To'langan qarz summasi: <b>${paidBalance.toLocaleString()} so'm</b>`;

        for (const admin of admins) {
          if (admin.telegramId) {
            await bot.telegram.sendMessage(admin.telegramId, message, { parse_mode: 'HTML' }).catch(() => {});
          }
        }
      }
    } catch (e) {
      console.error('Failed to send debt payment notification', e);
    }

    return NextResponse.json(updatedSale);
  } catch (error: any) {
    console.error('Error completing sale:', error);
    return NextResponse.json({ error: 'Failed to complete sale' }, { status: 500 });
  }
}
