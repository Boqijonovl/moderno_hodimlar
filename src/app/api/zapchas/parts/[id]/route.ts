import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canManageZapchasUser, resolveZapchasUser } from '@/lib/zapchas';
import {
  parseNonNegativeInt,
  parseOptionalPrice,
  ZapchasValidationError,
} from '@/lib/zapchasService';

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const body = await req.json();
    const { telegramId, userId, name, unit, minQuantity, price, note } = body;

    const actor = await resolveZapchasUser(telegramId, userId);
    if (!actor) {
      return NextResponse.json({ error: 'Foydalanuvchi topilmadi' }, { status: 404 });
    }
    if (!canManageZapchasUser(actor)) {
      return NextResponse.json(
        { error: 'Faqat admin yoki mas\'ul xodim zapchasni tahrirlay oladi' },
        { status: 403 }
      );
    }

    const existing = await prisma.zapchasPart.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Zapchas topilmadi' }, { status: 404 });
    }

    const trimmedName = name !== undefined ? String(name).trim() : existing.name;
    if (!trimmedName) {
      return NextResponse.json({ error: 'Zapchas nomi bo\'sh bo\'lishi mumkin emas' }, { status: 400 });
    }

    if (trimmedName.toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = await prisma.zapchasPart.findFirst({
        where: { name: { equals: trimmedName, mode: 'insensitive' }, id: { not: id } },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: `"${duplicate.name}" nomli zapchas allaqachon mavjud` },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.zapchasPart.update({
      where: { id },
      data: {
        name: trimmedName,
        unit: unit !== undefined ? String(unit).trim() || 'dona' : undefined,
        minQuantity:
          minQuantity !== undefined && minQuantity !== ''
            ? parseNonNegativeInt(minQuantity, 'Minimal qoldiq')
            : undefined,
        price: price !== undefined ? parseOptionalPrice(price) : undefined,
        note: note !== undefined ? (note ? String(note).trim() : null) : undefined,
      },
    });

    return NextResponse.json({ success: true, part: updated });
  } catch (error: unknown) {
    if (error instanceof ZapchasValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error updating zapchas part:', error);
    return NextResponse.json({ error: 'Zapchasni yangilashda xatolik' }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const { searchParams } = new URL(req.url);
    const telegramId = searchParams.get('telegramId');

    const actor = await resolveZapchasUser(telegramId);
    if (!actor) {
      return NextResponse.json({ error: 'Foydalanuvchi topilmadi' }, { status: 404 });
    }
    if (!canManageZapchasUser(actor)) {
      return NextResponse.json(
        { error: 'Faqat admin yoki mas\'ul xodim zapchasni o\'chira oladi' },
        { status: 403 }
      );
    }

    const existing = await prisma.zapchasPart.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Zapchas topilmadi' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.zapchasPart.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          action: 'DELETE_ZAPCHAS_PART',
          entity: 'ZapchasPart',
          entityId: id,
          details: JSON.stringify({
            name: existing.name,
            quantity: existing.quantity,
            unit: existing.unit,
          }),
          user: actor.name,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting zapchas part:', error);
    return NextResponse.json({ error: 'Zapchasni o\'chirishda xatolik' }, { status: 500 });
  }
}
