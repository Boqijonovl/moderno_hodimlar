import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');

    const whereClause: any = {};
    if (userId) {
      whereClause.OR = [
        { assignedToId: userId },
        { creatorId: userId }
      ];
      whereClause.status = { not: 'COMPLETED' }; // mostly employees only want active ones
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        assignedTo: true,
        creator: true,
        sale: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
