import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findMany({
      where: { date: { gte: today } },
      include: { user: true },
      orderBy: { checkInTime: 'desc' }
    });

    const settings = await prisma.settings.findFirst();

    return NextResponse.json({
      attendance,
      store: settings ? { lat: settings.storeLat, lng: settings.storeLng, radius: settings.radius } : { lat: 41.311081, lng: 69.240562, radius: 50 }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch attendance data' }, { status: 500 });
  }
}
