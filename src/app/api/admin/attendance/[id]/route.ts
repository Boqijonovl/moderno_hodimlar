import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { id } = params;

    if (id.startsWith('mock-')) {
      return NextResponse.json({ success: true }); // It doesn't exist yet, so 'deleted' successfully
    }

    await prisma.attendance.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting attendance:', error);
    return NextResponse.json({ error: 'Failed to delete attendance' }, { status: 500 });
  }
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { id } = params;
    const { checkInTime, checkOutTime, status } = await req.json();

    const updateData: any = {};
    if (checkInTime !== undefined) updateData.checkInTime = checkInTime ? new Date(checkInTime) : null;
    if (checkOutTime !== undefined) updateData.checkOutTime = checkOutTime ? new Date(checkOutTime) : null;
    if (status !== undefined) updateData.status = status;

    if (id.startsWith('mock-')) {
      const parts = id.split('-');
      const userId = parts[1];
      const targetDate = new Date(parseInt(parts[2], 10));
      
      const created = await prisma.attendance.create({
        data: {
          userId,
          date: targetDate,
          checkInTime: updateData.checkInTime,
          checkOutTime: updateData.checkOutTime,
          status: updateData.status || 'ABSENT',
          lateMinutes: 0
        }
      });
      return NextResponse.json({ success: true, attendance: created });
    }

    const updated = await prisma.attendance.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, attendance: updated });
  } catch (error) {
    console.error('Error updating attendance:', error);
    return NextResponse.json({ error: 'Failed to update attendance' }, { status: 500 });
  }
}

