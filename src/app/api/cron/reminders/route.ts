import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Telegraf } from 'telegraf';

// This endpoint is meant to be called by a CRON job (e.g. Vercel Cron) at 09:00 every day
export async function GET(req: Request) {
  try {
    // Basic security check (Optional: verify cron secret if you use Vercel)
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.BOT_TOKEN) {
      return NextResponse.json({ error: 'BOT_TOKEN is not configured' }, { status: 500 });
    }

    const bot = new Telegraf(process.env.BOT_TOKEN);
    
    // Get all non-admin users
    const users = await prisma.user.findMany({
      where: { role: { not: 'ADMIN' }, isActive: true }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendances = await prisma.attendance.findMany({
      where: {
        date: { gte: today }
      }
    });

    const checkedInUserIds = new Set(attendances.map(a => a.userId));
    let sentCount = 0;

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

    return NextResponse.json({ success: true, sentCount });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to send reminders' }, { status: 500 });
  }
}
