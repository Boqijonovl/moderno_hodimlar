import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Telegraf } from 'telegraf';

// This endpoint is meant to be called by a CRON job
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.BOT_TOKEN) {
      return NextResponse.json({ error: 'BOT_TOKEN is not configured' }, { status: 500 });
    }

    const bot = new Telegraf(process.env.BOT_TOKEN);
    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'attendance';

    let sentCount = 0;

    if (type === 'attendance') {
      const users = await prisma.user.findMany({
        where: { role: { not: 'ADMIN' }, isActive: true }
      });
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const attendances = await prisma.attendance.findMany({
        where: { date: { gte: today } }
      });

      const checkedInUserIds = new Set(attendances.map(a => a.userId));

      for (const user of users) {
        if (!checkedInUserIds.has(user.id) && user.telegramId) {
          try {
            await bot.telegram.sendMessage(
              user.telegramId,
              `⏰ <b>Xayrli tong, ${user.name}!</b>\n\nIshga kelishni va davomatdan o'tishni unutmadingizmi? Ilovaga kirib o'z vaqtida davomatdan o'ting!`,
              { parse_mode: 'HTML' }
            );
            sentCount++;
          } catch (e) {
            console.error(`Failed to send reminder to ${user.name}`, e);
          }
        }
      }
    } else if (type === 'orders') {
      const activeOrders = await prisma.order.findMany({
        where: { status: { not: 'COMPLETED' } },
        include: {
          assignedTo: true,
          createdBy: true
        }
      });

      const userOrdersMap = new Map();

      activeOrders.forEach(order => {
        // Assignee
        if (order.assignedTo && order.assignedTo.telegramId) {
          if (!userOrdersMap.has(order.assignedTo.telegramId)) {
            userOrdersMap.set(order.assignedTo.telegramId, []);
          }
          userOrdersMap.get(order.assignedTo.telegramId).push({ ...order, role: 'assignee' });
        }

        // Creator (if different from assignee)
        if (order.createdBy && order.createdBy.telegramId && order.createdBy.telegramId !== order.assignedTo?.telegramId) {
          if (!userOrdersMap.has(order.createdBy.telegramId)) {
            userOrdersMap.set(order.createdBy.telegramId, []);
          }
          userOrdersMap.get(order.createdBy.telegramId).push({ ...order, role: 'creator' });
        }
      });

      for (const [telegramId, orders] of userOrdersMap.entries()) {
        let msg = `📦 <b>Jarayondagi buyurtmalar eslatmasi!</b>\n\n`;
        orders.forEach((o: any, i: number) => {
          const dStr = o.deadline ? new Date(o.deadline).toLocaleDateString('uz-UZ') : 'Noma\'lum';
          const role = o.role === 'assignee' ? "Sizga biriktirilgan" : 'Siz yaratgan';
          msg += `${i+1}. <b>${o.name}</b> (Muddat: ${dStr})\n   Holati: ${o.status === 'PENDING' ? 'Kutilmoqda' : 'Jarayonda'} [${role}]\n`;
        });
        await bot.telegram.sendMessage(telegramId, msg, { parse_mode: 'HTML' }).catch(() => {});
        sentCount++;
      }
    }

    return NextResponse.json({ success: true, sentCount, type });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to send reminders' }, { status: 500 });
  }
}
