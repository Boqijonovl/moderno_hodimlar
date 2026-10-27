import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Telegraf } from 'telegraf';

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { amount, method, user: bodyUser } = await req.json();

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
    if (isNaN(payAmount) || payAmount <= 0) {
      return NextResponse.json({ error: 'Noto\'g\'ri to\'lov summasi' }, { status: 400 });
    }

    if (payAmount > sale.balance) {
      return NextResponse.json({
        error: `To'lov summasi (${payAmount.toLocaleString()} so'm) mavjud qarzdan (${sale.balance.toLocaleString()} so'm) ko'p bo'lishi mumkin emas!`
      }, { status: 400 });
    }

    const cleanMethod = typeof method === 'string' ? method.trim() : 'Naqd';

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
            method: cleanMethod,
            amount: payAmount
          }
        }
      },
      include: { items: true, payments: true, user: true }
    });

    // Record AuditLog
    try {
      await prisma.auditLog.create({
        data: {
          action: 'PAY_DEBT',
          entity: 'Sale',
          entityId: sale.id,
          user: bodyUser || sale.user?.name || 'Tizim',
          details: `Qarz to'lovi: ${payAmount.toLocaleString()} so'm (${cleanMethod}). Qolgan qarz: ${newBalance.toLocaleString()} so'm (Mijoz: ${sale.customerName || sale.customerPhone || 'Noma\'lum'})`
        }
      });
    } catch (auditErr) {
      console.error('AuditLog error:', auditErr);
    }

    try {
      if (process.env.BOT_TOKEN) {
        const bot = new Telegraf(process.env.BOT_TOKEN);
        const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
        const dateStr = new Date(sale.createdAt).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' });
        const itemsList = updatedSale.items.map((i: any) => `- ${i.name}`).join('\n');
        
        const customerText = sale.customerName || sale.customerPhone 
          ? `\n👤 Mijoz: <b>${sale.customerName || ''}</b> ${sale.customerPhone ? `(<code>${sale.customerPhone}</code>)` : ''}`
          : '';

        const message = `💸 <b>Qarz to'landi!</b>\n\n👤 Xodim: ${sale.user.name}${customerText}\n📅 Asl savdo vaqti: <b>${dateStr}</b>\n🛍 <b>Tovarlar:</b>\n${itemsList}\n\n💰 Jami savdo summasi: <b>${sale.totalPrice.toLocaleString()} so'm</b>\n✅ Hozir to'landi: <b>${payAmount.toLocaleString()} so'm</b> (${cleanMethod})\n⚠️ Qolgan qarz: <b>${newBalance.toLocaleString()} so'm</b>`;
        
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
