import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const offcuts = await prisma.offcut.findMany({
      where: { isUsed: false },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ offcuts });
  } catch (error) {
    console.error('Error fetching offcuts:', error);
    return NextResponse.json({ error: 'Failed to fetch offcuts' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Support single object or array of offcuts
    if (Array.isArray(body)) {
      const created = await Promise.all(
        body.map(item =>
          prisma.offcut.create({
            data: {
              material: item.material || 'DSP 18mm',
              width: parseFloat(item.width),
              length: parseFloat(item.length),
              thickness: item.thickness ? parseFloat(item.thickness) : 18,
              quantity: item.quantity ? parseInt(item.quantity) : 1,
              note: item.note || null,
              source: item.source || 'Raskroy qoldig\'i'
            }
          })
        )
      );
      return NextResponse.json({ success: true, count: created.length, offcuts: created });
    } else {
      const { material, width, length, thickness, quantity, note, source } = body;
      const offcut = await prisma.offcut.create({
        data: {
          material: material || 'DSP 18mm',
          width: parseFloat(width),
          length: parseFloat(length),
          thickness: thickness ? parseFloat(thickness) : 18,
          quantity: quantity ? parseInt(quantity) : 1,
          note: note || null,
          source: source || 'Qo\'lda kiritilgan'
        }
      });
      return NextResponse.json({ success: true, offcut });
    }
  } catch (error: any) {
    console.error('Error creating offcut:', error);
    return NextResponse.json({ error: error.message || 'Failed to save offcut' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, isUsed } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    const updated = await prisma.offcut.update({
      where: { id },
      data: { isUsed: isUsed !== undefined ? isUsed : true }
    });

    return NextResponse.json({ success: true, offcut: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update offcut' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    await prisma.offcut.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete offcut' }, { status: 500 });
  }
}
