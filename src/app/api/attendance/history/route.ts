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
    const tashkentNow = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tashkent' });
    const [curYear, curMonth] = tashkentNow.split('-').map(Number);

    const [year, month] = monthParam ? monthParam.split('-').map(Number) : [curYear, curMonth];
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const attendances = await prisma.attendance.findMany({
      where: {
        user: { telegramId },
        OR: [
          { date: { gte: startOfMonth, lte: endOfMonth } },
          { checkOutTime: null }
        ]
      },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 100
    });

    return NextResponse.json({ attendances });
  } catch (error) {
    console.error('Error fetching attendance history:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}
