import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function getUzDayRange() {
  const d = new Date();
  d.setUTCHours(d.getUTCHours() + 5);
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), -5, 0, 0, 0));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  end.setUTCMilliseconds(-1);
  return { start, end };
}

export async function GET() {
  try {
    const { start: todayStart, end: todayEnd } = getUzDayRange();

    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: todayStart, lte: todayEnd } },
      include: { user: true, items: true, payments: true }
    });

    const todayPayments = await prisma.salePayment.findMany({
      where: { createdAt: { gte: todayStart, lte: todayEnd } }
    });

    const attendance = await prisma.attendance.findMany({
      where: { createdAt: { gte: todayStart, lte: todayEnd } },
      include: { user: true }
    });

    let cashTotal = 0;
    let cardTotal = 0;
    let terminalTotal = 0;
    let corporateTotal = 0;

    todayPayments.forEach(p => {
      const m = (p.method || '').trim().toLowerCase();
      if (m.includes('naqd') || m === 'cash') {
        cashTotal += p.amount;
      } else if (m.includes('term')) {
        terminalTotal += p.amount;
      } else if (m.includes('kart') || m === 'card') {
        cardTotal += p.amount;
      } else if (m.includes('karp') || m.includes('korp') || m === 'corporate') {
        corporateTotal += p.amount;
      } else {
        cashTotal += p.amount;
      }
    });

    // Fallback if payments were not recorded in SalePayment
    if (todayPayments.length === 0 && sales.length > 0) {
      sales.forEach(s => {
        const m = (s.paymentMethod || '').trim().toLowerCase();
        const paid = s.advance > 0 ? s.advance : (s.balance === 0 ? s.totalPrice : 0);
        if (m.includes('naqd') || m === 'cash') cashTotal += paid;
        else if (m.includes('term')) terminalTotal += paid;
        else if (m.includes('kart') || m === 'card') cardTotal += paid;
        else if (m.includes('karp') || m.includes('korp') || m === 'corporate') corporateTotal += paid;
        else cashTotal += paid;
      });
    }

    const totalRevenue = todayPayments.length > 0 
      ? todayPayments.reduce((sum, p) => sum + p.amount, 0)
      : sales.reduce((sum, s) => sum + s.totalPrice, 0);

    const totalDebt = sales.reduce((sum, s) => sum + (s.balance || 0), 0);
    
    const onTime = attendance.filter(a => a.status === 'ON_TIME').length;
    const late = attendance.filter(a => a.status === 'LATE').length;
    
    // Generate 7-day chart data
    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    
    const weekSales = await prisma.sale.findMany({
      where: { createdAt: { gte: sevenDaysAgo } }
    });
    
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStart);
      d.setDate(d.getDate() - i);
      const dayName = d.toLocaleDateString('uz-UZ', { weekday: 'short' });
      const dayStart = new Date(d);
      const dayEnd = new Date(d);
      dayEnd.setDate(dayEnd.getDate() + 1);
      dayEnd.setMilliseconds(-1);
      
      const dayTotal = weekSales
        .filter(s => s.createdAt >= dayStart && s.createdAt <= dayEnd)
        .reduce((sum, s) => sum + s.totalPrice, 0);
        
      chartData.push({ name: dayName, total: dayTotal });
    }
    
    return NextResponse.json({
      totalRevenue,
      totalDebt,
      breakdown: { 
        cash: cashTotal, 
        card: cardTotal, 
        terminal: terminalTotal, 
        corporate: corporateTotal,
        installment: totalDebt 
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
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
