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

    const totalCash = sales.filter(s => s.paymentMethod === 'CASH').reduce((sum, s) => sum + s.price, 0);
    const totalCard = sales.filter(s => s.paymentMethod === 'CARD').reduce((sum, s) => sum + s.price, 0);
    const totalInstallment = sales.filter(s => s.paymentMethod === 'INSTALLMENT').reduce((sum, s) => sum + s.price, 0);
    
    const onTime = attendance.filter(a => a.status === 'ON_TIME').length;
    const late = attendance.filter(a => a.status === 'LATE').length;
    
    return NextResponse.json({
      totalRevenue: totalCash + totalCard + totalInstallment,
      breakdown: { cash: totalCash, card: totalCard, installment: totalInstallment },
      salesCount: sales.length,
      attendance: { total: attendance.length, onTime, late },
      recentSales: await prisma.sale.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { user: true, category: true }
      })
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
