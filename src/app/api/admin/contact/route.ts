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
      
      const buttons = [
        [{ text: '💬 Profilni ochish (Telegram ID)', url: `tg://user?id=${targetTelegramId}` }]
      ];
      
      if (targetUser.phone) {
        const cleanPhone = targetUser.phone.replace(/\D/g, '');
        const fullPhone = cleanPhone.length === 9 ? `998${cleanPhone}` : cleanPhone;
        buttons.push([{ text: '📱 Profilni ochish (Raqam orqali)', url: `https://t.me/+${fullPhone}` }]);
      }

      const msg = `👤 Xodim: <b>${targetUser.name}</b>\n\nPastdagi tugmalardan birini tanlab, xodimning shaxsiy profiliga o'ting:`;
      
      await bot.telegram.sendMessage(adminTelegramId, msg, { 
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: buttons
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Contact API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
