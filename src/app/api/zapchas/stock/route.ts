import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  canManageZapchasUser,
  escapeHtml,
  notifyZapchasTelegram,
  resolveZapchasUser,
} from '@/lib/zapchas';
import {
  applyStockDecrement,
  applyStockIncrement,
  findOrCreateZapchasPart,
  parseNonNegativeInt,
  parseOptionalPrice,
  parsePositiveInt,
  ZapchasValidationError,
} from '@/lib/zapchasService';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { telegramId, userId, action } = body;

    const user = await resolveZapchasUser(telegramId, userId);
    if (!user) {
      return NextResponse.json({ error: 'Foydalanuvchi topilmadi' }, { status: 404 });
    }
    if (!canManageZapchasUser(user)) {
      return NextResponse.json(
        { error: 'Faqat admin yoki biriktirilgan mas\'ul xodim omborni boshqara oladi' },
        { status: 403 }
      );
    }

    if (action === 'CREATE_PART') {
      const name = String(body.name || '').trim();
      if (!name) {
        return NextResponse.json({ error: 'Zapchas nomini kiriting' }, { status: 400 });
      }
      const unit = String(body.unit || 'dona').trim() || 'dona';
      const initialQty = body.quantity !== undefined && body.quantity !== ''
        ? parseNonNegativeInt(body.quantity, "Boshlang'ich soni")
        : 0;
      const minQuantity = body.minQuantity !== undefined && body.minQuantity !== ''
        ? parseNonNegativeInt(body.minQuantity, 'Minimal qoldiq')
        : 0;
      const price = parseOptionalPrice(body.price);
      const note = body.note ? String(body.note).trim() : null;

      const created = await prisma.$transaction(async (tx) => {
        const duplicate = await tx.zapchasPart.findFirst({
          where: { name: { equals: name, mode: 'insensitive' } },
        });
        if (duplicate) {
          throw new ZapchasValidationError(`"${duplicate.name}" nomli zapchas allaqachon mavjud.`, 400);
        }

        const part = await tx.zapchasPart.create({
          data: {
            name,
            unit,
            quantity: initialQty,
            minQuantity,
            price,
            note,
          },
        });

        if (initialQty > 0) {
          await tx.zapchasTransaction.create({
            data: {
              partId: part.id,
              type: 'IN',
              quantity: initialQty,
              quantityDelta: initialQty,
              balanceAfter: initialQty,
              unitPrice: price,
              totalPrice: price !== null ? price * initialQty : null,
              note: note || "Boshlang'ich kirim",
              userId: user.id,
            },
          });
        }

        return part;
      });

      return NextResponse.json({ success: true, part: created });
    }

    if (action === 'IN') {
      const items = Array.isArray(body.items) ? body.items : [body];
      if (items.length === 0) {
        return NextResponse.json({ error: 'Kamida bitta zapchas kiriting' }, { status: 400 });
      }

      const cleanBatchNote = body.note ? String(body.note).trim() : null;

      const parsedItems = items.map((item: any) => ({
        partId: item.partId ? String(item.partId).trim() : undefined,
        partName: item.partName ? String(item.partName).trim() : undefined,
        unit: item.unit ? String(item.unit).trim() : undefined,
        quantity: parsePositiveInt(item.quantity, 'Kelgan soni'),
        unitPrice: parseOptionalPrice(item.unitPrice ?? item.price),
        minQuantity:
          item.minQuantity !== undefined && item.minQuantity !== ''
            ? parseNonNegativeInt(item.minQuantity, 'Minimal qoldiq')
            : undefined,
        note: item.note ? String(item.note).trim() : null,
      }));

      const results = await prisma.$transaction(async (tx) => {
        const createdTransactions = [];

        for (const item of parsedItems) {
          const part = await findOrCreateZapchasPart(tx, {
            partId: item.partId,
            partName: item.partName,
            unit: item.unit,
            price: item.unitPrice,
            minQuantity: item.minQuantity,
          });

          const updatedPart = await applyStockIncrement(tx, part.id, item.quantity, {
            unit: item.unit,
            price: item.unitPrice,
            minQuantity: item.minQuantity,
          });

          const effectivePrice = item.unitPrice ?? updatedPart.price ?? null;
          const totalPrice = effectivePrice !== null ? effectivePrice * item.quantity : null;

          const txRecord = await tx.zapchasTransaction.create({
            data: {
              partId: part.id,
              type: 'IN',
              quantity: item.quantity,
              quantityDelta: item.quantity,
              balanceAfter: updatedPart.quantity,
              unitPrice: effectivePrice,
              totalPrice,
              note: item.note || cleanBatchNote || 'Kirim (Kelgan)',
              userId: user.id,
            },
            include: {
              part: { select: { id: true, name: true, unit: true } },
              user: { select: { id: true, name: true, role: true } },
            },
          });

          createdTransactions.push(txRecord);
        }

        return createdTransactions;
      });

      const lines = results.map(
        (r, idx) =>
          `${idx + 1}. <b>${escapeHtml(r.part.name)}</b>: +${r.quantity} ${escapeHtml(r.part.unit)} (Jami qoldiq: <b>${r.balanceAfter}</b>)`
      );
      const msg =
        `📥 <b>Zapchas Kirim (Keldi)</b>\n\n` +
        `👤 <b>Kiritdi:</b> ${escapeHtml(user.name)}\n` +
        (cleanBatchNote ? `📝 <b>Izoh:</b> ${escapeHtml(cleanBatchNote)}\n` : '') +
        `\n📦 <b>Kelgan zapchaslar:</b>\n${lines.join('\n')}`;

      await notifyZapchasTelegram(msg, {
        includeManagers: false,
        excludeTelegramId: user.telegramId,
      });

      return NextResponse.json({ success: true, transactions: results });
    }

    if (action === 'OUT') {
      const partId = String(body.partId || '').trim();
      if (!partId) {
        return NextResponse.json({ error: 'Zapchasni tanlang' }, { status: 400 });
      }
      const quantity = parsePositiveInt(body.quantity, 'Chiqim soni');
      const unitPrice = parseOptionalPrice(body.unitPrice ?? body.price);
      const customerName = body.customerName ? String(body.customerName).trim() : null;
      const note = body.note ? String(body.note).trim() : null;

      const txRecord = await prisma.$transaction(async (tx) => {
        const updatedPart = await applyStockDecrement(tx, partId, quantity);
        const effectivePrice = unitPrice ?? updatedPart.price ?? null;
        return tx.zapchasTransaction.create({
          data: {
            partId,
            type: 'OUT',
            quantity,
            quantityDelta: -quantity,
            balanceAfter: updatedPart.quantity,
            unitPrice: effectivePrice,
            totalPrice: effectivePrice !== null ? effectivePrice * quantity : null,
            customerName,
            note: note || 'Chiqim',
            userId: user.id,
          },
          include: {
            part: { select: { id: true, name: true, unit: true } },
            user: { select: { id: true, name: true, role: true } },
          },
        });
      });

      return NextResponse.json({ success: true, transaction: txRecord });
    }

    if (action === 'ADJUST') {
      const partId = String(body.partId || '').trim();
      if (!partId) {
        return NextResponse.json({ error: 'Zapchasni tanlang' }, { status: 400 });
      }
      const newQuantity = parseNonNegativeInt(body.newQuantity, 'Yangi qoldiq soni');
      const note = body.note ? String(body.note).trim() : 'Qoldiq qo\'lda tuzatildi';

      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.zapchasPart.findUnique({ where: { id: partId } });
        if (!existing) {
          throw new ZapchasValidationError('Zapchas topilmadi.', 404);
        }

        const delta = newQuantity - existing.quantity;
        if (delta === 0) {
          return { part: existing, transaction: null };
        }

        const updatedPart = await tx.zapchasPart.update({
          where: { id: partId },
          data: { quantity: newQuantity },
        });

        const txRecord = await tx.zapchasTransaction.create({
          data: {
            partId,
            type: 'ADJUST',
            quantity: Math.abs(delta),
            quantityDelta: delta,
            balanceAfter: newQuantity,
            note: `${note} (${existing.quantity} → ${newQuantity})`,
            userId: user.id,
          },
          include: {
            part: { select: { id: true, name: true, unit: true } },
            user: { select: { id: true, name: true, role: true } },
          },
        });

        await tx.auditLog.create({
          data: {
            action: 'ADJUST_ZAPCHAS_STOCK',
            entity: 'ZapchasPart',
            entityId: partId,
            details: JSON.stringify({
              partName: existing.name,
              previousQty: existing.quantity,
              newQty: newQuantity,
              delta,
              note,
            }),
            user: user.name,
          },
        });

        return { part: updatedPart, transaction: txRecord };
      });

      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ error: "Noto'g'ri amal turi" }, { status: 400 });
  } catch (error: any) {
    if (error instanceof ZapchasValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error managing zapchas stock:', error);
    return NextResponse.json({ error: 'Zapchas omborini yangilashda xatolik' }, { status: 500 });
  }
}
