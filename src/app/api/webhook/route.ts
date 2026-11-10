import { NextResponse } from 'next/server';
import { Telegraf, Markup } from 'telegraf';
import { prisma } from '@/lib/prisma';
import { handleDailyReport } from '@/app/api/cron/daily-report/route';
import { canManageZapchasUser, canSellZapchasUser, getTashkentTodayRange, isAdminUser } from '@/lib/zapchas';

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
        `Xush kelibsiz ${name}! Hisobotlarni pastdagi menyudan tanlang yoki Zapchaslar bo'limidan foydalaning.`,
        Markup.keyboard([
          ['📊 Kassa Hisoboti (18:00)', '💰 Bugungi Savdolar'],
          ['📊 Bugungi Davomat', '📅 Oylik Davomat'],
          ['📈 Oylik Savdolar', '🔧 Zapchaslar']
        ]).resize()
      );
      // Ilovani ochish uchun alohida inline tugmalar yuboramiz
      await ctx.reply(`Quyidagi tugmalar orqali xizmatlarni ochishingiz mumkin:`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📱 Asosiy Ilovani ochish', web_app: { url: webAppUrl } }],
            [{ text: '🔧 Zapchaslar bo\'limi', web_app: { url: `${webAppUrl}/zapchas` } }]
          ]
        }
      });
    } else {
      await ctx.reply(
        `Xush kelibsiz ${name}! Menyudan xizmatni tanlang yoki ilovani oching:`,
        Markup.keyboard([
          ['🔧 Zapchaslar']
        ]).resize()
      );
      await ctx.reply(`Ilovani ochish uchun tugmani bosing:`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📱 Asosiy Ilovani ochish', web_app: { url: webAppUrl } }],
            [{ text: '🔧 Zapchaslar bo\'limi', web_app: { url: `${webAppUrl}/zapchas` } }]
          ]
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
      
      const attDate = attendance.date ? new Date(attendance.date) : new Date();
      const [endHour, endMinute] = (user.workEndTime || "18:00").split(':').map(Number);
      const safeEndHour = isNaN(endHour) ? 18 : endHour;
      const safeEndMinute = isNaN(endMinute) ? 0 : endMinute;

      const endTimeLimit = new Date(Date.UTC(
        attDate.getUTCFullYear(),
        attDate.getUTCMonth(),
        attDate.getUTCDate(),
        safeEndHour - 5,
        safeEndMinute,
        0,
        0
      ));
      
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
  const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tashkent' });
  const [y, m, d] = todayStr.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, d - 1, 19, 0, 0, 0));
  const end = new Date(Date.UTC(y, m - 1, d, 18, 59, 59, 999));
  const uzNow = new Date(Date.now() + 5 * 60 * 60 * 1000);
  return { start, end, uzNow };
}

function getUzMonthRange() {
  const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tashkent' });
  const [y, m] = todayStr.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 0, 19, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 0, 18, 59, 59, 999));
  const uzNow = new Date(Date.now() + 5 * 60 * 60 * 1000);
  return { start, end, uzNow };
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
      const checkIn = a.checkInTime ? new Date(a.checkInTime).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tashkent' }) : '--:--';
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

bot.hears(['📊 Kassa Hisoboti (18:00)', '📊 Bugungi Hisobot', '📊 Kassa Hisoboti', '/hisobot', '/report'], async (ctx) => {
  try {
    const telegramId = ctx.from.id.toString();
    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user || (user.role !== 'ADMIN' && telegramId !== '1037362053' && telegramId !== '3491381')) {
      return ctx.reply('Kechirasiz, ushbu hisobot faqat rahbar va adminlar uchun.');
    }

    await ctx.reply('⏳ Bugungi kassa va savdo hisoboti tayyorlanmoqda...');
    await handleDailyReport(telegramId);
  } catch (e) {
    console.error('Error sending requested report:', e);
  }
});

