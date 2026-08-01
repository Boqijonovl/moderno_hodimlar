import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Telegraf } from 'telegraf';

export async function POST(req: Request) {
  try {
    const { amount, reason, paymentMethod, telegramId, userId } = await req.json();

    if (!amount || !reason) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    let user;
    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
    } else if (telegramId) {
      user = await prisma.user.findUnique({ where: { telegramId: telegramId.toString() } });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.canUseExpenses) {
      return NextResponse.json({ error: 'Sizga xarajat kiritish ruxsat etilmagan' }, { status: 403 });
    }

    const parsedAmount = parseFloat(amount);

    const expense = await prisma.expense.create({
      data: {
        userId: user.id,
        amount: parsedAmount,
        reason,
        paymentMethod
      }
    });

    // Send notification to Admins
    try {
      if (process.env.BOT_TOKEN) {
        const bot = new Telegraf(process.env.BOT_TOKEN);
        const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
        
        let paymentName = paymentMethod === 'CASH' ? 'Naqd' : paymentMethod === 'CARD' ? 'Karta' : 'Karparativ';
        const message = `💸 <b>Yangi Xarajat!</b>\n\n👤 Xodim: ${user.name}\n📝 Izoh: ${reason}\n💰 Summa: <b>${parsedAmount.toLocaleString()} so'm</b>\n💳 To'lov turi: ${paymentName}`;

        for (const admin of admins) {
          if (admin.telegramId) {
            await bot.telegram.sendMessage(admin.telegramId, message, { parse_mode: 'HTML' }).catch(() => {});
          }
        }
      }
    } catch (e) {
      console.error('Failed to send expense notification', e);
    }

    return NextResponse.json({ success: true, expense });
  } catch (error: any) {
    console.error('Failed to create expense:', error);
    return NextResponse.json({ error: 'Failed to create expense: ' + error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const telegramId = searchParams.get('telegramId');

    if (!telegramId) {
      return NextResponse.json({ error: 'Missing telegramId' }, { status: 400 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const expenses = await prisma.expense.findMany({
      where: {
        user: { telegramId },
        createdAt: { gte: startOfMonth }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    });

    return NextResponse.json({ expenses });
  } catch (error) {
    console.error('Error fetching expenses history:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}
