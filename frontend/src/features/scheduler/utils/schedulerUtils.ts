import type { Lecture } from '../types/scheduler';

export interface Conflict {
  type: 'TEACHER' | 'ROOM' | 'BATCH';
  lectureId?: string;
  conflictingLectureId: string;
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

export const detectConflicts = (
  proposedLecture: Omit<Lecture, 'id' | 'publishStatus' | 'status' | 'createdAt' | 'updatedAt'> & { id?: string },
  existingLectures: Lecture[]
): Conflict[] => {
  const conflicts: Conflict[] = [];

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
      // (Assume teacher is uniquely identified across branches if they teach at multiple)
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
          message: `Teacher is already scheduled during this time (${existing.startTime}-${existing.endTime}).`
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


