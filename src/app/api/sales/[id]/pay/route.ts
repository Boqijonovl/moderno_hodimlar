import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Telegraf } from 'telegraf';

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { amount, method } = await req.json();

    if (!amount || !method) {
      return NextResponse.json({ error: 'Missing amount or method' }, { status: 400 });
    }

    const sale = await prisma.sale.findUnique({
      where: { id: params.id },
      include: { user: true, items: true }
    });

    if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    if (sale.status === 'COMPLETED') return NextResponse.json({ error: 'Sale is already completed' }, { status: 400 });

    const payAmount = parseFloat(amount);
    if (payAmount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });

    const newAdvance = sale.advance + payAmount;
    const newBalance = Math.max(0, sale.totalPrice - newAdvance);
    const newStatus = newBalance > 0 ? 'INCOMPLETE' : 'COMPLETED';

    const updatedSale = await prisma.sale.update({
      where: { id: params.id },
      data: {
        advance: newAdvance,
        balance: newBalance,
        status: newStatus,
        payments: {
          create: {
            method,
            amount: payAmount
          }
        }
      },
      include: { items: true, payments: true }
    });

    try {
      if (process.env.BOT_TOKEN) {
        const bot = new Telegraf(process.env.BOT_TOKEN);
        const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
        const dateStr = new Date(sale.createdAt).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' });
        const itemsList = updatedSale.items.map((i:any) => `- ${i.name}`).join('\n');
        
        const message = `💸 <b>Qarz to'landi!</b>\n\n👤 Xodim: ${sale.user.name}\n📅 Asl savdo vaqti: <b>${dateStr}</b>\n🛍 <b>Tovarlar:</b>\n${itemsList}\n\n💰 Jami savdo summasi: <b>${sale.totalPrice.toLocaleString()} so'm</b>\n✅ Hozir to'landi: <b>${payAmount.toLocaleString()} so'm</b> (${method})\n⚠️ Qolgan qarz: <b>${newBalance.toLocaleString()} so'm</b>`;
        
        for (const admin of admins) {
          if (admin.telegramId) {
            await bot.telegram.sendMessage(admin.telegramId, message, { parse_mode: 'HTML' }).catch(() => {});
          }
        }
      }
    } catch (e) {}

    return NextResponse.json(updatedSale);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to add payment: ' + error.message }, { status: 500 });
  }
}
