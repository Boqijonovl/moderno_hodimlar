import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { telegramId } = body;

    if (!telegramId) {
      return NextResponse.json({ error: 'Missing telegramId' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { telegramId: telegramId.toString() }
    });

    if (!user || !user.active) {
      return NextResponse.json({ error: 'Foydalanuvchi topilmadi yoki faol emas' }, { status: 404 });
    }

    // Check permission: Admin or authorized employee
    const isAuthorized = user.role === 'ADMIN' || !!user.canUseConstructor;
    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Sizda 3D Konstruktor bo‘limiga kirish huquqi yo‘q. Iltimos, admin bilan bog‘laning.' },
        { status: 403 }
      );
    }

    // Generate token if not yet created
    let token = user.constructorToken;
    if (!token) {
      token = crypto.randomUUID();
      await prisma.user.update({
        where: { id: user.id },
        data: { constructorToken: token }
      });
    }

    return NextResponse.json({
      success: true,
      token,
      url: `/constructor?token=${token}`
    });
  } catch (error) {
    console.error('Error generating constructor token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
