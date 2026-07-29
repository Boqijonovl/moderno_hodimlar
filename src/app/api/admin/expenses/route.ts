import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const expenses = await prisma.expense.findMany({
      include: {
        user: {
          select: { name: true, phone: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100 // Last 100 expenses
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}
