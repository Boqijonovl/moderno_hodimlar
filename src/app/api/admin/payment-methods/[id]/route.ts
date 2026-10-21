import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const body = await req.json();
    const { name, isActive } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = String(name).trim();
    if (isActive !== undefined) updateData.isActive = isActive;

    const method = await prisma.paymentMethod.update({
      where: { id: params.id },
      data: updateData
    });

    return NextResponse.json(method);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update payment method' }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    await prisma.paymentMethod.delete({
      where: { id: params.id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete payment method' }, { status: 500 });
  }
}
