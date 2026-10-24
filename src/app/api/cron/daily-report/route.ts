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
  return handleDailyReport();
}

export async function POST(req: Request) {
  return handleDailyReport();
}

async function handleDailyReport() {
  try {
    const now = new Date();
    const todayStr = toTashkentDate(now);
    const [year, month, day] = todayStr.split('-').map(Number);

    const startDate = new Date(Date.UTC(year, month - 1, day, -6, 0, 0));
    const endDate = new Date(Date.UTC(year, month - 1, day + 1, 6, 0, 0));

    const [rawSales, rawSalePayments, rawExpenses] = await Promise.all([
      prisma.sale.findMany({
        where: { date: { gte: startDate, lte: endDate } },
        include: { user: true, payments: true }
      }),
      prisma.salePayment.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        include: { sale: { include: { user: true } } }
      }),
      prisma.expense.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        include: { user: true }
      })
    ]);

    // Filter strictly to today in Tashkent timezone
    const todaySales = rawSales.filter(s => toTashkentDate(s.date) === todayStr);
    const todayPayments = rawSalePayments.filter(p => toTashkentDate(p.createdAt) === todayStr);
    const todayExpenses = rawExpenses.filter(e => toTashkentDate(e.createdAt) === todayStr);

    const totalSales = todaySales.reduce((sum, s) => sum + (s.totalPrice || 0), 0);
    const totalReceived = todayPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

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

    const totalExpenses = todayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Cash expenses
    let cashExpenses = 0;
    todayExpenses.forEach(e => {
      if (normalizePaymentMethod(e.paymentMethod) === 'Naqd') {
        cashExpenses += e.amount;
      }
    });

    const netCash = (paymentBreakdown['Naqd'] || 0) - cashExpenses;

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

    const reportMessage = 
`📊 <b>Bugungi kassa hisoboti (${timeStr})</b>
📅 <b>Sana:</b> ${readableDate}

💰 <b>Jami savdo:</b> <b>${totalSales.toLocaleString()} so'm</b> (${todaySales.length} ta savdo)
💵 <b>Jami tushum:</b> <b>${totalReceived.toLocaleString()} so'm</b>
   • 💵 Naqd: ${(paymentBreakdown['Naqd'] || 0).toLocaleString()} so'm
   • 💳 Karta: ${(paymentBreakdown['Karta'] || 0).toLocaleString()} so'm
   • 📟 Terminal: ${(paymentBreakdown['Terminal'] || 0).toLocaleString()} so'm
   • 🏢 Karparativ: ${(paymentBreakdown['Karparativ'] || 0).toLocaleString()} so'm
🔻 <b>Xarajatlar:</b> <b>${totalExpenses.toLocaleString()} so'm</b> (${todayExpenses.length} ta)
💼 <b>Sof naqd tushum qoldig'i:</b> <b>${netCash.toLocaleString()} so'm</b>

${heroText}`;

    let sentCount = 0;
    if (process.env.BOT_TOKEN) {
      const bot = new Telegraf(process.env.BOT_TOKEN);
      const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });

      for (const admin of admins) {
        if (admin.telegramId) {
          try {
            await bot.telegram.sendMessage(admin.telegramId, reportMessage, { parse_mode: 'HTML' });
            sentCount++;
          } catch (e) {
            console.error(`Failed to send daily report to ${admin.name}`, e);
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
