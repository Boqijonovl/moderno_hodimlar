import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const attendances = await prisma.attendance.findMany({
    where: { 
      reason: {
        contains: "tarix to'g'rilandi"
      }
    },
    include: { user: true }
  });

  console.log(`Found ${attendances.length} previously fixed records.`);

  for (const att of attendances) {
    const user = att.user;
    const checkIn = new Date(att.checkInTime);
    
    const tashkentTimeStr = checkIn.toLocaleString("en-US", {timeZone: "Asia/Tashkent"});
    const tashkentTime = new Date(tashkentTimeStr);
    
    const endTimeLimit = new Date(tashkentTime);
    const [endHour, endMinute] = (user.workEndTime || "18:00").split(':').map(Number);
    endTimeLimit.setHours(endHour, endMinute, 0, 0);

    const onTimeLimit = new Date(tashkentTime);
    const [startHour, startMinute] = (user.workStartTime || "09:00").split(':').map(Number);
    onTimeLimit.setHours(startHour, startMinute, 0, 0);

    // Re-calculate check-in late minutes
    let lateMinutes = 0;
    if (tashkentTime > onTimeLimit) {
      lateMinutes = Math.floor((tashkentTime.getTime() - onTimeLimit.getTime()) / 60000);
    }

    // Dynamic penalty: difference between midnight and workEndTime
    const midnight = new Date(tashkentTime);
    midnight.setHours(24, 0, 0, 0); // 00:00 of the NEXT day
    const penaltyMinutes = Math.floor((midnight.getTime() - endTimeLimit.getTime()) / 60000);

    lateMinutes += penaltyMinutes; 

    await prisma.attendance.update({
      where: { id: att.id },
      data: {
        checkOutTime: endTimeLimit, // close them precisely at their own end time
        lateMinutes: lateMinutes,
        reason: `(Esdan chiqqan, tarix to'g'rilandi: ${penaltyMinutes} daq jarima)`
      }
    });
    console.log(`Updated ${user.name}: applied ${penaltyMinutes} mins penalty instead of 360.`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
