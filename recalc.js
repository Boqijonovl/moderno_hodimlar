import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const attendances = await prisma.attendance.findMany({
    include: { user: true }
  });

  console.log(`Processing ${attendances.length} records...`);

  for (const a of attendances) {
    if (!a.checkInTime || !a.user) continue;

    const user = a.user;
    
    // Recalculate late on check-in
    const checkInTime = new Date(a.checkInTime);
    const tashkentTimeStr = checkInTime.toLocaleString("en-US", {timeZone: "Asia/Tashkent"});
    const tashkentTime = new Date(tashkentTimeStr);
    
    const onTimeLimit = new Date(tashkentTime);
    const [startHour, startMinute] = (user.workStartTime || "09:00").split(':').map(Number);
    onTimeLimit.setHours(startHour, startMinute, 0, 0);

    let lateMinutes = 0;
    if (tashkentTime > onTimeLimit) {
      lateMinutes = Math.floor((tashkentTime.getTime() - onTimeLimit.getTime()) / 60000);
    }

    // If checked out, recalculate early leave or extra time
    if (a.checkOutTime) {
      const checkOutTime = new Date(a.checkOutTime);
      const outTashkentStr = checkOutTime.toLocaleString("en-US", {timeZone: "Asia/Tashkent"});
      const outTashkentTime = new Date(outTashkentStr);

      const endTimeLimit = new Date(outTashkentTime);
      const [endHour, endMinute] = (user.workEndTime || "18:00").split(':').map(Number);
      endTimeLimit.setHours(endHour, endMinute, 0, 0);

      if (outTashkentTime < endTimeLimit) {
        const earlyMinutes = Math.floor((endTimeLimit.getTime() - outTashkentTime.getTime()) / 60000);
        lateMinutes += earlyMinutes;
      } else if (outTashkentTime > endTimeLimit) {
        const extraMinutes = Math.floor((outTashkentTime.getTime() - endTimeLimit.getTime()) / 60000);
        lateMinutes -= extraMinutes;
      }
    }

    await prisma.attendance.update({
      where: { id: a.id },
      data: { lateMinutes }
    });
  }

  console.log('Recalculation complete!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
