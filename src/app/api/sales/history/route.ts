import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const telegramId = searchParams.get('telegramId');

    if (!telegramId) {
      return NextResponse.json({ error: 'Missing telegramId' }, { status: 400 });
    }

    const monthParam = searchParams.get('month');
    const now = new Date();
    
    let startOfMonth: Date;
    let endOfMonth: Date;

    if (monthParam) {
      const [year, month] = monthParam.split('-').map(Number);
      startOfMonth = new Date(year, month - 1, 1);
      endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
    } else {
      startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }
    
    const whereClause: any = { user: { telegramId } };
    
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
        items: true
      },
      take: 100
    });

    return NextResponse.json({ sales });
  } catch (error) {
    console.error('Error fetching sales history:', error);
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}
