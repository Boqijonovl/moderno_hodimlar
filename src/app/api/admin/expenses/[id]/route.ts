import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Telegraf } from 'telegraf';

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { id } = params;

    const expense = await prisma.expense.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    await prisma.expense.delete({
      where: { id }
    });

    // Record in Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'DELETE_EXPENSE',
        entity: 'Expense',
        entityId: id,
        details: JSON.stringify({
          amount: expense.amount,
          reason: expense.reason,
          paymentMethod: expense.paymentMethod,
          user: expense.user?.name
        }),
        user: expense.user?.name || 'Admin'
      }
    });

    // Send Telegram alert to all Admins
    try {
      if (process.env.BOT_TOKEN) {
        const bot = new Telegraf(process.env.BOT_TOKEN);
        const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
        
        const now = new Date();
        const timeStr = now.toLocaleTimeString('uz-UZ', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' });
        const dateStr = now.toLocaleDateString('uz-UZ', { timeZone: 'Asia/Tashkent', day: 'numeric', month: 'long' });

        const alertMessage = 
`⚠️ <b>DIQQAT! XARAJAT O'CHIRILDI!</b>

👤 <b>Mas'ul xodim:</b> ${expense.user?.name || 'Noma\'lum'}
💸 <b>O'chirilgan summa:</b> -${expense.amount.toLocaleString()} so'm
📝 <b>Sababi:</b> ${expense.reason}
💳 <b>To'lov usuli:</b> ${expense.paymentMethod}
⏰ <b>Vaqti:</b> ${dateStr}, soat ${timeStr}

<i>Ushbu o'chirish harakati Kassa Audit tizimida saqlandi.</i>`;

        for (const admin of admins) {
          if (admin.telegramId) {
            await bot.telegram.sendMessage(admin.telegramId, alertMessage, { parse_mode: 'HTML' }).catch(() => {});
          }
        }
      }
    } catch (botErr) {
      console.error('Audit Telegram alert failed for expense:', botErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
