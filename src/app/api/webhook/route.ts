import { NextResponse } from 'next/server';
import { Telegraf, Markup } from 'telegraf';
import { prisma } from '@/lib/prisma';
import { calculateMebelKroy, calculateRaskroy, parsePartsFromText } from '@/lib/raskroyEngine';

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
        `Xush kelibsiz ${name}! Hisobotlarni pastdagi menyudan tanlang yoki Kroy & Raskroy vositasidan foydalaning.`,
        Markup.keyboard([
          ['📊 Bugungi Davomat', '📅 Oylik Davomat'],
          ['💰 Bugungi Savdolar', '📈 Oylik Savdolar'],
          ['📐 Kroy & Raskroy']
        ]).resize()
      );
      // Ilovani ochish uchun alohida inline tugmalar yuboramiz
      await ctx.reply(`Quyidagi tugmalar orqali xizmatlarni ochishingiz mumkin:`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📱 Asosiy Ilovani ochish', web_app: { url: webAppUrl } }],
            [{ text: '📐 Kroy & Raskroy kalkulyatori', web_app: { url: `${webAppUrl}/raskroy` } }]
          ]
        }
      });
    } else {
      await ctx.reply(
        `Xush kelibsiz ${name}! Menyudan xizmatni tanlang yoki ilovani oching:`,
        Markup.keyboard([
          ['📐 Kroy & Raskroy']
        ]).resize()
      );
      await ctx.reply(`Ilovani ochish uchun tugmani bosing:`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📱 Asosiy Ilovani ochish', web_app: { url: webAppUrl } }],
            [{ text: '📐 Kroy & Raskroy kalkulyatori', web_app: { url: `${webAppUrl}/raskroy` } }]
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
// 📐 KROY VA RASKROY FUNKSIYALARI
// ==========================================

bot.hears('📐 Kroy & Raskroy', async (ctx) => {
  try {
    const webAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://moderno-hodimlar.vercel.app';
    const text = `📐 <b>Mebel Kroy & 2D Raskroy Xizmati</b>\n\n` +
      `Moderno Mebel sexining professional avto-kroy va arra (raskroy) kalkulyatori.\n\n` +
      `⚡ <b>Nimalar qila oladi?</b>\n` +
      `• Shkaf, Tumba, Oshxona shkaflarini avtomatik kroy qilish (aniq o'lchamlar, oraliqlar va kromkalar)\n` +
      `• Detallarni standart 2750×1830 listlarga 2D Guillotine usulida eng kam chiqindi bilan joylashtirish\n` +
      `• Kromka 2.0mm va 0.4mm metrlari, DVP orqa devor maydonini hisoblash\n` +
      `• Arra va kromka ustalari uchun A4 formatda chop etish (Print/PDF)\n\n` +
      `💬 <b>Chat orqali tezkor hisoblash:</b>\n\n` +
      `1️⃣ <b>Mebel kroyi:</b>\n` +
      `<code>/kroy [Balandlik] [Eni] [Chuqurlik] [Polkalar] [Tortmalar] [Eshiklar]</code>\n` +
      `<i>Masalan:</i> <code>/kroy 2100 800 500 3 2 2</code>\n\n` +
      `2️⃣ <b>Erkin detallar raskroyi:</b>\n` +
      `<code>/raskroy\n2000x500 2 Yon devor\n768x500 2 Qopqoq\n768x480 3 Polka</code>\n\n` +
      `Vizual 2D xarita va PDF yuklab olish uchun quyidagi tugmani bosing:`;

    await ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📱 Kroy & Raskroy dasturini ochish', web_app: { url: `${webAppUrl}/raskroy` } }]
        ]
      }
    });
  } catch (e) {
    console.error('Error in raskroy menu:', e);
  }
});

