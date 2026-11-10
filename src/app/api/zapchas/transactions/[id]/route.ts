import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canManageZapchasUser, resolveZapchasUser } from '@/lib/zapchas';
import {
  parseOptionalPrice,
  parsePositiveInt,
  ZapchasValidationError,
} from '@/lib/zapchasService';

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const body = await req.json();
    const { telegramId, userId, quantity, note, customerName, unitPrice } = body;

    const actor = await resolveZapchasUser(telegramId, userId);
    if (!actor) {
      return NextResponse.json({ error: 'Foydalanuvchi topilmadi' }, { status: 404 });
    }
    if (!canManageZapchasUser(actor)) {
      return NextResponse.json(
        { error: 'Faqat admin yoki mas\'ul xodim yozuvlarni tahrirlay oladi' },
        { status: 403 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const existingTx = await tx.zapchasTransaction.findUnique({
        where: { id },
        include: { part: true },
      });
      if (!existingTx) {
        throw new ZapchasValidationError('Harakat yozuvi topilmadi.', 404);
      }

      let newQty = existingTx.quantity;
      let newDelta = existingTx.quantityDelta;
      let newPartQty = existingTx.part.quantity;

      if (quantity !== undefined && existingTx.type !== 'ADJUST') {
        newQty = parsePositiveInt(quantity, 'Soni');
        newDelta = existingTx.type === 'IN' ? newQty : -newQty;
        const diff = newDelta - existingTx.quantityDelta;
        newPartQty = existingTx.part.quantity + diff;

        if (newPartQty < 0) {
          throw new ZapchasValidationError(
            `Ombordagi qoldiq manfiy bo'lib qoladi ("${existingTx.part.name}": hozir ${existingTx.part.quantity} ${existingTx.part.unit}).`,
            400
          );
        }

        if (diff !== 0) {
          await tx.zapchasPart.update({
            where: { id: existingTx.partId },
            data: { quantity: newPartQty },
          });
        }
      }

      const parsedUnitPrice =
        unitPrice !== undefined ? parseOptionalPrice(unitPrice) : existingTx.unitPrice;
      const totalPrice = parsedUnitPrice !== null ? parsedUnitPrice * newQty : null;

      const savedTx = await tx.zapchasTransaction.update({
        where: { id },
        data: {
          quantity: newQty,
          quantityDelta: newDelta,
          balanceAfter: newPartQty,
          unitPrice: parsedUnitPrice,
          totalPrice,
          customerName:
            customerName !== undefined
              ? customerName
                ? String(customerName).trim()
                : null
              : undefined,
          note: note !== undefined ? (note ? String(note).trim() : null) : undefined,
        },
        include: {
          part: { select: { id: true, name: true, unit: true } },
          user: { select: { id: true, name: true, role: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'EDIT_ZAPCHAS_TX',
          entity: 'ZapchasTransaction',
          entityId: id,
          details: JSON.stringify({
            partName: existingTx.part.name,
            type: existingTx.type,
            oldQty: existingTx.quantity,
            newQty,
            oldPartBalance: existingTx.part.quantity,
            newPartBalance: newPartQty,
          }),
          user: actor.name,
        },
      });

      return savedTx;
    });

    return NextResponse.json({ success: true, transaction: updated });
  } catch (error: any) {
    if (error instanceof ZapchasValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error editing zapchas transaction:', error);
    return NextResponse.json({ error: 'Yozuvni tahrirlashda xatolik' }, { status: 500 });
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
        { error: 'Faqat admin yoki mas\'ul xodim yozuvni o\'chira oladi' },
        { status: 403 }
      );
    }

    await prisma.$transaction(async (tx) => {
      const existingTx = await tx.zapchasTransaction.findUnique({
        where: { id },
        include: { part: true, user: { select: { name: true } } },
      });
      if (!existingTx) {
        throw new ZapchasValidationError('Harakat yozuvi topilmadi.', 404);
      }

      const revertedQty = existingTx.part.quantity - existingTx.quantityDelta;
      if (revertedQty < 0) {
        throw new ZapchasValidationError(
          `Bu kirimni o'chirib bo'lmaydi, chunki "${existingTx.part.name}" ning bir qismi allaqachon sotilgan (Omborda: ${existingTx.part.quantity} ${existingTx.part.unit}).`,
          400
        );
      }

      await tx.zapchasPart.update({
        where: { id: existingTx.partId },
        data: { quantity: revertedQty },
      });

      await tx.zapchasTransaction.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          action: 'DELETE_ZAPCHAS_TX',
          entity: 'ZapchasTransaction',
          entityId: id,
          details: JSON.stringify({
            partName: existingTx.part.name,
            type: existingTx.type,
            quantity: existingTx.quantity,
            quantityDelta: existingTx.quantityDelta,
            actorName: existingTx.user?.name,
            revertedPartQty: revertedQty,
          }),
          user: actor.name,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof ZapchasValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error deleting zapchas transaction:', error);
    return NextResponse.json({ error: 'Yozuvni o\'chirishda xatolik' }, { status: 500 });
  }
}