bot.hears('💰 Bugungi Savdolar', async (ctx) => {
  try {
    const telegramId = ctx.from.id.toString();
    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user || (user.role !== 'ADMIN' && telegramId !== '1037362053' && telegramId !== '3491381')) return;

    const { start, end, uzNow } = getUzDayRange();
    
    // Bugungi barcha to'lovlar (Yangi savdolar + Eski qarzlar uchun)
    const todayPayments = await prisma.salePayment.findMany({
      where: { createdAt: { gte: start, lte: end } }
    });
    const absoluteTotalReceived = todayPayments.reduce((sum, p) => sum + p.amount, 0);

    // Bugungi qilingan savdolar ro'yxati
    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: { user: true, items: true, payments: true }
    });

    if (sales.length === 0 && absoluteTotalReceived === 0) {
      return ctx.reply('Bugun hali hech qanday savdo yoki pul tushumi bo\'lmadi.');
    }

    let totalDebt = 0;
    let text = `💰 <b>Bugungi Savdolar (${uzNow.toLocaleDateString('uz-UZ')})</b>\n\n`;

    if (sales.length > 0) {
      text += `🛍 <b>Yangi Savdolar:</b>\n`;
      sales.forEach((s, i) => {
        const items = s.items.map(it => it.name).join(', ');
        const paid = s.payments.reduce((acc, p) => acc + p.amount, 0);
        totalDebt += s.balance;
        text += `${i + 1}. <b>${s.user.name}</b>: ${items}\n   Jami: ${s.totalPrice.toLocaleString()}, To'landi: ${paid.toLocaleString()}, Qarz: ${s.balance.toLocaleString()}\n\n`;
      });
    } else {
      text += `<i>Bugun yangi tovar sotilmadi.</i>\n\n`;
    }

    text += `💵 <b>Bugungi Barcha Tushum:</b> ${absoluteTotalReceived.toLocaleString()} so'm\n`;
    text += `<i>(Eski qarzlar va yangi savdolar hisobidan kassaga tushgan jami pul)</i>\n\n`;
    if (totalDebt > 0) {
      text += `⚠️ <b>Bugungi savdolardan qolgan qarz:</b> ${totalDebt.toLocaleString()} so'm`;
    }
    
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
    text += `💵 <b>Shu oyda kassaga tushgan barcha pul:</b> ${totalReceived.toLocaleString()} so'm\n`;
    text += `<i>(Bunga shu oyda eski qarzlardan uzilgan pullar ham kiradi)</i>\n\n`;
    text += `⚠️ <b>Shu oydagi savdolardan qolgan qarz:</b> ${totalDebt.toLocaleString()} so'm`;

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

// ==========================================
// 🔧 ZAPCHASLAR BO'LIMI
// ==========================================

bot.hears(['🔧 Zapchaslar', '/zapchas'], async (ctx) => {
  try {
    const webAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://moderno-hodimlar.vercel.app';
    const telegramId = ctx.from.id.toString();
    const user = await prisma.user.findUnique({ where: { telegramId } });

    if (!user || user.active === false) {
      return ctx.reply('Kechirasiz, tizimda faol akkauntingiz topilmadi.');
    }

    if (!canSellZapchasUser(user)) {
      return ctx.reply("Sizda Zapchaslar bo'limidan foydalanish ruxsati yo'q.");
    }

    const canManage = canManageZapchasUser(user);
    const isAdmin = isAdminUser(user);

    const [parts, todayGrouped] = await Promise.all([
      prisma.zapchasPart.findMany({ orderBy: { name: 'asc' } }),
      (() => {
        const { start, end } = getTashkentTodayRange();
        return prisma.zapchasTransaction.groupBy({
          by: ['type'],
          where: { createdAt: { gte: start, lte: end } },
          _sum: { quantity: true },
        });
      })(),
    ]);

    const totalStock = parts.reduce((sum, p) => sum + p.quantity, 0);
    const lowStock = parts.filter((p) => p.quantity <= 0 || (p.minQuantity > 0 && p.quantity <= p.minQuantity));
    let todayIn = 0;
    let todayOut = 0;
    todayGrouped.forEach((row) => {
      if (row.type === 'IN') todayIn += row._sum.quantity || 0;
      if (row.type === 'OUT') todayOut += row._sum.quantity || 0;
    });

    let msg = `🔧 <b>Zapchaslar Ombori va Sotuvi</b>\n\n`;
    if (canManage) {
      msg += `📦 <b>Zapchas turlari:</b> ${parts.length} xil\n`;
      msg += `🔢 <b>Ombordagi jami soni:</b> ${totalStock} dona\n`;
      msg += `📥 <b>Bugun kelgan:</b> +${todayIn} | 📤 <b>Bugun ketgan:</b> -${todayOut}\n`;
      if (lowStock.length > 0) {
        msg += `\n⚠️ <b>Tugagan / Kam qolganlar (${lowStock.length}):</b>\n`;
        lowStock.slice(0, 8).forEach((p) => {
          msg += `• ${p.name}: <b>${p.quantity} ${p.unit}</b>\n`;
        });
      }
      msg += `\nKelgan zapchaslarni kiritish, sotuv yozish va kelgan-ketgan sonini boshqarish uchun oching:`;
    } else {
      msg += `Ombordagi mavjud zapchaslarni ko'rish va sotilgan zapchaslarni tizimga kiritish uchun quyidagi tugmani bosing:`;
    }

    const keyboard: Array<Array<{ text: string; web_app: { url: string } }>> = [
      [{ text: "🔧 Zapchas bo'limini ochish", web_app: { url: `${webAppUrl}/zapchas` } }],
    ];
    if (isAdmin) {
      keyboard.push([{ text: '🛡 Admin Zapchas Boshqaruvi', web_app: { url: `${webAppUrl}/admin/zapchas` } }]);
    }

    await ctx.reply(msg, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard },
    });
  } catch (e) {
    console.error('Error in Zapchas menu:', e);
    ctx.reply("Zapchas ma'lumotlarini yuklashda xatolik yuz berdi.");
  }
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
