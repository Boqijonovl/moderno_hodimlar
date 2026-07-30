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

    let targetUserId = '';
    if (id.startsWith('mock-')) {
      targetUserId = id.split('-')[1];
    } else {
      const existing = await prisma.attendance.findUnique({ where: { id }, select: { userId: true } });
      if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      targetUserId = existing.userId;
    }

    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    let newLateMinutes = 0;
    let newStatus = updateData.status || 'ABSENT';

    if (updateData.checkInTime) {
      const checkInDate = new Date(updateData.checkInTime);
      const tashkentCheckInStr = checkInDate.toLocaleString("en-US", {timeZone: "Asia/Tashkent"});
      const tashkentCheckIn = new Date(tashkentCheckInStr);
      
      const onTimeLimit = new Date(tashkentCheckIn);
      const [startHour, startMinute] = (user.workStartTime || "09:00").split(':').map(Number);
      onTimeLimit.setHours(startHour, startMinute, 0, 0);

      const isLate = tashkentCheckIn > onTimeLimit;
      newStatus = isLate ? 'LATE' : 'ON_TIME';

      if (isLate) {
        newLateMinutes = Math.floor((tashkentCheckIn.getTime() - onTimeLimit.getTime()) / 60000);
      }
    }

    if (updateData.checkOutTime && updateData.checkInTime) {
      const checkOutDate = new Date(updateData.checkOutTime);
      const tashkentCheckOutStr = checkOutDate.toLocaleString("en-US", {timeZone: "Asia/Tashkent"});
      const tashkentCheckOut = new Date(tashkentCheckOutStr);

      const endTimeLimit = new Date(tashkentCheckOut);
      const [endHour, endMinute] = (user.workEndTime || "18:00").split(':').map(Number);
      endTimeLimit.setHours(endHour, endMinute, 0, 0);

      if (tashkentCheckOut < endTimeLimit) {
        const earlyMinutes = Math.floor((endTimeLimit.getTime() - tashkentCheckOut.getTime()) / 60000);
        newLateMinutes += earlyMinutes;
      } else if (tashkentCheckOut > endTimeLimit) {
        const extraMinutes = Math.floor((tashkentCheckOut.getTime() - endTimeLimit.getTime()) / 60000);
        newLateMinutes -= extraMinutes;
        if (newLateMinutes < 0) newLateMinutes = 0;
      }
    }

    if (!updateData.checkInTime) {
      newLateMinutes = 0;
      newStatus = 'ABSENT';
    }

    updateData.lateMinutes = newLateMinutes;
    updateData.status = newStatus;

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
          status: updateData.status,
          lateMinutes: updateData.lateMinutes
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