bot.hears(/^\/kroy(?:\s+(.*))?$/i, async (ctx) => {
  try {
    const webAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://moderno-hodimlar.vercel.app';
    const argsStr = ctx.match[1]?.trim();

    if (!argsStr) {
      return ctx.reply(
        `📐 <b>Mebel Kroy Kalkulyatori</b>\n\n` +
        `O'lchamlarni quyidagi formatda yuboring:\n` +
        `<code>/kroy [Balandlik] [Eni] [Chuqurlik] [Polkalar] [Tortmalar] [Eshiklar]</code>\n\n` +
        `<b>Namunalar:</b>\n` +
        `• Standart shkaf: <code>/kroy 2100 800 500 3 2 2</code>\n` +
        `• Tumba / Komod: <code>/kroy 850 600 450 0 3 0</code>\n` +
        `• Oshxona pastki shkafi: <code>/kroy 850 800 600 1 0 2</code>\n\n` +
        `Yoki interaktiv dastur orqali qulay hisoblang:`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📱 Interaktiv Kroy Dasturi', web_app: { url: `${webAppUrl}/raskroy` } }]
            ]
          }
        }
      );
    }

    const parts = argsStr.split(/\s+/).map(Number).filter(n => !isNaN(n));
    const H = parts[0] || 2000;
    const W = parts[1] || 800;
    const D = parts[2] || 500;
    const shelves = parts[3] !== undefined ? parts[3] : 3;
    const drawers = parts[4] !== undefined ? parts[4] : 0;
    const doors = parts[5] !== undefined ? parts[5] : (W > 900 ? 2 : 1);

    const kroy = calculateMebelKroy({
      type: 'shkaf',
      height: H,
      width: W,
      depth: D,
      thickness: 16,
      shelvesCount: shelves,
      drawersCount: drawers,
      doorType: doors > 0 ? 'hinged' : 'none',
      doorsCount: doors
    });

    const raskroy = calculateRaskroy(kroy.parts);

    let msg = `📐 <b>Mebel Kroy & Raskroy Hisoboti</b>\n`;
    msg += `📏 O'lcham: <b>${H} × ${W} × ${D} mm</b>\n`;
    msg += `🚪 Eshiklar: <b>${doors} ta</b> | 📚 Polkalar: <b>${shelves} ta</b> | 🗄 Tortmalar: <b>${drawers} ta</b>\n\n`;
    msg += `📋 <b>Detallar spetsifikatsiyasi (Kroy):</b>\n`;

    kroy.parts.forEach((p, idx) => {
      msg += `${idx + 1}. <b>${p.name}</b>: ${p.length}×${p.width} mm — <b>${p.qty} dona</b> (${p.material})\n`;
    });

    msg += `\n📊 <b>Materiallar va Raskroy sarfi:</b>\n`;
    msg += `• Jami DSP listi (2750×1830): <b>${raskroy.totalSheets} dona</b>\n`;
    msg += `• Detallar maydoni: <b>${kroy.totalDspArea.toFixed(2)} m²</b>\n`;
    msg += `• Chiqindi (scrap): <b>~${raskroy.averageWastePercent}%</b>\n`;
    msg += `• Orqa fon DVP: <b>${kroy.totalDvpArea.toFixed(2)} m²</b>\n`;
    msg += `• Kromka 2.0 mm (oldi): <b>${kroy.edge2mmMeters} metr</b>\n`;
    msg += `• Kromka 0.4 mm (ichki): <b>${kroy.edge04mmMeters} metr</b>\n`;

    const webUrlWithParams = `${webAppUrl}/raskroy?h=${H}&w=${W}&d=${D}&s=${shelves}&dr=${drawers}&dc=${doors}`;

    await ctx.reply(msg, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🗺 2D Raskroy Xaritasini Ko\'rish', web_app: { url: webUrlWithParams } }],
          [{ text: '🖨 Sex uchun Chop Etish (PDF)', web_app: { url: `${webUrlWithParams}&print=1` } }]
        ]
      }
    });
  } catch (e) {
    console.error('Error in /kroy:', e);
    ctx.reply('Hisoblashda xatolik yuz berdi. Iltimos o\'lchamlarni to\'g\'ri kiriting.');
  }
});

bot.hears(/^\/raskroy(?:\s+([\s\S]+))?$/i, async (ctx) => {
  try {
    const webAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://moderno-hodimlar.vercel.app';
    const text = ctx.match[1]?.trim();

    if (!text) {
      return ctx.reply(
        `🗺 <b>2D Guillotine Raskroy Kalkulyatori</b>\n\n` +
        `Sexdagi o'lchamlaringizni quyidagi shaklda yuboring:\n` +
        `<code>/raskroy\n` +
        `2000x500 2 Yon devor\n` +
        `768x500 2 Qopqoq\n` +
        `768x480 3 Polka\n` +
        `350x140 4 Tortma yoni</code>\n\n` +
        `Standart list: <b>2750 × 1830 mm</b> (DSP)\n` +
        `Pilyan tishi (kerf): <b>4 mm</b>\n\n` +
        `Yoki to'liq vizual dasturni oching:`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📱 Raskroy Dasturini Ochish', web_app: { url: `${webAppUrl}/raskroy` } }]
            ]
          }
        }
      );
    }

    const parts = parsePartsFromText(text);
    if (parts.length === 0) {
      return ctx.reply("Detallar formati aniqlanmadi. Masalan:\n<code>2000x500 2 Yon devor</code> shaklida yozing.");
    }

    const result = calculateRaskroy(parts);

    let msg = `🗺 <b>Raskroy Hisob-kitob Natijasi:</b>\n\n`;
    msg += `📦 Jami detallar: <b>${result.totalPartsCount} dona</b>\n`;
    msg += `📐 Detallar maydoni: <b>${result.totalDspArea} m²</b>\n`;
    msg += `📄 Kerakli DSP listi (2750×1830): <b>${result.totalSheets} dona</b>\n`;
    msg += `♻️ O'rtacha chiqindi (scrap): <b>${result.averageWastePercent}%</b>\n\n`;

    msg += `<b>Listlar bo'yicha joylashuv:</b>\n`;
    result.sheets.forEach(s => {
      msg += `• List #${s.sheetIndex}: <b>${s.items.length} ta detal</b> (Maydon: ${s.usedArea} m², Chiqindi: ${s.wastePercent}%)\n`;
    });

    const encodedData = encodeURIComponent(text.substring(0, 400));
    const openUrl = `${webAppUrl}/raskroy?tab=manual&data=${encodedData}`;

    await ctx.reply(msg, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🗺 2D Xarita va Arra sxemasini ochish', web_app: { url: openUrl } }]
        ]
      }
    });
  } catch (e) {
    console.error('Error in /raskroy:', e);
    ctx.reply('Raskroy hisoblashda xatolik yuz berdi.');
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
