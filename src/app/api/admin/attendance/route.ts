import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function getTashkentDateUTC(dateStr?: string | null): Date {
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  }
  const tashkentDateStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tashkent' });
  const [y, m, d] = tashkentDateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');
    const monthParam = searchParams.get('month');

    let whereClause = {};
    const targetDate = getTashkentDateUTC(dateParam);

    if (monthParam) {
      const year = parseInt(monthParam.split('-')[0], 10);
      const month = parseInt(monthParam.split('-')[1], 10);
      const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
      whereClause = {
        date: { gte: start, lt: end }
      };
    } else {
      const nextDay = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
      whereClause = {
        date: { gte: targetDate, lt: nextDay }
      };
    }

    const attendance = await prisma.attendance.findMany({
      where: whereClause,
      include: { user: true },
      orderBy: { checkInTime: 'desc' }
    });

    let fullAttendance: unknown[] = attendance;
    
    // Only generate mock attendances for single day view
    if (!monthParam) {
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

      fullAttendance = [...attendance, ...mockAttendances];
    }

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

