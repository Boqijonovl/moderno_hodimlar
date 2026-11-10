import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  canSellZapchasUser,
  escapeHtml,
  notifyZapchasTelegram,
  resolveZapchasUser,
} from '@/lib/zapchas';
import {
  applyStockDecrement,
  parseOptionalPrice,
  parsePositiveInt,
  ZapchasValidationError,
} from '@/lib/zapchasService';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { telegramId, userId, items, customerName, note } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Kamida bitta zapchas tanlang' }, { status: 400 });
    }

    const user = await resolveZapchasUser(telegramId, userId);
    if (!user) {
      return NextResponse.json({ error: 'Foydalanuvchi topilmadi' }, { status: 404 });
    }
    if (!canSellZapchasUser(user)) {
      return NextResponse.json({ error: 'Sizga zapchas sotish ruxsati berilmagan' }, { status: 403 });
    }

    interface SellRequestItem {
      partId?: string;
      quantity?: unknown;
      unitPrice?: unknown;
      note?: string;
    }

    const parsedItems = (items as SellRequestItem[]).map((item) => ({
      partId: String(item.partId || '').trim(),
      quantity: parsePositiveInt(item.quantity, 'Sotilgan soni'),
      unitPrice: parseOptionalPrice(item.unitPrice),
      note: item.note ? String(item.note).trim() : null,
    }));

    if (parsedItems.some((i) => !i.partId)) {
      return NextResponse.json({ error: "Ro'yxatdagi mavjud zapchaslardan tanlang" }, { status: 400 });
    }

    const cleanCustomer = customerName ? String(customerName).trim() : null;
    const cleanBatchNote = note ? String(note).trim() : null;

    const results = await prisma.$transaction(async (tx) => {
      const createdTransactions = [];

      for (const item of parsedItems) {
        const updatedPart = await applyStockDecrement(tx, item.partId, item.quantity);
        const effectiveUnitPrice = item.unitPrice ?? updatedPart.price ?? null;
        const totalPrice = effectiveUnitPrice !== null ? effectiveUnitPrice * item.quantity : null;

        const txRecord = await tx.zapchasTransaction.create({
          data: {
            partId: item.partId,
            type: 'OUT',
            quantity: item.quantity,
            quantityDelta: -item.quantity,
            balanceAfter: updatedPart.quantity,
            unitPrice: effectiveUnitPrice,
            totalPrice,
            customerName: cleanCustomer,
            note: item.note || cleanBatchNote,
            userId: user.id,
          },
          include: {
            part: { select: { id: true, name: true, unit: true, minQuantity: true } },
            user: { select: { id: true, name: true, role: true } },
          },
        });

        createdTransactions.push(txRecord);
      }

      return createdTransactions;
    });

    // Notify Admins and assigned Zapchas Manager(s)
    const lines = results.map((r, idx) => {
      const lowAlert =
        r.balanceAfter === 0
          ? ' 🔴 <b>(TUGADI!)</b>'
          : r.part.minQuantity > 0 && r.balanceAfter <= r.part.minQuantity
            ? ' 🟡 <b>(Kam qoldi)</b>'
            : '';
      const priceText = r.totalPrice ? ` • ${r.totalPrice.toLocaleString()} so'm` : '';
      return `${idx + 1}. <b>${escapeHtml(r.part.name)}</b>: -${r.quantity} ${escapeHtml(r.part.unit)}${priceText} (Qoldiq: <b>${r.balanceAfter}</b>)${lowAlert}`;
    });

    const extraInfo = [
      cleanCustomer ? `🏷 <b>Mijoz / Buyurtma:</b> ${escapeHtml(cleanCustomer)}` : '',
      cleanBatchNote ? `📝 <b>Izoh:</b> ${escapeHtml(cleanBatchNote)}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const msg =
      `🔧 <b>Zapchas Sotildi (Chiqim)</b>\n\n` +
      `👤 <b>Sotuvchi:</b> ${escapeHtml(user.name)}\n` +
      (extraInfo ? `${extraInfo}\n` : '') +
      `\n📦 <b>Sotilgan zapchaslar:</b>\n${lines.join('\n')}`;

    await notifyZapchasTelegram(msg, {
      includeManagers: true,
      excludeTelegramId: user.telegramId,
    });

    return NextResponse.json({ success: true, transactions: results });
  } catch (error: unknown) {
    if (error instanceof ZapchasValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error recording zapchas sale:', error);
    return NextResponse.json({ error: 'Zapchas sotuvini saqlashda xatolik' }, { status: 500 });
  }
}
