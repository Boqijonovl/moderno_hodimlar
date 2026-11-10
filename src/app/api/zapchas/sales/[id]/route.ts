import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canManageZapchasUser, resolveZapchasUser } from '@/lib/zapchas';

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
        { error: "Faqat admin yoki mas'ul xodim zapchas savdosini o'chira oladi" },
        { status: 403 }
      );
    }

    const existingSale = await prisma.zapchasSale.findUnique({
      where: { id },
      include: {
        user: { select: { name: true } },
        transactions: { include: { part: { select: { name: true, unit: true } } } },
      },
    });

    if (!existingSale) {
      return NextResponse.json({ error: 'Savdo topilmadi' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      for (const item of existingSale.transactions) {
        if (item.type === 'OUT' && item.quantity > 0) {
          await tx.zapchasPart.update({
            where: { id: item.partId },
            data: { quantity: { increment: item.quantity } },
          });
        }
      }

      await tx.zapchasSale.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          action: 'DELETE_ZAPCHAS_SALE',
          entity: 'ZapchasSale',
          entityId: id,
          user: actor.name,
          details: JSON.stringify({
            seller: existingSale.user?.name,
            totalPrice: existingSale.totalPrice,
            paymentMethod: existingSale.paymentMethod,
            items: existingSale.transactions.map((t) => `${t.part.name} × ${t.quantity}`),
          }),
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting zapchas sale:', error);
    return NextResponse.json({ error: "Savdoni o'chirishda xatolik" }, { status: 500 });
  }
}
