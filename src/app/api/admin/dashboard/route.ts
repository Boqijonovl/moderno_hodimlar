import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sales = await prisma.sale.findMany({
      where: { date: { gte: today } },
    });

    const attendance = await prisma.attendance.findMany({
      where: { date: { gte: today } },
      include: { user: true }
    });

    const totalCash = sales.filter(s => s.paymentMethod === 'CASH').reduce((sum, s) => sum + s.totalPrice, 0);
    const totalCard = sales.filter(s => s.paymentMethod === 'CARD').reduce((sum, s) => sum + s.totalPrice, 0);
    const totalInstallment = sales.filter(s => s.paymentMethod === 'INSTALLMENT').reduce((sum, s) => sum + s.totalPrice, 0);
    
    const onTime = attendance.filter(a => a.status === 'ON_TIME').length;
    const late = attendance.filter(a => a.status === 'LATE').length;
    
    // Generate 7-day chart data
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0,0,0,0);
    
    const weekSales = await prisma.sale.findMany({
      where: { date: { gte: sevenDaysAgo } }
    });
    
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = d.toLocaleDateString('uz-UZ', { weekday: 'short' });
      const dayStart = new Date(d);
      dayStart.setHours(0,0,0,0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23,59,59,999);
      
      const dayTotal = weekSales
        .filter(s => s.date >= dayStart && s.date <= dayEnd)
        .reduce((sum, s) => sum + s.totalPrice, 0);
        
      chartData.push({ name: dayName, total: dayTotal });
    }
    
    return NextResponse.json({
      totalRevenue: totalCash + totalCard + totalInstallment,
      breakdown: { cash: totalCash, card: totalCard, installment: totalInstallment },
      salesCount: sales.length,
      attendance: { total: attendance.length, onTime, late },
      chartData,
      recentSales: await prisma.sale.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { user: true, items: true }
      })
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
