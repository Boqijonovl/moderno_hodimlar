import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { id } = params;
    const body = await req.json();
    const { active, role, canUseAttendance, canUseSales, canUseExpenses, workStartTime, workEndTime, phone } = body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        active: active !== undefined ? active : undefined,
        role: role !== undefined ? role : undefined,
        canUseAttendance: canUseAttendance !== undefined ? canUseAttendance : undefined,
        canUseSales: canUseSales !== undefined ? canUseSales : undefined,
        canUseExpenses: canUseExpenses !== undefined ? canUseExpenses : undefined,
        workStartTime: workStartTime !== undefined ? workStartTime : undefined,
        workEndTime: workEndTime !== undefined ? workEndTime : undefined,
        phone: phone !== undefined ? phone : undefined
      }
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Error updating user permissions:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
