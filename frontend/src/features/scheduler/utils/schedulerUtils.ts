import type { Lecture } from '../types/scheduler';

export interface Conflict {
  type: 'TEACHER' | 'ROOM' | 'BATCH' | 'TEACHER_UNAVAILABLE';
  lectureId?: string;
  conflictingLectureId?: string;
  severity: 'BLOCKING' | 'WARNING';
  message: string;
}

// Convert HH:MM to minutes since midnight for easy comparison
export const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Check if two time ranges overlap
export const checkTimeOverlap = (start1: string, end1: string, start2: string, end2: string): boolean => {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  
  // They overlap if one starts before the other ends, and ends after the other starts.
  // (Exclusive overlap: 10:00-11:00 and 11:00-12:00 do NOT overlap)
  return s1 < e2 && e1 > s2;
};

export const getTeacherAvailabilityStatus = (
  teacherId: string | number,
  date: string,
  startTime: string,
  endTime: string,
  teacherAvailabilities?: Array<any>
): { isAvailable: boolean; reason?: string } => {
  if (!teacherId || !date || !startTime || !endTime || !teacherAvailabilities?.length) {
    return { isAvailable: true };
  }

  const teacherSlots = teacherAvailabilities.filter(s => String(s.teacher_user_id) === String(teacherId));
  if (teacherSlots.length === 0) return { isAvailable: true };

  // 1. Date specific exception
  const dateExc = teacherSlots.find(s => s.specific_date === date && (!s.is_available || s.is_available === 0));
  if (dateExc) {
    if (checkTimeOverlap(startTime, endTime, dateExc.start_time, dateExc.end_time)) {
      return { 
        isAvailable: false, 
        reason: dateExc.reason ? `Unavailable (${dateExc.reason})` : `Unavailable (${dateExc.start_time}–${dateExc.end_time})` 
      };
    }
  }

  // 2. Weekly recurring
  const dObj = new Date(date);
  const dayOfWeek = dObj.getDay() === 0 ? 7 : dObj.getDay();
  const recurring = teacherSlots.find(s => !s.specific_date && Number(s.day_of_week) === dayOfWeek);
  if (recurring) {
    if (!recurring.is_available || recurring.is_available === 0) {
      return { isAvailable: false, reason: 'Day Off' };
    }
    const propS = timeToMinutes(startTime);
    const propE = timeToMinutes(endTime);
    const availS = timeToMinutes(recurring.start_time);
    const availE = timeToMinutes(recurring.end_time);
    if (propS < availS || propE > availE) {
      return { isAvailable: false, reason: `Available hours: ${recurring.start_time}–${recurring.end_time}` };
    }
  }

  return { isAvailable: true };
};

