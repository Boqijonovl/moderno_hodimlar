import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizePaymentMethod } from '@/lib/formatters';
import {
  canManageZapchasUser,
  canSellZapchasUser,
  escapeHtml,
  notifyZapchasTelegram,
  resolveZapchasUser,
} from '@/lib/zapchas';

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const { amount, method, telegramId } = await req.json();

    if (!amount || !method) {
      return NextResponse.json({ error: "Summa yoki to'lov turi kiritilmadi" }, { status: 400 });
    }

    const actor = await resolveZapchasUser(telegramId);
    if (!actor || !canSellZapchasUser(actor)) {
      return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 403 });
    }

    const sale = await prisma.zapchasSale.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true } },
        transactions: { include: { part: { select: { name: true, unit: true } } } },
      },
    });

    if (!sale) {
      return NextResponse.json({ error: 'Savdo topilmadi' }, { status: 404 });
    }
    if (!canManageZapchasUser(actor) && sale.userId !== actor.id) {
      return NextResponse.json({ error: "Faqat o'z savdoingiz qarzini yopa olasiz" }, { status: 403 });
    }
    if (sale.status === 'COMPLETED' || sale.balance <= 0) {
      return NextResponse.json({ error: "Bu savdoda qarz qolmagan" }, { status: 400 });
    }

    const cleanedAmount = typeof amount === 'string' ? amount.replace(/\s+/g, '') : amount;
    const payAmount = parseFloat(String(cleanedAmount));
    if (Number.isNaN(payAmount) || payAmount <= 0) {
      return NextResponse.json({ error: "Noto'g'ri to'lov summasi" }, { status: 400 });
    }
    if (payAmount > sale.balance) {
      return NextResponse.json(
        {
          error: `To'lov summasi (${payAmount.toLocaleString()} so'm) mavjud qarzdan (${sale.balance.toLocaleString()} so'm) ko'p bo'lishi mumkin emas!`,
        },
        { status: 400 }
      );
    }

    const cleanMethod = normalizePaymentMethod(String(method));
    const newAdvance = sale.advance + payAmount;
    const newBalance = Math.max(0, sale.totalPrice - newAdvance);
    const newStatus = newBalance > 0 ? 'INCOMPLETE' : 'COMPLETED';

    const updatedSale = await prisma.$transaction(async (tx) => {
      const updated = await tx.zapchasSale.update({
        where: { id },
        data: {
          advance: newAdvance,
          balance: newBalance,
          status: newStatus,
          payments: {
            create: {
              method: cleanMethod,
              amount: payAmount,
            },
          },
        },
        include: {
          user: { select: { id: true, name: true, role: true } },
          payments: true,
          transactions: {
            include: {
              part: { select: { id: true, name: true, unit: true } },
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'PAY_ZAPCHAS_DEBT',
          entity: 'ZapchasSale',
          entityId: sale.id,
          user: actor.name,
          details: `Zapchas qarz to'lovi: ${payAmount.toLocaleString()} so'm (${cleanMethod}). Qolgan qarz: ${newBalance.toLocaleString()} so'm`,
        },
      });

      return updated;
    });

    const itemsList = updatedSale.transactions
      .map((t) => `- ${escapeHtml(t.part.name)} (${t.quantity} ${escapeHtml(t.part.unit)})`)
      .join('\n');
    const customerText =
      sale.customerName || sale.customerPhone
        ? `\n🏷 Mijoz: <b>${escapeHtml(sale.customerName || '')}</b> ${sale.customerPhone ? `(<code>${escapeHtml(sale.customerPhone)}</code>)` : ''}`
        : '';

    const msg =
      `💸 <b>Zapchas Qarzi To'landi!</b>\n\n` +
      `👤 Qabul qildi: ${escapeHtml(actor.name)}${customerText}\n` +
      `🛍 <b>Zapchaslar:</b>\n${itemsList}\n\n` +
      `💰 Jami summa: <b>${sale.totalPrice.toLocaleString()} so'm</b>\n` +
      `✅ Hozir to'landi: <b>${payAmount.toLocaleString()} so'm</b> (${escapeHtml(cleanMethod)})\n` +
      `⚠️ Qolgan qarz: <b>${newBalance.toLocaleString()} so'm</b>`;

    await notifyZapchasTelegram(msg, {
      includeManagers: true,
      excludeTelegramId: actor.telegramId,
    });

    return NextResponse.json({ success: true, sale: updatedSale });
  } catch (error) {
    console.error('Error paying zapchas debt:', error);
    return NextResponse.json({ error: "Qarz to'lovini saqlashda xatolik" }, { status: 500 });
  }
}
