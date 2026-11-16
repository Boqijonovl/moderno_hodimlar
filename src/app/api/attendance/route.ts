import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDistance } from 'geolib';
import { Telegraf } from 'telegraf';

function getTashkentTime(date: Date = new Date()) {
  // Uzbekistan is UTC+5 strictly (no DST)
  const tzDate = new Date(date.getTime() + 5 * 60 * 60 * 1000);
  const year = tzDate.getUTCFullYear();
  const month = tzDate.getUTCMonth();
  const day = tzDate.getUTCDate();
  const hours = tzDate.getUTCHours();
  const minutes = tzDate.getUTCMinutes();
  const currentMinuteOfDay = hours * 60 + minutes;
  const todayDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  return { year, month, day, hours, minutes, currentMinuteOfDay, todayDate, timeString };
}

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

    const serverTime = new Date();
    const { currentMinuteOfDay, todayDate, timeString } = getTashkentTime(serverTime);

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

      // Check if already checked in and not checked out
      const openAttendance = await prisma.attendance.findFirst({
        where: { userId: user.id, checkOutTime: null }
      });
      if (openAttendance) {
        return NextResponse.json({ error: 'Siz allaqachon ishga kelgansiz. Oldin yakunlang!' }, { status: 400 });
      }

      const [startHour, startMinute] = (user.workStartTime || "09:00").split(':').map(Number);
      const startMinuteOfDay = startHour * 60 + startMinute;

      const [endHour, endMinute] = (user.workEndTime || "18:00").split(':').map(Number);

      // Check if they already have a closed attendance for TODAY (for reopening)
      const closedAttendance = await prisma.attendance.findFirst({
        where: { 
          userId: user.id, 
          date: todayDate,
          checkOutTime: { not: null }
        },
        orderBy: { createdAt: 'desc' }
      });

      let status = 'ON_TIME';
      let lateMinutes = 0;
      let isReopening = false;

      if (closedAttendance) {
        // Reopen it
        isReopening = true;
        let penaltyToReverse = 0;
        
        // Calculate remaining minutes until scheduled end of shift
        const attDate = new Date(closedAttendance.date);
        let endDay = attDate.getUTCDate();
        if (endHour < startHour || (endHour === startHour && endMinute < startMinute)) {
          endDay += 1;
        }
        const scheduledEndUTC = new Date(Date.UTC(
          attDate.getUTCFullYear(),
          attDate.getUTCMonth(),
          endDay,
          endHour - 5,
          endMinute,
          0,
          0
        ));

        const remainingMs = scheduledEndUTC.getTime() - serverTime.getTime();
        if (remainingMs > 0) {
          penaltyToReverse = Math.floor(remainingMs / 60000);
        }

        lateMinutes = Math.max(0, (closedAttendance.lateMinutes || 0) - penaltyToReverse);
        status = lateMinutes > 0 ? 'LATE' : 'ON_TIME';
        
        await prisma.attendance.update({
          where: { id: closedAttendance.id },
          data: {
             checkOutTime: null,
             lateMinutes: lateMinutes,
             status: status,
             reason: body.reason ? (closedAttendance.reason ? `${closedAttendance.reason} | Qaytdi: ${body.reason}` : `Qaytdi: ${body.reason}`) : closedAttendance.reason
          }
        });
      } else {
        const isLate = currentMinuteOfDay > startMinuteOfDay;
        status = isLate ? 'LATE' : 'ON_TIME';

        if (isLate) {
          lateMinutes = currentMinuteOfDay - startMinuteOfDay;
        }

        await prisma.attendance.create({
          data: {
            userId: user.id,
            date: todayDate,
            checkInTime: serverTime,
            gpsLat: lat,
            gpsLng: lng,
            status,
            lateMinutes,
            reason: body.reason || null
          }
        });
      }

      try {
        if (process.env.BOT_TOKEN) {
          const bot = new Telegraf(process.env.BOT_TOKEN);
          const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
          let message = ``;
          
          if (isReopening) {
            message = `🔄 <b>Ishga qaytdi!</b>\n\n👤 Xodim: ${user.name}\n🕒 Vaqt: ${timeString}${body.reason ? `\n📝 Izoh: ${body.reason}` : ''}`;
          } else {
            message = `🟢 <b>Ishga keldi!</b>\n\n👤 Xodim: ${user.name}\n🕒 Vaqt: ${timeString}\n📊 Holat: ${status === 'ON_TIME' ? 'Vaqtida' : 'Kechikkan'}${lateMinutes > 0 ? ` (${lateMinutes} daqiqa)` : ''}${body.reason ? `\n📝 Izoh: ${body.reason}` : ''}`;
          }
          
          for (const admin of admins) {
            if (admin.telegramId) {
              await bot.telegram.sendMessage(admin.telegramId, message, { parse_mode: 'HTML' }).catch(() => {});
            }
          }
        }
      } catch (e) {
        console.error('Check-in notification failed', e);
      }

      return NextResponse.json({ success: true, status: isReopening ? 'Qaytdi' : (status === 'ON_TIME' ? 'Vaqtida' : 'Kechikkan') });
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
        const settings = await prisma.settings.findFirst();
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

      const [startHour, startMinute] = (user.workStartTime || "09:00").split(':').map(Number);
      const [endHour, endMinute] = (user.workEndTime || "18:00").split(':').map(Number);

      const attDate = new Date(attendance.date);
      let endDay = attDate.getUTCDate();
      if (endHour < startHour || (endHour === startHour && endMinute < startMinute)) {
        endDay += 1;
      }
      const scheduledEndUTC = new Date(Date.UTC(
        attDate.getUTCFullYear(),
        attDate.getUTCMonth(),
        endDay,
        endHour - 5,
        endMinute,
        0,
        0
      ));

      let newLateMinutes = attendance.lateMinutes || 0;
      const diffMinutes = Math.floor((serverTime.getTime() - scheduledEndUTC.getTime()) / 60000);

      if (diffMinutes < 0) {
        // Vohli ketdi (Left early): qolgan vaqtni kechikishga qo'shish
        const earlyMinutes = Math.abs(diffMinutes);
        newLateMinutes += earlyMinutes;
      } else if (diffMinutes > 0) {
        // Kech ketdi (Left late): ishlagan ortiqcha vaqtni kechikishdan ayirish
        const extraMinutes = diffMinutes;
        newLateMinutes = Math.max(0, newLateMinutes - extraMinutes);
      }

      const newStatus = newLateMinutes > 0 ? 'LATE' : 'ON_TIME';

      await prisma.attendance.update({
        where: { id: attendance.id },
        data: { 
          checkOutTime: serverTime,
          lateMinutes: newLateMinutes,
          status: newStatus,
          reason: body.reason ? (attendance.reason ? `${attendance.reason} | Chiqishda: ${body.reason}` : `Chiqishda: ${body.reason}`) : attendance.reason 
        }
      });

      try {
        if (process.env.BOT_TOKEN) {
          const bot = new Telegraf(process.env.BOT_TOKEN);
          const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
          let diffInfo = '';
          if (diffMinutes < 0) {
            diffInfo = `\n⚠️ <b>Erta ketdi:</b> ${Math.abs(diffMinutes)} daqiqa oldin`;
          } else if (diffMinutes > 0) {
            diffInfo = `\n⏳ <b>Ortiqcha ishladi:</b> +${diffMinutes} daqiqa`;
          }
          const lateInfo = newLateMinutes > 0 ? `\n📊 <b>Jami kechikish/kamomad:</b> ${newLateMinutes} daqiqa` : '\n📊 <b>Holat:</b> Vaqtida';
          const message = `🔴 <b>Ishdan ketdi!</b>\n\n👤 Xodim: ${user.name}\n🕒 Vaqt: ${timeString}${diffInfo}${lateInfo}${body.reason ? `\n📝 Izoh: ${body.reason}` : ''}`;
          
          for (const admin of admins) {
            if (admin.telegramId) {
              await bot.telegram.sendMessage(admin.telegramId, message, { parse_mode: 'HTML' }).catch(() => {});
            }
          }
        }
      } catch (e) {
        console.error('Check-out notification failed', e);
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: unknown) {
    console.error('Attendance error:', error);
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
