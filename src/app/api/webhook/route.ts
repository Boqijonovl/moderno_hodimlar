import { NextResponse } from 'next/server';
import { Telegraf, Markup } from 'telegraf';
import { prisma } from '@/lib/prisma';

const bot = new Telegraf(process.env.BOT_TOKEN as string);

bot.start(async (ctx) => {
  let role = 'EMPLOYEE';
  const name = ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : '');
  const webAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://moderno-hodimlar.vercel.app';

  try {
    const telegramId = ctx.from.id.toString();
    
    // Xavfsizroq usulda foydalanuvchini topish
    let user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) {
      user = await prisma.user.create({
        data: { telegramId, name, role: 'EMPLOYEE' }
      });
    }
    role = user.role;

    // Failsafe: Agar bazadan topolmasa va foydalanuvchi Boburjon bo'lsa (1037362053)
    if (telegramId === '1037362053' || telegramId === '3491381') {
      role = 'ADMIN';
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    // Hardcode admin ids if database completely fails
    const telegramId = ctx.from.id.toString();
    if (telegramId === '1037362053' || telegramId === '3491381') {
      role = 'ADMIN';
    }
  }

  try {
    if (role === 'ADMIN') {
      await ctx.reply(
        `Xush kelibsiz ${name}! Hisobotlarni pastdagi menyudan (stiker yonidagi tugma) tanlang.`,
        Markup.keyboard([
          ['📊 Bugungi Davomat', '📅 Oylik Davomat'],
          ['💰 Bugungi Savdolar', '📈 Oylik Savdolar']
        ]).resize()
      );
      // Ilovani ochish uchun alohida inline tugma yuboramiz
      await ctx.reply(`Ilovani ochish uchun tugmani bosing:`, {
        reply_markup: {
          inline_keyboard: [[{ text: '📱 Ilovani ochish', web_app: { url: webAppUrl } }]]
        }
      });
    } else {
      await ctx.reply(
        `Xush kelibsiz ${name}! Ilovani ochish uchun quyidagi tugmani bosing.`,
        Markup.removeKeyboard()
      );
      await ctx.reply(`Ilovani ochish uchun tugmani bosing:`, {
        reply_markup: {
          inline_keyboard: [[{ text: '📱 Ilovani ochish', web_app: { url: webAppUrl } }]]
        }
      });
    }
  } catch (e) {
    console.error('Reply error:', e);
  }
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

function getUzDayRange() {
  const d = new Date();
  d.setUTCHours(d.getUTCHours() + 5);
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), -5, 0, 0, 0));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  end.setUTCMilliseconds(-1);
  return { start, end, uzNow: d };
}

function getUzMonthRange() {
  const d = new Date();
  d.setUTCHours(d.getUTCHours() + 5);
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, -5, 0, 0, 0));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, -5, 0, 0, 0));
  end.setUTCMilliseconds(-1);
  return { start, end, uzNow: d };
}

bot.hears('📊 Bugungi Davomat', async (ctx) => {
  try {
    const telegramId = ctx.from.id.toString();
    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user || (user.role !== 'ADMIN' && telegramId !== '1037362053' && telegramId !== '3491381')) return;

    const { start, end, uzNow } = getUzDayRange();
    const attendances = await prisma.attendance.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: { user: true }
    });

    if (attendances.length === 0) {
      return ctx.reply('Bugun hali hech kim ishga kelmadi.');
    }

    let text = `📊 <b>Bugungi Davomat (${uzNow.toLocaleDateString('uz-UZ')})</b>\n\n`;
    attendances.forEach((a, i) => {
      const checkIn = new Date(a.checkInTime).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tashkent' });
      const checkOut = a.checkOutTime ? new Date(a.checkOutTime).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tashkent' }) : 'Ishda';
      const late = a.lateMinutes > 0 ? ` (Kechikdi: ${a.lateMinutes} daq)` : '';
      text += `${i + 1}. <b>${a.user.name}</b>: ${checkIn} - ${checkOut}${late}\n`;
    });
    
    ctx.reply(text, { parse_mode: 'HTML' }).catch(() => {});
  } catch (e) {}
});