export const detectConflicts = (
  proposedLecture: Omit<Lecture, 'id' | 'publishStatus' | 'status' | 'createdAt' | 'updatedAt'> & { id?: string },
  existingLectures: Lecture[],
  teacherAvailabilities?: Array<any>
): Conflict[] => {
  const conflicts: Conflict[] = [];

  // ── A. TEACHER AVAILABILITY CHECK ──
  if (
    proposedLecture.activityType !== 'Break' &&
    proposedLecture.teacherId &&
    proposedLecture.date &&
    proposedLecture.startTime &&
    proposedLecture.endTime &&
    teacherAvailabilities &&
    teacherAvailabilities.length > 0
  ) {
    const teacherSlots = teacherAvailabilities.filter(s => String(s.teacher_user_id) === String(proposedLecture.teacherId));

    // 1. Specific Date Exception (Leave / marked unavailable)
    const dateExc = teacherSlots.find(s => s.specific_date === proposedLecture.date && (!s.is_available || s.is_available === 0));
    if (dateExc) {
      const hasOverlap = checkTimeOverlap(proposedLecture.startTime, proposedLecture.endTime, dateExc.start_time, dateExc.end_time);
      if (hasOverlap) {
        conflicts.push({
          type: 'TEACHER_UNAVAILABLE',
          conflictingLectureId: `unavail-${dateExc.id}`,
          severity: 'BLOCKING',
          message: `Teacher has marked themselves UNAVAILABLE on this date (${dateExc.start_time} – ${dateExc.end_time})${dateExc.reason ? ` — Reason: ${dateExc.reason}` : ''}.`
        });
      }
    }

    // 2. Weekly Recurring Working Hours
    const dObj = new Date(proposedLecture.date);
    const dayOfWeek = dObj.getDay() === 0 ? 7 : dObj.getDay();
    const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const dayName = dayNames[dayOfWeek] || 'this day';

    const recurring = teacherSlots.find(s => !s.specific_date && Number(s.day_of_week) === dayOfWeek);
    if (recurring) {
      if (!recurring.is_available || recurring.is_available === 0) {
        conflicts.push({
          type: 'TEACHER_UNAVAILABLE',
          conflictingLectureId: `unavail-day-${recurring.id}`,
          severity: 'BLOCKING',
          message: `Teacher has marked themselves UNAVAILABLE on ${dayName}s (Day Off / Not Working).`
        });
      } else {
        const propS = timeToMinutes(proposedLecture.startTime);
        const propE = timeToMinutes(proposedLecture.endTime);
        const availS = timeToMinutes(recurring.start_time);
        const availE = timeToMinutes(recurring.end_time);
        if (propS < availS || propE > availE) {
          conflicts.push({
            type: 'TEACHER_UNAVAILABLE',
            conflictingLectureId: `unavail-hours-${recurring.id}`,
            severity: 'BLOCKING',
            message: `Teacher is only available between ${recurring.start_time} – ${recurring.end_time} on ${dayName}s.`
          });
        }
      }
    }
  }

  // ── B. DOUBLE-BOOKING & OVERLAP CONFLICTS ──
  for (const existing of existingLectures) {
    // Ignore cancelled lectures
    if (existing.status === 'CANCELLED') continue;

    // Ignore self when editing
    if (proposedLecture.id && existing.id === proposedLecture.id) continue;

    // Only compare same date
    if (existing.date !== proposedLecture.date) continue;

    // Check time overlap
    const hasOverlap = checkTimeOverlap(
      proposedLecture.startTime, 
      proposedLecture.endTime,
      existing.startTime,
      existing.endTime
    );

    if (hasOverlap) {
      // 1. Teacher Conflict
      if (
        proposedLecture.activityType !== 'Break' &&
        existing.activityType !== 'Break' &&
        existing.teacherId && 
        proposedLecture.teacherId && 
        existing.teacherId === proposedLecture.teacherId
      ) {
        conflicts.push({
          type: 'TEACHER',
          lectureId: proposedLecture.id,
          conflictingLectureId: existing.id,
          severity: 'BLOCKING',
          message: `Teacher is already scheduled for another lecture during this time (${existing.startTime}-${existing.endTime}).`
        });
      }

      // 2. Room Conflict (only check within the same branch)
      if (
        proposedLecture.activityType !== 'Break' &&
        existing.activityType !== 'Break' &&
        proposedLecture.roomId && 
        existing.roomId === proposedLecture.roomId && 
        existing.branchId === proposedLecture.branchId
      ) {
        conflicts.push({
          type: 'ROOM',
          lectureId: proposedLecture.id,
          conflictingLectureId: existing.id,
          severity: 'BLOCKING',
          message: `Room is already occupied during this time (${existing.startTime}-${existing.endTime}).`
        });
      }

      // 3. Batch Conflict (Assume batchId is unique within the institute)
      if (existing.batchId === proposedLecture.batchId) {
        conflicts.push({
          type: 'BATCH',
          lectureId: proposedLecture.id,
          conflictingLectureId: existing.id,
          severity: 'BLOCKING',
          message: `Batch is already scheduled for another lecture during this time (${existing.startTime}-${existing.endTime}).`
        });
      }
    }
  }

  return conflicts;
};

export const minutesToTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};


