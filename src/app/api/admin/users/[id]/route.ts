import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { active, role, canUseAttendance, canUseSales } = body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        active: active !== undefined ? active : undefined,
        role: role !== undefined ? role : undefined,
        canUseAttendance: canUseAttendance !== undefined ? canUseAttendance : undefined,
        canUseSales: canUseSales !== undefined ? canUseSales : undefined
      }
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Error updating user permissions:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
