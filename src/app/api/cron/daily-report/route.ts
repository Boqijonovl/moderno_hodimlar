import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Telegraf } from 'telegraf';
import { normalizePaymentMethod } from '@/lib/formatters';

export const dynamic = 'force-dynamic';

function toTashkentDate(d: Date | string): string {
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  return dateObj.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tashkent' });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const targetId = url.searchParams.get('telegramId') || undefined;
  return handleDailyReport(targetId);
}

export async function POST(req: Request) {
  let targetId: string | undefined;
  try {
    const body = await req.json();
    targetId = body.telegramId;
  } catch (e) {}
  return handleDailyReport(targetId);
}

export async function handleDailyReport(targetTelegramId?: string) {
  try {
    const now = new Date();
    const todayStr = toTashkentDate(now);
    const [year, month, day] = todayStr.split('-').map(Number);

    const startDate = new Date(Date.UTC(year, month - 1, day, -6, 0, 0));
    const endDate = new Date(Date.UTC(year, month - 1, day + 1, 6, 0, 0));

    const [rawSales, rawSalePayments, rawExpenses, totalStoreDebtAggregate] = await Promise.all([
      prisma.sale.findMany({
        where: {
          OR: [
            { createdAt: { gte: startDate, lte: endDate } },
            { date: { gte: startDate, lte: endDate } }
          ]
        },
        include: { user: true, payments: true }
      }),
      prisma.salePayment.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        include: { sale: { include: { user: true } } }
      }),
      prisma.expense.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        include: { user: true }
      }),
      prisma.sale.aggregate({
        where: { balance: { gt: 0 } },
        _sum: { balance: true }
      })
    ]);

    // Filter strictly to today in Tashkent timezone
    const todaySales = rawSales.filter(s => toTashkentDate(s.createdAt || s.date) === todayStr);
    const todayPayments = rawSalePayments.filter(p => toTashkentDate(p.createdAt) === todayStr);
    const todayExpenses = rawExpenses.filter(e => toTashkentDate(e.createdAt) === todayStr);

    const totalSales = todaySales.reduce((sum, s) => sum + (s.totalPrice || 0), 0);
    let totalReceived = todayPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const paymentBreakdown: Record<string, number> = {
      'Naqd': 0,
      'Karta': 0,
      'Terminal': 0,
      'Karparativ': 0
    };

    todayPayments.forEach(p => {
      const method = normalizePaymentMethod(p.method);
      paymentBreakdown[method] = (paymentBreakdown[method] || 0) + p.amount;
    });

    // Fallback if payments relation wasn't recorded
    if (todayPayments.length === 0 && todaySales.length > 0) {
      todaySales.forEach(s => {
        const method = normalizePaymentMethod(s.paymentMethod);
        const paid = s.advance > 0 ? s.advance : (s.balance === 0 ? s.totalPrice : 0);
        paymentBreakdown[method] = (paymentBreakdown[method] || 0) + paid;
      });
      totalReceived = Object.values(paymentBreakdown).reduce((sum, v) => sum + v, 0);
    }

    const totalExpenses = todayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Cash expenses
    let cashExpenses = 0;
    todayExpenses.forEach(e => {
      if (normalizePaymentMethod(e.paymentMethod) === 'Naqd') {
        cashExpenses += e.amount;
      }
    });

    const netCash = (paymentBreakdown['Naqd'] || 0) - cashExpenses;
    const todayDebt = todaySales.reduce((sum, s) => sum + (s.balance || 0), 0);
    const totalStoreDebt = totalStoreDebtAggregate._sum.balance || 0;

    // Find "Kun qahramoni" (Top employee with highest sales today)
    const userStats: Record<string, { name: string; count: number; total: number }> = {};
    todaySales.forEach(s => {
      const uId = s.userId;
      const uName = s.user?.name || "Noma'lum";
      if (!userStats[uId]) userStats[uId] = { name: uName, count: 0, total: 0 };
      userStats[uId].count += 1;
      userStats[uId].total += (s.totalPrice || 0);
    });

    const sortedUsers = Object.values(userStats).sort((a, b) => b.total - a.total);
    const topHero = sortedUsers.length > 0 ? sortedUsers[0] : null;

    const readableDate = now.toLocaleDateString('uz-UZ', {
      timeZone: 'Asia/Tashkent',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('uz-UZ', {
      timeZone: 'Asia/Tashkent',
      hour: '2-digit',
      minute: '2-digit'
    });

    const heroText = topHero 
      ? `🏆 <b>Kun qahramoni:</b> ${topHero.name} (${topHero.count} ta savdo, ${topHero.total.toLocaleString()} so'm)`
      : `🏆 <b>Kun qahramoni:</b> Bugun hali savdolar qayd etilmadi`;

    let debtText = '';
    if (todayDebt > 0) {
      debtText += `\n⚠️ <b>Bugungi yangi qarz (Nasiya):</b> <b>${todayDebt.toLocaleString()} so'm</b>`;
    }
    if (totalStoreDebt > 0) {
      debtText += `\n📌 <b>Do'konning jami qarz qoldig'i:</b> <b>${totalStoreDebt.toLocaleString()} so'm</b>`;
    }

    const reportMessage = 
`📊 <b>Bugungi Kassa va Savdo Hisoboti (${timeStr})</b>
📅 <b>Sana:</b> ${readableDate}

💰 <b>Jami savdo:</b> <b>${totalSales.toLocaleString()} so'm</b> (${todaySales.length} ta savdo)
💵 <b>Jami tushum:</b> <b>${totalReceived.toLocaleString()} so'm</b>
   • 💵 Naqd: ${(paymentBreakdown['Naqd'] || 0).toLocaleString()} so'm
   • 💳 Karta: ${(paymentBreakdown['Karta'] || 0).toLocaleString()} so'm
   • 📟 Terminal: ${(paymentBreakdown['Terminal'] || 0).toLocaleString()} so'm
   • 🏢 Karparativ: ${(paymentBreakdown['Karparativ'] || 0).toLocaleString()} so'm
🔻 <b>Xarajatlar:</b> <b>${totalExpenses.toLocaleString()} so'm</b> (${todayExpenses.length} ta)
💼 <b>Sof naqd kassa qoldig'i:</b> <b>${netCash.toLocaleString()} so'm</b>${debtText}

${heroText}`;

    let sentCount = 0;
    if (process.env.BOT_TOKEN) {
      const bot = new Telegraf(process.env.BOT_TOKEN);
      
      const admins = await prisma.user.findMany({ 
        where: { 
          OR: [
            { role: 'ADMIN' },
            { role: 'admin' },
            { telegramId: { in: ['1037362053', '3491381'] } }
          ] 
        } 
      });

      const targets = targetTelegramId 
        ? [{ telegramId: targetTelegramId, name: 'Admin' }]
        : admins.filter(a => a.telegramId);

      for (const target of targets) {
        if (target.telegramId) {
          try {
            await bot.telegram.sendMessage(target.telegramId, reportMessage, { parse_mode: 'HTML' });
            sentCount++;
          } catch (e) {
            console.error(`Failed to send daily report to ${target.name} (${target.telegramId})`, e);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: reportMessage,
      sentToAdminsCount: sentCount,
      stats: {
        totalSales,
        totalReceived,
        totalExpenses,
        netCash,
        todayDebt,
        totalStoreDebt,
        paymentBreakdown,
        salesCount: todaySales.length,
        hero: topHero
      }
    });
  } catch (error: any) {
    console.error('Error generating daily report:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
