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

  isOverride?: boolean; // True if this lecture overrides a default timetable slot
  defaultTimetableId?: string; // ID of the default timetable pattern this came from
  dayOfWeek?: number; // 0 = Sunday, 1 = Monday, etc. (used for default template lectures)

  createdAt: string;
  updatedAt: string;
}

export interface DefaultTimetablePattern {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  activityType?: 'Lecture' | 'Break';
  subjectId?: string;
  teacherId?: string;
  roomId?: string;
  lectureType?: LectureType;
}

export interface DefaultTimetable {
  id: string;
  batchId: string;
  branchId: string;
  academicYearId: string;
  patterns: DefaultTimetablePattern[];
  status: 'DRAFT' | 'PUBLISHED';
  createdAt: string;
  updatedAt: string;
}
