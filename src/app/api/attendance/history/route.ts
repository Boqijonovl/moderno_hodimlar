import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const telegramId = searchParams.get('telegramId');

    if (!telegramId) {
      return NextResponse.json({ error: 'Missing telegramId' }, { status: 400 });
    }

    const attendances = await prisma.attendance.findMany({
      where: {
        user: { telegramId }
      },
      orderBy: { date: 'desc' },
      take: 30
    });

    return NextResponse.json({ attendances });
  } catch (error) {
    console.error('Error fetching attendance history:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}