bot.hears('📅 Oylik Davomat', async (ctx) => {
  try {
    const telegramId = ctx.from.id.toString();
    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user || (user.role !== 'ADMIN' && telegramId !== '1037362053' && telegramId !== '3491381')) return;

    const { start, end, uzNow } = getUzMonthRange();
    const attendances = await prisma.attendance.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: { user: true }
    });

    const stats = {} as Record<string, { days: number, lateMins: number }>;
    attendances.forEach(a => {
      if (!stats[a.user.name]) stats[a.user.name] = { days: 0, lateMins: 0 };
      stats[a.user.name].days++;
      stats[a.user.name].lateMins += (a.lateMinutes || 0);
    });

    let text = `📅 <b>Oylik Davomat (${uzNow.toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' })})</b>\n\n`;
    Object.keys(stats).forEach((name, i) => {
      text += `${i + 1}. <b>${name}</b>: ${stats[name].days} kun keldi, Jami kechikish: ${stats[name].lateMins} daqiqa\n`;
    });
    if (Object.keys(stats).length === 0) text += "Ma'lumot yo'q.";
    
    const webAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://moderno-hodimlar.vercel.app';
    const monthParam = uzNow.toISOString().slice(0, 7);

    ctx.reply(text, { 
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: '🖨 To\'liq Chop Etish (PDF/Web)', web_app: { url: `${webAppUrl}/print/attendance?month=${monthParam}` } }]]
      }
    }).catch(() => {});
  } catch (e) {}
});

bot.hears('💰 Bugungi Savdolar', async (ctx) => {
  try {
    const telegramId = ctx.from.id.toString();
    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user || (user.role !== 'ADMIN' && telegramId !== '1037362053' && telegramId !== '3491381')) return;

    const { start, end, uzNow } = getUzDayRange();
    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: { user: true, items: true, payments: true }
    });

    if (sales.length === 0) {
      return ctx.reply('Bugun hali savdo bo\'lmadi.');
    }

    let totalReceived = 0;
    let totalDebt = 0;
    let text = `💰 <b>Bugungi Savdolar (${uzNow.toLocaleDateString('uz-UZ')})</b>\n\n`;

    sales.forEach((s, i) => {
      const items = s.items.map(it => it.name).join(', ');
      const paid = s.payments.reduce((acc, p) => acc + p.amount, 0);
      totalReceived += paid;
      totalDebt += s.balance;
      text += `${i + 1}. <b>${s.user.name}</b>: ${items}\n   Jami: ${s.totalPrice.toLocaleString()}, To'landi: ${paid.toLocaleString()}, Qarz: ${s.balance.toLocaleString()}\n\n`;
    });

    text += `💵 <b>Haqiqiy Tushum:</b> ${totalReceived.toLocaleString()} so'm\n`;
    text += `⚠️ <b>Bugungi Qarzlar:</b> ${totalDebt.toLocaleString()} so'm`;
    
    ctx.reply(text, { parse_mode: 'HTML' }).catch(() => {});
  } catch (e) {}
});

bot.hears('📈 Oylik Savdolar', async (ctx) => {
  try {
    const telegramId = ctx.from.id.toString();
    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user || (user.role !== 'ADMIN' && telegramId !== '1037362053' && telegramId !== '3491381')) return;

    const { start, end, uzNow } = getUzMonthRange();
    const payments = await prisma.salePayment.findMany({
      where: { createdAt: { gte: start, lte: end } }
    });
    const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);

    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: start, lte: end } }
    });
    const totalSalesAmount = sales.reduce((sum, s) => sum + s.totalPrice, 0);
    const totalDebt = sales.reduce((sum, s) => sum + s.balance, 0);

    let text = `📈 <b>Oylik Savdolar Hisoboti</b>\n(${uzNow.toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' })})\n\n`;
    text += `🛒 <b>Jami Savdo summasi:</b> ${totalSalesAmount.toLocaleString()} so'm\n`;
    text += `💵 <b>Haqiqiy tushgan pul:</b> ${totalReceived.toLocaleString()} so'm\n`;
    text += `⚠️ <b>Oy bo'yicha qarz qoldi:</b> ${totalDebt.toLocaleString()} so'm`;

    const webAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://moderno-hodimlar.vercel.app';
    const monthParam = uzNow.toISOString().slice(0, 7);

    ctx.reply(text, { 
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: '🖨 To\'liq Chop Etish (PDF/Web)', web_app: { url: `${webAppUrl}/print/sales?month=${monthParam}` } }]]
      }
    }).catch(() => {});
  } catch (e) {}
});

export { bot };

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
