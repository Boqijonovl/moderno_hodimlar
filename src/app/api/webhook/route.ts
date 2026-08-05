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

  ctx.reply(`Xush kelibsiz ${name}! Ilovani ochish uchun quyidagi tugmani bosing!`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📱 Ilovani ochish', web_app: { url: process.env.NEXT_PUBLIC_APP_URL as string } }]
      ]
    }
  });
});

bot.action(/^still_working_(yes|no)_([a-zA-Z0-9-]+)$/, async (ctx) => {
  try {
    const answer = ctx.match[1];
    const attendanceId = ctx.match[2];
    
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: { user: true }
    });

    if (!attendance || attendance.checkOutTime) {
      await ctx.editMessageText('Davomat allaqachon yopilgan.');
      return;
    }

    if (answer === 'yes') {
      await ctx.editMessageText('✅ Tasdiqlandi! Ishda davom etyapsiz. Ketayotganda davomatni ilovadan yakunlashni unutmang!');
    } else {
      const user = attendance.user;
      
      const serverTime = new Date();
      const tashkentTimeStr = serverTime.toLocaleString("en-US", {timeZone: "Asia/Tashkent"});
      const tashkentTime = new Date(tashkentTimeStr);
      
      const endTimeLimit = new Date(tashkentTime);
      const [endHour, endMinute] = (user.workEndTime || "18:00").split(':').map(Number);
      endTimeLimit.setHours(endHour, endMinute, 0, 0);
      
      const newLateMinutes = attendance.lateMinutes || 0;

      await prisma.attendance.update({
        where: { id: attendanceId },
        data: { 
          checkOutTime: endTimeLimit,
          lateMinutes: newLateMinutes,
          reason: attendance.reason ? `${attendance.reason} | (Esdan chiqqan, bot orqali yopildi)` : `(Esdan chiqqan, bot orqali yopildi)`
        }
      });
      await ctx.editMessageText(`Davomat soat ${user.workEndTime || "18:00"} dagi holat bilan yopildi. Keyingi safar ilovadan yakunlashni unutmang!`);
    }
  } catch (error) {
    console.error('Error handling webhook action:', error);
  }
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
