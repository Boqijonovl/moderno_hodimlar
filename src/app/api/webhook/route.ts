import { NextResponse } from 'next/server';
import { Telegraf } from 'telegraf';
import { prisma } from '@/lib/prisma';

const bot = new Telegraf(process.env.BOT_TOKEN as string);

bot.start(async (ctx) => {
  try {
    const telegramId = ctx.from.id.toString();
    const name = ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : '');
    
    // Auto-register user
    await prisma.user.upsert({
      where: { telegramId },
      update: {},
      create: {
        telegramId,
        name,
        role: 'EMPLOYEE'
      }
    });
  } catch (error) {
    console.error('Error auto-registering user:', error);
  }

  ctx.reply('Assalomu alaykum! Moderno Mebel tizimiga xush kelibsiz. Ilovani ochish uchun pastdagi tugmani bosing.', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📱 Ilovani ochish', web_app: { url: process.env.NEXT_PUBLIC_APP_URL as string } }]
      ]
    }
  });
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await bot.handleUpdate(body);
    return NextResponse.json({ message: 'success' });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return NextResponse.json({ error: 'Failed to handle webhook' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Webhook endpoint is active' });
}
