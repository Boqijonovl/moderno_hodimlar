import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizePaymentMethod } from '@/lib/formatters';
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

interface SellRequestItem {
  partId?: string;
  quantity?: unknown;
  unitPrice?: unknown;
  note?: string;
}

interface PaymentDetailInput {
  method?: string;
  amount?: unknown;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      telegramId,
      userId,
      items,
      paymentDetails,
      customerName,
      customerPhone,
      note,
    } = body;

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

    const parsedItems = (items as SellRequestItem[]).map((item) => ({
      partId: String(item.partId || '').trim(),
      quantity: parsePositiveInt(item.quantity, 'Sotilgan soni'),
      unitPrice: parseOptionalPrice(item.unitPrice),
      note: item.note ? String(item.note).trim() : null,
    }));

    if (parsedItems.some((i) => !i.partId)) {
      return NextResponse.json({ error: "Ro'yxatdagi mavjud zapchaslardan tanlang" }, { status: 400 });
    }

    const rawPayments = Array.isArray(paymentDetails) ? (paymentDetails as PaymentDetailInput[]) : [];
    const activePayments = rawPayments
      .map((p) => {
        const cleaned = typeof p.amount === 'string' ? p.amount.replace(/\s+/g, '') : p.amount;
        const amount = Number(cleaned) || 0;
        return {
          method: normalizePaymentMethod(String(p.method || 'Naqd')),
          amount,
        };
      })
      .filter((p) => p.amount > 0);

    const cleanCustomer = customerName ? String(customerName).trim() : null;
    const cleanPhone = customerPhone ? String(customerPhone).trim() : null;
    const cleanBatchNote = note ? String(note).trim() : null;

    const saleResult = await prisma.$transaction(async (tx) => {
      // 1. Validate & decrement stock for each item, compute line totals
      const preparedLines: Array<{
        partId: string;
        partName: string;
        unit: string;
        minQuantity: number;
        quantity: number;
        balanceAfter: number;
        unitPrice: number;
        lineTotal: number;
        note: string | null;
      }> = [];

      for (const item of parsedItems) {
        const updatedPart = await applyStockDecrement(tx, item.partId, item.quantity);
        const effectiveUnitPrice = item.unitPrice ?? updatedPart.price ?? 0;
        const lineTotal = effectiveUnitPrice * item.quantity;

        preparedLines.push({
          partId: item.partId,
          partName: updatedPart.name,
          unit: updatedPart.unit,
          minQuantity: updatedPart.minQuantity,
          quantity: item.quantity,
          balanceAfter: updatedPart.quantity,
          unitPrice: effectiveUnitPrice,
          lineTotal,
          note: item.note || cleanBatchNote,
        });
      }

      const totalPrice = preparedLines.reduce((sum, line) => sum + line.lineTotal, 0);
      const advance = activePayments.reduce((sum, p) => sum + p.amount, 0);

      if (advance > totalPrice) {
        throw new ZapchasValidationError(
          "To'langan summa umumiy savdo summasidan ko'p bo'lishi mumkin emas!",
          400
        );
      }

      const balance = Math.max(0, totalPrice - advance);
      const status = balance > 0 ? 'INCOMPLETE' : 'COMPLETED';

      let paymentMethod = 'Aralash';
      if (activePayments.length === 1) {
        paymentMethod = activePayments[0].method;
      } else if (activePayments.length === 0) {
        paymentMethod = totalPrice > 0 ? 'Nasiya' : 'Naqd';
      }

      const sale = await tx.zapchasSale.create({
        data: {
          userId: user.id,
          customerName: cleanCustomer,
          customerPhone: cleanPhone,
          totalPrice,
          advance,
          balance,
          paymentMethod,
          status,
          note: cleanBatchNote,
          payments: {
            create: activePayments.map((p) => ({
              method: p.method,
              amount: p.amount,
            })),
          },
          transactions: {
            create: preparedLines.map((line) => ({
              partId: line.partId,
              type: 'OUT',
              quantity: line.quantity,
              quantityDelta: -line.quantity,
              balanceAfter: line.balanceAfter,
              unitPrice: line.unitPrice,
              totalPrice: line.lineTotal,
              customerName: cleanCustomer,
              note: line.note,
              userId: user.id,
            })),
          },
        },
        include: {
          user: { select: { id: true, name: true, role: true } },
          payments: true,
          transactions: {
            include: {
              part: { select: { id: true, name: true, unit: true, minQuantity: true } },
            },
          },
        },
      });

      return { sale, preparedLines };
    });

    const { sale, preparedLines } = saleResult;

    const itemsLines = preparedLines.map((line, idx) => {
      const lowAlert =
        line.balanceAfter === 0
          ? ' 🔴 <b>(TUGADI!)</b>'
          : line.minQuantity > 0 && line.balanceAfter <= line.minQuantity
            ? ' 🟡 <b>(Kam qoldi)</b>'
            : '';
      return `${idx + 1}. <b>${escapeHtml(line.partName)}</b>: ${line.quantity} ${escapeHtml(line.unit)} × ${line.unitPrice.toLocaleString()} = <b>${line.lineTotal.toLocaleString()} so'm</b> (Qoldiq: ${line.balanceAfter})${lowAlert}`;
    });

    let customerBlock = '';
    if (cleanCustomer) customerBlock += `\n🏷 <b>Mijoz:</b> ${escapeHtml(cleanCustomer)}`;
    if (cleanPhone) customerBlock += `\n📞 <b>Telefon:</b> <code>${escapeHtml(cleanPhone)}</code>`;
    if (cleanBatchNote) customerBlock += `\n📝 <b>Izoh:</b> ${escapeHtml(cleanBatchNote)}`;

    let amountBlock = `\n\n💰 <b>Jami summa:</b> <b>${sale.totalPrice.toLocaleString()} so'm</b>`;
    if (sale.balance > 0) {
      amountBlock += `\n💵 <b>To'landi:</b> <b>${sale.advance.toLocaleString()} so'm</b>`;
      amountBlock += `\n⚠️ <b>Qarz (Nasiya):</b> <b>${sale.balance.toLocaleString()} so'm</b>`;
    }

    const paymentBreakdownText =
      sale.payments.length > 0
        ? `\n\n💳 <b>To'lov turi:</b> ${escapeHtml(sale.paymentMethod)}\n` +
          sale.payments.map((p) => `- ${escapeHtml(p.method)}: ${p.amount.toLocaleString()} so'm`).join('\n')
        : `\n\n💳 <b>To'lov turi:</b> ${escapeHtml(sale.paymentMethod)}`;

    const msg =
      `🔧 <b>Yangi Zapchas Savdosi!</b>\n\n` +
      `👤 <b>Sotuvchi:</b> ${escapeHtml(user.name)}${customerBlock}\n\n` +
      `🛍 <b>Sotilgan zapchaslar:</b>\n${itemsLines.join('\n')}` +
      amountBlock +
      paymentBreakdownText;

    await notifyZapchasTelegram(msg, {
      includeManagers: true,
      excludeTelegramId: user.telegramId,
    });

    return NextResponse.json({ success: true, sale });
  } catch (error: unknown) {
    if (error instanceof ZapchasValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error recording zapchas sale:', error);
    return NextResponse.json({ error: 'Zapchas sotuvini saqlashda xatolik' }, { status: 500 });
  }
}
