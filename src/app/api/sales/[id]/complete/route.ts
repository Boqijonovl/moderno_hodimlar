import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { id } = params;

    const sale = await prisma.sale.findUnique({
      where: { id }
    });

    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    if (sale.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Bu savdo allaqachon yakunlangan' }, { status: 400 });
    }

    const updatedSale = await prisma.sale.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        advance: sale.totalPrice,
        balance: 0
      }
    });

    return NextResponse.json(updatedSale);
  } catch (error: any) {
    console.error('Error completing sale:', error);
    return NextResponse.json({ error: 'Failed to complete sale' }, { status: 500 });
  }
}
