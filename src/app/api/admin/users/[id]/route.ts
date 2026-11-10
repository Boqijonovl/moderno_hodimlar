import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Telegraf } from 'telegraf';

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { id } = params;
    const body = await req.json();
    const { 
      active, 
      role, 
      canUseAttendance, 
      canUseSales, 
      canUseExpenses, 
      canUseOrders, 
      canUseZapchas,
      canManageZapchas,
      canUseConstructor, 
      regenerateToken, 
      workStartTime, 
      workEndTime, 
      phone 
    } = body;

    const existingUser = await prisma.user.findUnique({ where: { id } });
    let tokenUpdate: string | undefined = undefined;

    if (regenerateToken) {
      tokenUpdate = crypto.randomUUID();
    } else if (canUseConstructor === true && !existingUser?.constructorToken) {
      tokenUpdate = crypto.randomUUID();
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        active: active !== undefined ? active : undefined,
        role: role !== undefined ? role : undefined,
        canUseAttendance: canUseAttendance !== undefined ? canUseAttendance : undefined,
        canUseSales: canUseSales !== undefined ? canUseSales : undefined,
        canUseExpenses: canUseExpenses !== undefined ? canUseExpenses : undefined,
        canUseOrders: canUseOrders !== undefined ? canUseOrders : undefined,
        canUseZapchas: canUseZapchas !== undefined ? canUseZapchas : undefined,
        canManageZapchas: canManageZapchas !== undefined ? canManageZapchas : undefined,
        canUseConstructor: canUseConstructor !== undefined ? canUseConstructor : undefined,
        constructorToken: tokenUpdate !== undefined ? tokenUpdate : undefined,
        workStartTime: workStartTime !== undefined ? workStartTime : undefined,
        workEndTime: workEndTime !== undefined ? workEndTime : undefined,
        phone: phone !== undefined ? phone : undefined
      }
    });

    if (canManageZapchas === true && !existingUser?.canManageZapchas && process.env.BOT_TOKEN && user.telegramId) {
      try {
        const bot = new Telegraf(process.env.BOT_TOKEN);
        await bot.telegram.sendMessage(
          user.telegramId,
          `🔧 <b>Zapchas Ombori Mas'uli</b>\n\nSiz Admin tomonidan <b>Zapchaslar</b> bo'limiga mas'ul etib biriktirildingiz.\nEndi kelgan zapchaslar sonini kiritishingiz va kelgan-ketgan zapchaslarni boshqarishingiz mumkin.`,
          { parse_mode: 'HTML' }
        ).catch(() => {});
      } catch (e) {
        console.error('Failed to notify user on canManageZapchas toggle:', e);
      }
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Error updating user permissions:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
