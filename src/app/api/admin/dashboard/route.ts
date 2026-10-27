import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizePaymentMethod } from '@/lib/formatters';

export const dynamic = 'force-dynamic';

function getTashkentTodayRange() {
  const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tashkent' });
  const [y, m, d] = todayStr.split('-').map(Number);
  // Midnight in Tashkent (00:00:00 UTC+5) is 19:00:00 UTC of previous day
  const start = new Date(Date.UTC(y, m - 1, d - 1, 19, 0, 0, 0));
  // 23:59:59.999 in Tashkent (18:59:59.999 UTC)
  const end = new Date(Date.UTC(y, m - 1, d, 18, 59, 59, 999));
  const todayDateMidnight = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  return { start, end, todayDateMidnight };
}

export async function GET() {
  try {
    const { start: todayStart, end: todayEnd, todayDateMidnight } = getTashkentTodayRange();

    const [sales, todayPayments, attendance, totalStoreDebtAggregate] = await Promise.all([
      prisma.sale.findMany({
        where: { createdAt: { gte: todayStart, lte: todayEnd } },
        include: { user: true, items: true, payments: true }
      }),
      prisma.salePayment.findMany({
        where: { createdAt: { gte: todayStart, lte: todayEnd } }
      }),
      prisma.attendance.findMany({
        where: {
          OR: [
            { date: todayDateMidnight },
            { createdAt: { gte: todayStart, lte: todayEnd } }
          ]
        },
        include: { user: true }
      }),
      prisma.sale.aggregate({
        where: { balance: { gt: 0 } },
        _sum: { balance: true }
      })
    ]);

    let cashTotal = 0;
    let cardTotal = 0;
    let terminalTotal = 0;
    let corporateTotal = 0;

    todayPayments.forEach(p => {
      const norm = normalizePaymentMethod(p.method);
      if (norm === 'Naqd') cashTotal += p.amount;
      else if (norm === 'Karta') cardTotal += p.amount;
      else if (norm === 'Terminal') terminalTotal += p.amount;
      else if (norm === 'Karparativ') corporateTotal += p.amount;
      else cashTotal += p.amount;
    });

    // Fallback if payments were not recorded in SalePayment
    if (todayPayments.length === 0 && sales.length > 0) {
      sales.forEach(s => {
        const norm = normalizePaymentMethod(s.paymentMethod);
        const paid = s.advance > 0 ? s.advance : (s.balance === 0 ? s.totalPrice : 0);
        if (norm === 'Naqd') cashTotal += paid;
        else if (norm === 'Karta') cardTotal += paid;
        else if (norm === 'Terminal') terminalTotal += paid;
        else if (norm === 'Karparativ') corporateTotal += paid;
        else cashTotal += paid;
      });
    }

    const totalRevenue = todayPayments.length > 0 
      ? todayPayments.reduce((sum, p) => sum + p.amount, 0)
      : sales.reduce((sum, s) => sum + s.totalPrice, 0);

    const todayDebt = sales.reduce((sum, s) => sum + (s.balance || 0), 0);
    const totalStoreDebt = totalStoreDebtAggregate._sum.balance || 0;
    
    const onTime = attendance.filter(a => a.status === 'ON_TIME').length;
    const late = attendance.filter(a => a.status === 'LATE').length;
    
    // Generate 7-day chart data
    const sevenDaysAgo = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
    
    const weekSales = await prisma.sale.findMany({
      where: { createdAt: { gte: sevenDaysAgo } }
    });
    
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
      const dayName = new Date(dayStart.getTime() + 5 * 60 * 60 * 1000).toLocaleDateString('uz-UZ', { weekday: 'short' });
      
      const dayTotal = weekSales
        .filter(s => s.createdAt >= dayStart && s.createdAt <= dayEnd)
        .reduce((sum, s) => sum + s.totalPrice, 0);
        
      chartData.push({ name: dayName, total: dayTotal });
    }
    
    return NextResponse.json({
      totalRevenue,
      totalDebt: totalStoreDebt,
      todayDebt,
      breakdown: { 
        cash: cashTotal, 
        card: cardTotal, 
        terminal: terminalTotal, 
        corporate: corporateTotal,
        installment: todayDebt,
        totalOutstandingDebt: totalStoreDebt
      },
      salesCount: sales.length,
      attendance: { total: attendance.length, onTime, late },
      chartData,
      recentSales: await prisma.sale.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { user: true, items: true, payments: true }
      })
    });
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
