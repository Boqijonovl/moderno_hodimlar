import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDistance } from 'geolib';
import { Telegraf } from 'telegraf';

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

      // Check if already checked in and not checked out
      const openAttendance = await prisma.attendance.findFirst({
        where: { userId: user.id, checkOutTime: null }
      });
      if (openAttendance) {
        return NextResponse.json({ error: 'Siz allaqachon ishga kelgansiz. Oldin yakunlang!' }, { status: 400 });
      }

      const serverTime = new Date();
      // Tashkent time object (this creates a Date object that is shifted to represent Tashkent time locally)
      const tashkentTimeStr = serverTime.toLocaleString("en-US", {timeZone: "Asia/Tashkent"});
      const tashkentTime = new Date(tashkentTimeStr);
      
      const onTimeLimit = new Date(tashkentTime);
      const [startHour, startMinute] = (user.workStartTime || "09:00").split(':').map(Number);
      onTimeLimit.setHours(startHour, startMinute, 0, 0);

      const endTimeLimit = new Date(tashkentTime);
      const [endHour, endMinute] = (user.workEndTime || "18:00").split(':').map(Number);
      endTimeLimit.setHours(endHour, endMinute, 0, 0);

      // Check if they already have a closed attendance for TODAY
      const closedAttendance = await prisma.attendance.findFirst({
        where: { 
          userId: user.id, 
          date: today,
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
        
        if (tashkentTime < endTimeLimit) {
           penaltyToReverse = Math.floor((endTimeLimit.getTime() - tashkentTime.getTime()) / 60000);
        }

        lateMinutes = (closedAttendance.lateMinutes || 0) - penaltyToReverse;
        // Allow negative lateMinutes to accumulate extra time
        
        await prisma.attendance.update({
          where: { id: closedAttendance.id },
          data: {
             checkOutTime: null,
             lateMinutes: lateMinutes,
             reason: body.reason ? (closedAttendance.reason ? `${closedAttendance.reason} | Qaytdi: ${body.reason}` : `Qaytdi: ${body.reason}`) : closedAttendance.reason
          }
        });
        
        status = closedAttendance.status; // Keep original status
      } else {
        const isLate = tashkentTime > onTimeLimit;
        status = isLate ? 'LATE' : 'ON_TIME';

        if (isLate) {
          lateMinutes = Math.floor((tashkentTime.getTime() - onTimeLimit.getTime()) / 60000);
        }

        await prisma.attendance.create({
          data: {
            userId: user.id,
            date: today,
            checkInTime: serverTime, // Save actual server UTC time in DB for consistency
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
            message = `🔄 <b>Ishga qaytdi!</b>\n\n👤 Xodim: ${user.name}\n🕒 Vaqt: ${tashkentTime.toLocaleTimeString('uz-UZ', {hour:'2-digit', minute:'2-digit'})}${body.reason ? `\n📝 Izoh: ${body.reason}` : ''}`;
          } else {
            message = `🟢 <b>Ishga keldi!</b>\n\n👤 Xodim: ${user.name}\n🕒 Vaqt: ${tashkentTime.toLocaleTimeString('uz-UZ', {hour:'2-digit', minute:'2-digit'})}\n📊 Holat: ${status === 'ON_TIME' ? 'Vaqtida' : 'Kechikkan'}${lateMinutes > 0 ? ` (${lateMinutes} daqiqa)` : ''}${body.reason ? `\n📝 Izoh: ${body.reason}` : ''}`;
          }
          
          for (const admin of admins) {
            if (admin.telegramId) {
              await bot.telegram.sendMessage(admin.telegramId, message, { parse_mode: 'HTML' }).catch(() => {});
            }
          }

          // Worker notification for pending orders
          if (user.telegramId) {
            const pendingOrders = await prisma.order.findMany({
              where: { assignedToId: user.id, status: { not: 'COMPLETED' } }
            });

            if (pendingOrders.length > 0) {
              let ordersText = `📦 <b>Sizning buyurtmalaringiz:</b>\n\n`;
              pendingOrders.forEach((o: any, i: number) => {
                const dStr = o.deadline ? new Date(o.deadline).toLocaleDateString('uz-UZ') : 'Noma\'lum';
                ordersText += `${i+1}. <b>${o.name}</b> (Muddat: ${dStr})\n   Holati: ${o.status === 'PENDING' ? 'Kutilmoqda' : 'Jarayonda'}\n`;
              });
              await bot.telegram.sendMessage(user.telegramId, ordersText, { parse_mode: 'HTML' }).catch(() => {});
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

      const serverTime = new Date();
      const tashkentTimeStr = serverTime.toLocaleString("en-US", {timeZone: "Asia/Tashkent"});
      const tashkentTime = new Date(tashkentTimeStr);

      const attDate = new Date(attendance.date);
      const endTimeLimit = new Date(attDate);
      const [endHour, endMinute] = (user.workEndTime || "18:00").split(':').map(Number);
      endTimeLimit.setUTCHours(endHour - 5, endMinute, 0, 0);

      let newLateMinutes = attendance.lateMinutes || 0;

      if (tashkentTime < endTimeLimit) {
        // Vohli ketdi (Left early): qolgan vaqtni kechikishga qo'shish
        const earlyMinutes = Math.floor((endTimeLimit.getTime() - tashkentTime.getTime()) / 60000);
        newLateMinutes += earlyMinutes;
      } else if (tashkentTime > endTimeLimit) {
        // Kech ketdi (Left late): ishlagan ortiqcha vaqtni kechikishdan ayirish
        const extraMinutes = Math.floor((tashkentTime.getTime() - endTimeLimit.getTime()) / 60000);
        newLateMinutes -= extraMinutes;
        // Allow negative balance to carry over
      }

      await prisma.attendance.update({
        where: { id: attendance.id },
        data: { 
          checkOutTime: serverTime,
          lateMinutes: newLateMinutes,
          reason: body.reason ? (attendance.reason ? `${attendance.reason} | Chiqishda: ${body.reason}` : `Chiqishda: ${body.reason}`) : attendance.reason 
        }
      });

      try {
        if (process.env.BOT_TOKEN) {
          const bot = new Telegraf(process.env.BOT_TOKEN);
          const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
          const message = `🔴 <b>Ishdan ketdi!</b>\n\n👤 Xodim: ${user.name}\n🕒 Vaqt: ${tashkentTime.toLocaleTimeString('uz-UZ', {hour:'2-digit', minute:'2-digit'})}${body.reason ? `\n📝 Izoh: ${body.reason}` : ''}`;
          
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

  } catch (error: any) {
    console.error('Attendance error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
