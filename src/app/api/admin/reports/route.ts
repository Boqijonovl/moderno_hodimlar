import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizePaymentMethod } from '@/lib/formatters';

export const dynamic = 'force-dynamic';

function toTashkentDate(d: Date | string): string {
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  return dateObj.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tashkent' });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get('month'); // Format: YYYY-MM
    
    let targetMonth: string;
    let startDate: Date;
    let endDate: Date;

    if (monthParam) {
      targetMonth = monthParam;
      const [year, month] = monthParam.split('-').map(Number);
      // Include time padding so edge hours in Tashkent (+5 UTC) are fully captured
      startDate = new Date(Date.UTC(year, month - 1, 1, -6, 0, 0));
      endDate = new Date(Date.UTC(year, month, 1, 6, 0, 0));
    } else {
      const now = new Date();
      targetMonth = toTashkentDate(now).slice(0, 7);
      const [year, month] = targetMonth.split('-').map(Number);
      startDate = new Date(Date.UTC(year, month - 1, 1, -6, 0, 0));
      endDate = new Date(Date.UTC(year, month, 1, 6, 0, 0));
    }

    const users = await prisma.user.findMany({
      where: { active: true } 
    });

    const [rawAttendances, rawSales, rawSalePayments, rawExpenses] = await Promise.all([
      prisma.attendance.findMany({
        where: { date: { gte: startDate, lte: endDate } },
        include: { user: true }
      }),
      prisma.sale.findMany({
        where: { date: { gte: startDate, lte: endDate } },
        include: { user: true }
      }),
      prisma.salePayment.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        include: { sale: true }
      }),
      prisma.expense.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        include: { user: true }
      })
    ]);

    // Filter strictly to the targeted month in Tashkent time
    const attendances = rawAttendances.filter(a => toTashkentDate(a.date).startsWith(targetMonth));
    const sales = rawSales.filter(s => toTashkentDate(s.date).startsWith(targetMonth));
    const salePayments = rawSalePayments.filter(p => toTashkentDate(p.createdAt).startsWith(targetMonth));
    const expenses = rawExpenses.filter(e => toTashkentDate(e.createdAt).startsWith(targetMonth));

    // Process daily reports grouped by Tashkent calendar date
    const dailyMap: Record<string, any[]> = {};
    const dates = new Set([
      ...attendances.map(a => toTashkentDate(a.date)),
      ...sales.map(s => toTashkentDate(s.date)),
      ...salePayments.map(p => toTashkentDate(p.createdAt)),
      ...expenses.map(e => toTashkentDate(e.createdAt))
    ]);

    Array.from(dates).sort((a, b) => b.localeCompare(a)).forEach(dateStr => {
      const dayUsers = users.map(user => {
        const userAtt = attendances.find(a => a.userId === user.id && toTashkentDate(a.date) === dateStr);
        const userSales = sales.filter(s => s.userId === user.id && toTashkentDate(s.date) === dateStr);
        const userPayments = salePayments.filter(p => p.sale.userId === user.id && toTashkentDate(p.createdAt) === dateStr);
        const userExpenses = expenses.filter(e => e.userId === user.id && toTashkentDate(e.createdAt) === dateStr);
        
        // Calculate normalized payment breakdown for this day
        const paymentBreakdown: Record<string, number> = {};
        userPayments.forEach(p => {
          const normMethod = normalizePaymentMethod(p.method);
          paymentBreakdown[normMethod] = (paymentBreakdown[normMethod] || 0) + p.amount;
        });
        
        return {
          user: { id: user.id, name: user.name },
          attendance: userAtt || null,
          salesTotal: userSales.reduce((sum, s) => sum + s.totalPrice, 0),
          salesCount: userSales.length,
          receivedTotal: userPayments.reduce((sum, p) => sum + p.amount, 0),
          paymentBreakdown,
          expensesTotal: userExpenses.reduce((sum, e) => sum + e.amount, 0),
          expensesCount: userExpenses.length
        };
      }).filter(u => u.attendance || u.salesCount > 0 || u.expensesCount > 0 || u.receivedTotal > 0); 

      dailyMap[dateStr] = dayUsers;
    });

    // Process monthly summary
    const monthlySummary = users.map(user => {
      const userAtts = attendances.filter(a => a.userId === user.id);
      const userSales = sales.filter(s => s.userId === user.id);
      const userPayments = salePayments.filter(p => p.sale.userId === user.id);
      const userExpenses = expenses.filter(e => e.userId === user.id);
      
      const totalLateMinutes = userAtts.reduce((sum, a) => sum + a.lateMinutes, 0);
      
      const paymentBreakdown: Record<string, number> = {};
      userPayments.forEach(p => {
        const normMethod = normalizePaymentMethod(p.method);
        paymentBreakdown[normMethod] = (paymentBreakdown[normMethod] || 0) + p.amount;
      });
      
      return {
        user: { id: user.id, name: user.name },
        totalDaysPresent: userAtts.length,
        totalLateMinutes,
        totalSales: userSales.reduce((sum, s) => sum + s.totalPrice, 0),
        totalSalesCount: userSales.length,
        totalReceived: userPayments.reduce((sum, p) => sum + p.amount, 0),
        paymentBreakdown,
        totalExpenses: userExpenses.reduce((sum, e) => sum + e.amount, 0),
        totalExpensesCount: userExpenses.length
      };
    }).filter(u => u.totalDaysPresent > 0 || u.totalSalesCount > 0 || u.totalExpensesCount > 0 || u.totalReceived > 0);

    // Available months based on all events
    const [allAtts, allSales, allExps] = await Promise.all([
      prisma.attendance.findMany({ select: { date: true } }),
      prisma.sale.findMany({ select: { date: true } }),
      prisma.expense.findMany({ select: { createdAt: true } })
    ]);
    const allDates = [...allAtts.map(a => a.date), ...allSales.map(s => s.date), ...allExps.map(e => e.createdAt)];
    const monthsSet = new Set(allDates.map(d => toTashkentDate(d).slice(0, 7)));
    
    const availableMonths = Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
    if (availableMonths.length === 0) {
      availableMonths.push(targetMonth);
    }

    return NextResponse.json({
      daily: dailyMap,
      monthly: monthlySummary,
      availableMonths
    });

  } catch (error) {
    console.error('Reports error:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}
