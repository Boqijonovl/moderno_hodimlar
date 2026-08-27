import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Telegraf } from 'telegraf';

export async function POST(req: Request) {
  try {
    const { targetTelegramId, adminTelegramId } = await req.json();

    if (!targetTelegramId || !adminTelegramId) {
      return NextResponse.json({ error: 'Missing IDs' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { telegramId: targetTelegramId } });
    
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (process.env.BOT_TOKEN) {
      const bot = new Telegraf(process.env.BOT_TOKEN);
      
      const msg = `👤 <b>${targetUser.name}</b> profiliga o'tish uchun quyidagi ssilkaga bosing:\n\n👉 <a href="tg://user?id=${targetTelegramId}">Profilni ochish</a>`;
      
      await bot.telegram.sendMessage(adminTelegramId, msg, { parse_mode: 'HTML' });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Contact API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
