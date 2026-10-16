import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token || token.trim() === '') {
      return NextResponse.json(
        { 
          valid: false, 
          error: 'Havola xato yoki to‘g‘ridan-to‘g‘ri kirish cheklangan. Ushbu bo‘lim faqat shaxsiy litsenziya havolasi bilan ochiladi.' 
        },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { constructorToken: token.trim() }
    });

    if (!user) {
      return NextResponse.json(
        { 
          valid: false, 
          error: 'Litsenziya tokeni topilmadi yoki admin tomonidan bekor qilingan.' 
        },
        { status: 403 }
      );
    }

    if (!user.active) {
      return NextResponse.json(
        { valid: false, error: 'Foydalanuvchi hisobi to‘xtatilgan.' },
        { status: 403 }
      );
    }

    if (user.role !== 'ADMIN' && !user.canUseConstructor) {
      return NextResponse.json(
        { 
          valid: false, 
          error: 'Ushbu xodimga konstruktor bo‘limiga kirish ruxsati berilmagan yoki admin tomonidan o‘chirilgan.' 
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      valid: true,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        telegramId: user.telegramId
      }
    });
  } catch (error) {
    console.error('Error verifying constructor token:', error);
    return NextResponse.json(
      { valid: false, error: 'Tizimda xatolik yuz berdi' },
      { status: 500 }
    );
  }
}
