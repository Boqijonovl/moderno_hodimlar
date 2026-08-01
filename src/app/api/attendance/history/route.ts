import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const telegramId = searchParams.get('telegramId');

    if (!telegramId) {
      return NextResponse.json({ error: 'Missing telegramId' }, { status: 400 });
    }

    const monthParam = searchParams.get('month'); // YYYY-MM
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

    const attendances = await prisma.attendance.findMany({
      where: {
        user: { telegramId },
        date: { gte: startOfMonth, lte: endOfMonth }
      },
      orderBy: { date: 'desc' },
      take: 100
    });

    return NextResponse.json({ attendances });
  } catch (error) {
    console.error('Error fetching attendance history:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}
