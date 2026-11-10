import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Telegraf } from 'telegraf';
import { isAdminUser, resolveZapchasUser } from '@/lib/zapchas';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: { active: true },
      select: {
        id: true,
        telegramId: true,
        name: true,
        role: true,
        phone: true,
        canUseZapchas: true,
        canManageZapchas: true,
      },
      orderBy: [{ canManageZapchas: 'desc' }, { name: 'asc' }],
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching zapchas managers:', error);
    return NextResponse.json({ error: 'Xodimlarni yuklashda xatolik' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { adminTelegramId, targetUserId, canManageZapchas, canUseZapchas } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: 'Xodim tanlanmagan' }, { status: 400 });
    }

    let adminName = 'Admin';
    if (adminTelegramId) {
      const adminUser = await resolveZapchasUser(adminTelegramId);
      if (!adminUser || !isAdminUser(adminUser)) {
        return NextResponse.json({ error: 'Faqat Admin mas\'ul biriktira oladi' }, { status: 403 });
      }
      adminName = adminUser.name;
    }

    const target = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) {
      return NextResponse.json({ error: 'Xodim topilmadi' }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        canManageZapchas: canManageZapchas !== undefined ? Boolean(canManageZapchas) : undefined,
        canUseZapchas: canUseZapchas !== undefined ? Boolean(canUseZapchas) : undefined,
      },
      select: {
        id: true,
        telegramId: true,
        name: true,
        role: true,
        phone: true,
        canUseZapchas: true,
        canManageZapchas: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'ASSIGN_ZAPCHAS_MANAGER',
        entity: 'User',
        entityId: updated.id,
        details: JSON.stringify({
          employeeName: updated.name,
          canManageZapchas: updated.canManageZapchas,
          canUseZapchas: updated.canUseZapchas,
        }),
        user: adminName,
      },
    });

    if (canManageZapchas === true && !target.canManageZapchas && process.env.BOT_TOKEN && updated.telegramId) {
      try {
        const bot = new Telegraf(process.env.BOT_TOKEN);
        await bot.telegram
          .sendMessage(
            updated.telegramId,
            `🔧 <b>Zapchas Ombori Mas'uli</b>\n\nSiz Admin tomonidan <b>Zapchaslar</b> bo'limiga mas'ul etib biriktirildingiz.\nEndi kelgan zapchaslar sonini kiritishingiz va kelgan-ketgan zapchaslarni boshqarishingiz mumkin.`,
            { parse_mode: 'HTML' }
          )
          .catch(() => {});
      } catch (e) {
        console.error('Failed to notify assigned zapchas manager:', e);
      }
    }

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error('Error assigning zapchas manager:', error);
    return NextResponse.json({ error: 'Mas\'ul biriktirishda xatolik' }, { status: 500 });
  }
}
