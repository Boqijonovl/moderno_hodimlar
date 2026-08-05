import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const methods = await prisma.paymentMethod.findMany({
      orderBy: { createdAt: 'asc' }
    });
    return NextResponse.json(methods);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch payment methods' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name } = body;

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const method = await prisma.paymentMethod.create({
      data: { name }
    });

    return NextResponse.json(method);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'This payment method already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create payment method' }, { status: 500 });
  }
}
