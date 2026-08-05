import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get('month'); // Format: YYYY-MM
    
    let startDate: Date;
    let endDate: Date;

    if (monthParam) {
      const [year, month] = monthParam.split('-').map(Number);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const users = await prisma.user.findMany({
      where: { active: true } 
    });

    const attendances = await prisma.attendance.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      include: { user: true }
    });

    const sales = await prisma.sale.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      include: { user: true }
    });
    
    const salePayments = await prisma.salePayment.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      include: { sale: true }
    });

    const expenses = await prisma.expense.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      include: { user: true }
    });

    // Process daily reports
    const dailyMap: Record<string, any[]> = {};
    const dates = new Set([
      ...attendances.map(a => a.date.toISOString().split('T')[0]),
      ...sales.map(s => s.date.toISOString().split('T')[0]),
      ...salePayments.map(p => p.createdAt.toISOString().split('T')[0]),
      ...expenses.map(e => e.createdAt.toISOString().split('T')[0])
    ]);

    Array.from(dates).sort((a, b) => b.localeCompare(a)).forEach(dateStr => {
      const dayUsers = users.map(user => {
        const userAtt = attendances.find(a => a.userId === user.id && a.date.toISOString().split('T')[0] === dateStr);
        const userSales = sales.filter(s => s.userId === user.id && s.date.toISOString().split('T')[0] === dateStr);
        const userPayments = salePayments.filter(p => p.sale.userId === user.id && p.createdAt.toISOString().split('T')[0] === dateStr);
        const userExpenses = expenses.filter(e => e.userId === user.id && e.createdAt.toISOString().split('T')[0] === dateStr);
        
        // Calculate payment breakdown for this day
        const paymentBreakdown: Record<string, number> = {};
        userPayments.forEach(p => {
          paymentBreakdown[p.method] = (paymentBreakdown[p.method] || 0) + p.amount;
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
      
      let totalLateMinutes = userAtts.reduce((sum, a) => sum + a.lateMinutes, 0);
      
      const paymentBreakdown: Record<string, number> = {};
      userPayments.forEach(p => {
        paymentBreakdown[p.method] = (paymentBreakdown[p.method] || 0) + p.amount;
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
    const allAtts = await prisma.attendance.findMany({ select: { date: true } });
    const allSales = await prisma.sale.findMany({ select: { date: true } });
    const allExps = await prisma.expense.findMany({ select: { createdAt: true } });
    const allDates = [...allAtts.map(a => a.date), ...allSales.map(s => s.date), ...allExps.map(e => e.createdAt)];
    const monthsSet = new Set(allDates.map(d => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    }));
    
    const availableMonths = Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
    if (availableMonths.length === 0) {
      const now = new Date();
      availableMonths.push(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    }

    return NextResponse.json({
      daily: dailyMap,
      monthly: monthlySummary,
      availableMonths
    });

  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}
