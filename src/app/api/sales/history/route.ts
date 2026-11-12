import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const telegramId = searchParams.get('telegramId');

    if (!telegramId) {
      return NextResponse.json({ error: 'Missing telegramId' }, { status: 400 });
    }

    const monthParam = searchParams.get('month');
    const tashkentNow = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tashkent' });
    const [curYear, curMonth] = tashkentNow.split('-').map(Number);

    const [year, month] = monthParam ? monthParam.split('-').map(Number) : [curYear, curMonth];
    // Tashkent UTC+5 boundaries converted to UTC
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1, -5, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, month, 0, 18, 59, 59, 999));

    const whereClause: Prisma.SaleWhereInput = { user: { telegramId } };
    
    if (monthParam) {
      whereClause.createdAt = { gte: startOfMonth, lte: endOfMonth };
    } else {
      whereClause.OR = [
        { createdAt: { gte: startOfMonth, lte: endOfMonth } },
        { balance: { gt: 0 } },
        { status: 'INCOMPLETE' }
      ];
    }

    const sales = await prisma.sale.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        items: true,
        orders: true,
        payments: true
      },
      take: 100
    });

    return NextResponse.json({ sales });
  } catch (error) {
    console.error('Error fetching sales history:', error);
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}
