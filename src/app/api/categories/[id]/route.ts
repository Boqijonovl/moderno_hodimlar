import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const body = await req.json();
    
    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const updated = await prisma.category.update({
      where: { id: resolvedParams.id },
      data: { name: body.name }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    
    // Check if category is used in sales
    const count = await prisma.sale.count({
      where: { categoryId: resolvedParams.id }
    });

    if (count > 0) {
      return NextResponse.json({ error: 'Ushbu kategoriyada sotuvlar mavjud, uni o\'chirib bo\'lmaydi' }, { status: 400 });
    }

    await prisma.category.delete({
      where: { id: resolvedParams.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
