/**
 * Universal Attendance Calculation Utilities for Moderno
 * Timezone: Asia/Tashkent (UTC+5 strictly, no DST)
 */

export interface TashkentDateInfo {
  year: number;
  month: number; // 0-indexed
  day: number;
  hours: number;
  minutes: number;
  minuteOfDay: number;
  dateMidnight: Date;
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:mm
}

export function getTashkentInfo(d: Date | string = new Date()): TashkentDateInfo {
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  // Shift by 5 hours to get exact Tashkent components in UTC methods
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

export interface AttendanceCalculationResult {
  lateMinutes: number;
  status: 'ON_TIME' | 'LATE' | 'ABSENT';
  morningLateMinutes: number;
  earlyMinutes: number;
  overtimeMinutes: number;
}

export interface AttendanceCalculationParams {
  checkInTime?: Date | string | null | undefined;
  checkOutTime?: Date | string | null | undefined;
  date?: Date | string | null | undefined;
  workStartTime?: string | null | undefined;
  workEndTime?: string | null | undefined;
}

/**
 * Calculates lateMinutes and status according to exact business rules:
 * 1. Check-in: if checkInTime > workStartTime, morning late minutes = checkIn - workStartTime
 * 2. Check-out early: if checkOutTime < workEndTime, remaining time = workEndTime - checkOutTime, ADDED to lateness
 * 3. Check-out late (overtime): if checkOutTime > workEndTime, extra time = checkOutTime - workEndTime, SUBTRACTED from lateness
 * 4. Total lateMinutes is clamped to minimum 0.
 * 5. status is 'ON_TIME' if lateMinutes === 0, 'LATE' if lateMinutes > 0, 'ABSENT' if checkInTime is null.
 */
export function calculateAttendanceMetrics(params: AttendanceCalculationParams): AttendanceCalculationResult {
  const { checkInTime, checkOutTime, date, workStartTime, workEndTime } = params;

  if (!checkInTime) {
    return {
      lateMinutes: 0,
      status: 'ABSENT',
      morningLateMinutes: 0,
      earlyMinutes: 0,
      overtimeMinutes: 0
    };
  }

  const [startHour, startMinute] = (workStartTime || '09:00').split(':').map(Number);
  const [endHour, endMinute] = (workEndTime || '18:00').split(':').map(Number);

  const startMinuteOfDay = (isNaN(startHour) ? 9 : startHour) * 60 + (isNaN(startMinute) ? 0 : startMinute);
  const endMinuteOfDay = (isNaN(endHour) ? 18 : endHour) * 60 + (isNaN(endMinute) ? 0 : endMinute);

  const checkInInfo = getTashkentInfo(checkInTime);
  const shiftDateInfo = date ? getTashkentInfo(date) : checkInInfo;

  // Morning lateness
  let morningLateMinutes = 0;
  if (checkInInfo.minuteOfDay > startMinuteOfDay) {
    morningLateMinutes = checkInInfo.minuteOfDay - startMinuteOfDay;
  }

  let finalLateMinutes = morningLateMinutes;
  let earlyMinutes = 0;
  let overtimeMinutes = 0;

  if (checkOutTime) {
    const checkOutInfo = getTashkentInfo(checkOutTime);

    // Day difference between checkout and shift start date in Tashkent
    const shiftMidnight = shiftDateInfo.dateMidnight.getTime();
    const checkOutMidnight = checkOutInfo.dateMidnight.getTime();
    const daysDiff = Math.round((checkOutMidnight - shiftMidnight) / (24 * 60 * 60 * 1000));

    // Absolute checkOut minute offset from start of shift day
    const absoluteCheckOutMinute = checkOutInfo.minuteOfDay + daysDiff * 1440;

    // Target work end minute offset from start of shift day
    let targetEndMinute = endMinuteOfDay;
    if (endMinuteOfDay < startMinuteOfDay) {
      // Overnight / night shift
      targetEndMinute += 1440;
    }

    const diff = absoluteCheckOutMinute - targetEndMinute;

    if (diff < 0) {
      // Vahli ketgan (Left early): yetmagan vaqt kechikishga qo'shiladi
      earlyMinutes = Math.abs(diff);
      finalLateMinutes = morningLateMinutes + earlyMinutes;
    } else if (diff > 0) {
      // Ish soatidan keyin ketgan (Overtime): ortiqcha ishlagan vaqt kechikishdan ayiriladi
      overtimeMinutes = diff;
      finalLateMinutes = Math.max(0, morningLateMinutes - overtimeMinutes);
    } else {
      // Aniq vaqtida ketgan
      finalLateMinutes = morningLateMinutes;
    }
  }

  const status: 'ON_TIME' | 'LATE' = finalLateMinutes > 0 ? 'LATE' : 'ON_TIME';

  return {
    lateMinutes: finalLateMinutes,
    status,
    morningLateMinutes,
    earlyMinutes,
    overtimeMinutes
  };
}
