export type PublishStatus = 'DRAFT' | 'PUBLISHED';
export type LectureStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
export type LectureType = 'Regular' | 'Tutorial' | 'Practical' | 'Lab' | 'Doubt Session' | 'Revision' | 'Test Preparation' | 'Activity';

export interface Room {
  id: string;
  branchId: string;
  name: string;
  capacity?: number;
  type?: 'CLASSROOM' | 'LAB' | 'OTHER';
  isActive: boolean;
}

export interface Lecture {
  id: string;

  branchId: string;
  academicYearId: string;

  courseId?: string;
  programId?: string;
  levelId?: string;
  batchId: string;

  activityType?: 'Lecture' | 'Break';
  subjectId?: string;
  teacherId?: string;
  roomId?: string;

  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:MM
  endTime: string;    // HH:MM

  lectureType?: LectureType;

  publishStatus: PublishStatus;
  status: LectureStatus;

  isOverride?: boolean; // True if this lecture has special substitution/override notes

  createdAt: string;
  updatedAt: string;
}

export interface DefaultTimetableSlot {
  id: string;
  dayOfWeek: number; // 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday, 7 = Sunday
  dayName: string;   // 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  startTime: string; // '09:00'
  endTime: string;   // '10:30'
  subjectId: string;
  teacherId: string;
  roomId: string;
  lectureType?: LectureType;
  activityType?: 'Lecture' | 'Break';
}

export interface DefaultTimetable {
  batchId: string;
  branchId?: string;
  updatedAt?: string;
  slots: DefaultTimetableSlot[];
}

