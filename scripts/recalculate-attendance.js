const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Inlined exact logic from src/lib/attendance.ts to ensure identical execution
function getTashkentInfo(d) {
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  const tzDate = new Date(dateObj.getTime() + 5 * 60 * 60 * 1000);
  const year = tzDate.getUTCFullYear();
  const month = tzDate.getUTCMonth();
  const day = tzDate.getUTCDate();
  const hours = tzDate.getUTCHours();
  const minutes = tzDate.getUTCMinutes();
  const minuteOfDay = hours * 60 + minutes;
  const dateMidnight = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  return { year, month, day, hours, minutes, minuteOfDay, dateMidnight, dateStr, timeStr };
}

function calculateAttendanceMetrics(params) {
  const { checkInTime, checkOutTime, date, workStartTime, workEndTime } = params;

  if (!checkInTime) {
    return { lateMinutes: 0, status: 'ABSENT', morningLateMinutes: 0, earlyMinutes: 0, overtimeMinutes: 0 };
  }

  const [startHour, startMinute] = (workStartTime || '09:00').split(':').map(Number);
  const [endHour, endMinute] = (workEndTime || '18:00').split(':').map(Number);

  const startMinuteOfDay = (isNaN(startHour) ? 9 : startHour) * 60 + (isNaN(startMinute) ? 0 : startMinute);
  const endMinuteOfDay = (isNaN(endHour) ? 18 : endHour) * 60 + (isNaN(endMinute) ? 0 : endMinute);

  const checkInInfo = getTashkentInfo(checkInTime);
  const shiftDateInfo = date ? getTashkentInfo(date) : checkInInfo;

  let morningLateMinutes = 0;
  if (checkInInfo.minuteOfDay > startMinuteOfDay) {
    morningLateMinutes = checkInInfo.minuteOfDay - startMinuteOfDay;
  }

  let finalLateMinutes = morningLateMinutes;
  let earlyMinutes = 0;
  let overtimeMinutes = 0;

  if (checkOutTime) {
    const checkOutInfo = getTashkentInfo(checkOutTime);
    const shiftMidnight = shiftDateInfo.dateMidnight.getTime();
    const checkOutMidnight = checkOutInfo.dateMidnight.getTime();
    const daysDiff = Math.round((checkOutMidnight - shiftMidnight) / (24 * 60 * 60 * 1000));

    const absoluteCheckOutMinute = checkOutInfo.minuteOfDay + daysDiff * 1440;

    let targetEndMinute = endMinuteOfDay;
    if (endMinuteOfDay < startMinuteOfDay) {
      targetEndMinute += 1440;
    }

    const diff = absoluteCheckOutMinute - targetEndMinute;

    if (diff < 0) {
      earlyMinutes = Math.abs(diff);
      finalLateMinutes = morningLateMinutes + earlyMinutes;
    } else if (diff > 0) {
      overtimeMinutes = diff;
      finalLateMinutes = Math.max(0, morningLateMinutes - overtimeMinutes);
    } else {
      finalLateMinutes = morningLateMinutes;
    }
  }

  const status = finalLateMinutes > 0 ? 'LATE' : 'ON_TIME';

  return { lateMinutes: finalLateMinutes, status, morningLateMinutes, earlyMinutes, overtimeMinutes };
}

async function main() {
  console.log('Fetching all attendance records from database...');
  const attendances = await prisma.attendance.findMany({
    include: { user: true },
    orderBy: { date: 'asc' }
  });

  console.log(`Loaded ${attendances.length} records. Auditing and recalculating...`);

  let updatedCount = 0;
  const updates = [];

  for (const att of attendances) {
    const user = att.user;
    if (!user) continue;

    const res = calculateAttendanceMetrics({
      checkInTime: att.checkInTime,
      checkOutTime: att.checkOutTime,
      date: att.date,
      workStartTime: user.workStartTime,
      workEndTime: user.workEndTime
    });

    if (att.lateMinutes !== res.lateMinutes || att.status !== res.status) {
      updates.push({
        id: att.id,
        user: user.name,
        date: att.date.toISOString().slice(0, 10),
        oldLate: att.lateMinutes,
        newLate: res.lateMinutes,
        oldStatus: att.status,
        newStatus: res.status
      });
    }
  }

  console.log(`Found ${updates.length} records that need updating in the database.`);

  // Execute updates in batches of 20 to ensure reliability and speed
  const BATCH_SIZE = 20;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(u =>
        prisma.attendance.update({
          where: { id: u.id },
          data: {
            lateMinutes: u.newLate,
            status: u.newStatus
          }
        })
      )
    );
    updatedCount += batch.length;
    process.stdout.write(`Updated ${updatedCount}/${updates.length} records...\r`);
  }

  console.log(`\nSuccessfully recalculated and updated all ${updatedCount} records in the database!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
