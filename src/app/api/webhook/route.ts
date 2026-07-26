import { NextResponse } from 'next/server';
import { Telegraf } from 'telegraf';

const bot = new Telegraf(process.env.BOT_TOKEN as string);

bot.start((ctx) => {
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
