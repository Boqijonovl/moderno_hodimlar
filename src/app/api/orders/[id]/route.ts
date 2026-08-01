import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Telegraf } from 'telegraf';

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { status, userId } = await req.json();

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { assignedTo: true, creator: true }
    });

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    // The user requested that ONLY the assigned employee can change the status
    // but now creator should also be able to see it. However, the rule was "faqatgina biriktirilgan hodim o'zgartira oladi boshqa hech kim".
    // So creator can SEE but NOT UPDATE. Let's keep update restriction.
    if (userId && order.assignedToId !== userId) {
      const requestingUser = await prisma.user.findUnique({ where: { id: userId } });
      if (requestingUser?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Faqat biriktirilgan usta holatni o\'zgartira oladi!' }, { status: 403 });
      }
    }

    const updated = await prisma.order.update({
      where: { id: params.id },
      data: { status }
    });

    // If status changed to COMPLETED, notify the creator (sales person)
    if (status === 'COMPLETED' && order.status !== 'COMPLETED') {
      try {
        if (process.env.BOT_TOKEN && order.creator?.telegramId) {
          const bot = new Telegraf(process.env.BOT_TOKEN);
          const msg = `✅ <b>Buyurtma tayyor bo'ldi!</b>\n\n📦 <b>Mebel:</b> ${order.name}\n👷‍♂️ <b>Usta:</b> ${order.assignedTo?.name || 'Noma\'lum'}\n\n<i>Mijozga xabar berishingiz mumkin!</i>`;
          await bot.telegram.sendMessage(order.creator.telegramId, msg, { parse_mode: 'HTML' }).catch(() => {});
        }
      } catch (e) {
        console.error("Order completion notification error", e);
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    await prisma.order.delete({
      where: { id: params.id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }
}
