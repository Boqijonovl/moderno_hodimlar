import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const telegramId = searchParams.get('telegramId');

    if (!telegramId) {
      return NextResponse.json({ error: 'Missing telegramId' }, { status: 400 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const sales = await prisma.sale.findMany({
      where: {
        user: { telegramId },
        OR: [
          { createdAt: { gte: startOfMonth } },
          { balance: { gt: 0 } },
          { status: 'INCOMPLETE' }
        ]
      },
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
