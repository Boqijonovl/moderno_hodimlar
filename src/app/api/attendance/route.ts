import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDistance } from 'geolib';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, telegramId, lat, lng, name } = body;

    if (!telegramId) return NextResponse.json({ error: 'User ID missing' }, { status: 400 });

    let user = await prisma.user.findUnique({ where: { telegramId: telegramId } });
    
    if (!user && name) {
      user = await prisma.user.create({
        data: { telegramId, name, role: 'EMPLOYEE' }
      });
    }
    
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (action === 'check-in') {
      if (!lat || !lng) return NextResponse.json({ error: 'GPS coordinates missing' }, { status: 400 });

      // Fetch store settings
      let settings = await prisma.settings.findFirst();
      if (!settings) {
        // Default settings (Tashkent Center)
        settings = await prisma.settings.create({
          data: { storeLat: 41.311081, storeLng: 69.240562, radius: 50 }
        });
      }

      const distance = getDistance(
        { latitude: lat, longitude: lng },
        { latitude: settings.storeLat, longitude: settings.storeLng }
      );

      if (distance > settings.radius && !body.reason) {
        return NextResponse.json({ needsReason: true, error: `Do'kondan uzoqdasiz! Masofa: ${distance}m. Iltimos, sababni kiriting:` }, { status: 403 });
      }

      const currentTime = new Date();
      const onTimeLimit = new Date();
      onTimeLimit.setHours(9, 0, 0, 0); // 09:00

      const status = currentTime <= onTimeLimit ? 'ON_TIME' : 'LATE';

      const attendance = await prisma.attendance.create({
        data: {
          userId: user.id,
          date: today,
          checkInTime: currentTime,
          gpsLat: lat,
          gpsLng: lng,
          status,
          reason: body.reason || null
        }
      });

      return NextResponse.json({ success: true, status: status === 'ON_TIME' ? 'Vaqtida' : 'Kechikkan' });
    }

    if (action === 'check-out') {
      // Find the most recent open attendance for this user
      const attendance = await prisma.attendance.findFirst({
        where: { userId: user.id, checkOutTime: null },
        orderBy: { createdAt: 'desc' }
      });

      if (!attendance) return NextResponse.json({ error: 'Davomat ochiq emas (Kirish qilinmagan yoki allaqachon yopilgan)' }, { status: 404 });

      // If lat/lng provided, check distance for check-out as well, optionally
      if (lat && lng) {
        let settings = await prisma.settings.findFirst();
        if (settings) {
          const distance = getDistance(
            { latitude: lat, longitude: lng },
            { latitude: settings.storeLat, longitude: settings.storeLng }
          );

          if (distance > settings.radius && !body.reason) {
            return NextResponse.json({ needsReason: true, error: `Do'kondan uzoqdasiz! Masofa: ${distance}m. Iltimos, sababni kiriting:` }, { status: 403 });
          }
        }
      }

      await prisma.attendance.update({
        where: { id: attendance.id },
        data: { 
          checkOutTime: new Date(),
          reason: body.reason ? (attendance.reason ? `${attendance.reason} | Chiqishda: ${body.reason}` : `Chiqishda: ${body.reason}`) : attendance.reason 
        }
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Attendance error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
