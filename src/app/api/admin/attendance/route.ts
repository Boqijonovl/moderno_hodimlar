import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');

    let targetDate = new Date();
    if (dateParam) {
      targetDate = new Date(dateParam);
    }
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const attendance = await prisma.attendance.findMany({
      where: { 
        date: { 
          gte: targetDate,
          lt: nextDay
        } 
      },
      include: { user: true },
      orderBy: { checkInTime: 'desc' }
    });

    const activeUsers = await prisma.user.findMany({
      where: { active: true, canUseAttendance: true }
    });

    const attendanceUserIds = new Set(attendance.map(a => a.userId));

    const mockAttendances = activeUsers
      .filter(u => !attendanceUserIds.has(u.id))
      .map(u => ({
        id: `mock-${u.id}-${targetDate.getTime()}`,
        userId: u.id,
        user: u,
        date: targetDate,
        checkInTime: null,
        checkOutTime: null,
        status: 'ABSENT',
        lateMinutes: 0
      }));

    const fullAttendance = [...attendance, ...mockAttendances];

    const settings = await prisma.settings.findFirst();

    const historyData = await prisma.attendance.findMany({
      select: { date: true },
      distinct: ['date'],
      orderBy: { date: 'desc' },
      take: 30
    });

    return NextResponse.json({
      attendance: fullAttendance,
      historyDates: historyData.map(d => d.date),
      store: settings ? { lat: settings.storeLat, lng: settings.storeLng, radius: settings.radius } : { lat: 41.311081, lng: 69.240562, radius: 50 }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch attendance data' }, { status: 500 });
  }
}

