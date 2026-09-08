import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import type { Lecture, Room, PublishStatus, LectureStatus } from '../types/scheduler';
import { timetableApi, type TimetableOptions } from '../../../services/timetableApi';

const parseLocalDate = (dateStr: string): Date => {
  if (dateStr.includes('T')) {
    dateStr = dateStr.split('T')[0];
  }
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts.map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateStr);
};

const formatLocalDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

interface SchedulerContextType {
  lectures: Lecture[];
  rooms: Room[];
  options: TimetableOptions | null;
  loading: boolean;

  // Actions
  fetchWeeklyLectures: (filters: {
    batchId?: string | number;
    teacherId?: string | number;
    roomId?: string | number;
    branchId?: string | number;
    startDate?: string;
    endDate?: string;
  }) => Promise<Lecture[]>;

  addLectures: (newLectures: (Omit<Lecture, 'id' | 'createdAt' | 'updatedAt' | 'publishStatus' | 'status'> & { publishStatus?: PublishStatus })[]) => Promise<void>;
  updateLecture: (id: string | number, updates: Partial<Lecture>) => Promise<void>;
  cancelLecture: (id: string | number, reason?: string) => Promise<void>;
  publishLectures: (lectureIds: (string | number)[]) => Promise<void>;
  syncLectures: (batchId: string | number, updatedLectures: Lecture[], publishStatus: PublishStatus, targetWeekStart?: string) => Promise<void>;
  applyDefaultToWeek: (batchId: string | number, weekStartDate: string, overwriteExisting?: boolean, skipHolidays?: boolean) => Promise<{ success: boolean; generatedCount: number }>;
  replicateWeek: (batchId: string | number, sourceWeekStart: string, targetWeekStart: string, overwriteExisting?: boolean) => Promise<{ success: boolean; count: number }>;
  refreshOptions: () => Promise<void>;
}

const SchedulerContext = createContext<SchedulerContextType | undefined>(undefined);

export const SchedulerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [options, setOptions] = useState<TimetableOptions | null>(null);
  const [loading, setLoading] = useState(false);

  // Load scheduler metadata & options on mount
  const refreshOptions = useCallback(async () => {
    try {
      const opts = await timetableApi.getOptions();
      setOptions(opts);
    } catch (err) {
      console.warn('Could not load live timetable options from API:', err);
    }
  }, []);

  useEffect(() => {
    refreshOptions();
  }, [refreshOptions]);

  // Derived rooms from live backend options
  const rooms: Room[] = useMemo(() => {
    if (!options?.classrooms) return [];
    return options.classrooms.map(c => ({
      id: String(c.id),
      branchId: String(c.branch_id),
      name: c.name || `Room ${c.room_number}`,
      room_number: c.room_number,
      capacity: c.capacity,
      type: (c.type || 'CLASSROOM') as any,
      isActive: c.status === 'active'
    }));
  }, [options]);

  // Fetch weekly lectures from backend API
  const fetchWeeklyLectures = useCallback(async (filters: {
    batchId?: string | number;
    teacherId?: string | number;
    roomId?: string | number;
    branchId?: string | number;
    startDate?: string;
    endDate?: string;
  }) => {
    setLoading(true);
    try {
      const data = await timetableApi.getWeeklyLectures(filters);
      setLectures(data);
      return data;
    } catch (error) {
      console.error('Error fetching weekly lectures from API:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Add lectures to backend & local state
  const addLectures = async (
    newLectures: (Omit<Lecture, 'id' | 'createdAt' | 'updatedAt' | 'publishStatus' | 'status'> & { publishStatus?: PublishStatus })[]
  ) => {
    const createdList: Lecture[] = [];
    for (const item of newLectures) {
      try {
        const created = await timetableApi.createLecture({
          branch_id: item.branchId,
          academic_year_id: item.academicYearId || 1,
          batch_id: item.batchId,
          subject_id: item.subjectId,
          teacher_user_id: item.teacherId,
          classroom_id: item.roomId || null,
          lecture_date: item.date,
          start_time: item.startTime,
          end_time: item.endTime,
          lecture_type: item.lectureType || 'Regular',
          activity_type: item.activityType || 'Lecture',
          slot_label: item.slotLabel || null,
          topic: item.topic || null,
          status: 'scheduled'
        });
        createdList.push({
          ...item,
          id: String(created.id),
          publishStatus: item.publishStatus || 'PUBLISHED',
          status: 'SCHEDULED'
        } as Lecture);
      } catch (err) {
        console.error('Failed to create single lecture on API:', err);
      }
    }

    if (createdList.length > 0) {
      setLectures(prev => [...prev, ...createdList]);
    }
  };

  // Update lecture on backend & local state
  const updateLecture = async (id: string | number, updates: Partial<Lecture>) => {
    try {
      await timetableApi.updateLecture(id, {
        branch_id: updates.branchId,
        batch_id: updates.batchId,
        subject_id: updates.subjectId,
        teacher_user_id: updates.teacherId,
        classroom_id: updates.roomId,
        lecture_date: updates.date,
        start_time: updates.startTime,
        end_time: updates.endTime,
        lecture_type: updates.lectureType,
        activity_type: updates.activityType,
        slot_label: updates.slotLabel,
        topic: updates.topic,
        status: updates.status ? updates.status.toLowerCase() : undefined
      });
    } catch (err) {
      console.error('Failed to update lecture on API:', err);
    }

    setLectures(prev => prev.map(l => (l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l)));
  };

  // Cancel lecture on backend & local state
  const cancelLecture = async (id: string | number, reason?: string) => {
    try {
      await timetableApi.cancelLecture(id, reason);
    } catch (err) {
      console.error('Failed to cancel lecture on API:', err);
    }

    setLectures(prev => prev.map(l => l.id === id ? { ...l, status: 'CANCELLED' } : l));
  };

  // Publish lectures
  const publishLectures = async (lectureIds: (string | number)[]) => {
    setLectures(prev =>
      prev.map(l =>
        lectureIds.includes(l.id) ? { ...l, publishStatus: 'PUBLISHED' as PublishStatus } : l
      )
    );
  };

  // Sync entire week's schedule to backend
  const syncLectures = async (batchId: string | number, updatedLectures: Lecture[], publishStatus: PublishStatus, targetWeekStart?: string) => {
    setLoading(true);
    try {
      const resolvedBatch = options?.batches?.find(b => String(b.id) === String(batchId) || b.name === batchId || b.code === batchId);
      const numBatchId = resolvedBatch?.id || batchId;
      const numBranchId = resolvedBatch?.branch_id || (options?.branches?.find(b => String(b.id) === String(batchId) || b.code === batchId || b.name === batchId)?.id) || 1;
      const numAcademicYearId = resolvedBatch?.academic_year_id || 1;

      for (const lec of updatedLectures) {
        const resolvedSubject = options?.subjects?.find(s => String(s.id) === String(lec.subjectId) || s.name === lec.subjectId || s.code === lec.subjectId);
        const subjectId = resolvedSubject?.id || lec.subjectId;

        const resolvedTeacher = options?.teachers?.find(t => String(t.id) === String(lec.teacherId) || t.name === lec.teacherId || t.full_name === lec.teacherId);
        const teacherId = resolvedTeacher?.id || lec.teacherId;

        const resolvedRoom = options?.classrooms?.find(c => String(c.id) === String(lec.roomId) || c.name === lec.roomId || c.room_number === lec.roomId);
        const roomId = resolvedRoom?.id || lec.roomId || null;

        if (lec.id && !String(lec.id).startsWith('TEMP-') && !String(lec.id).startsWith('LEC-')) {
          await timetableApi.updateLecture(lec.id, {
            branch_id: numBranchId,
            batch_id: numBatchId,
            subject_id: subjectId,
            teacher_user_id: teacherId,
            classroom_id: roomId,
            lecture_date: lec.date,
            start_time: lec.startTime.length === 5 ? `${lec.startTime}:00` : lec.startTime,
            end_time: lec.endTime.length === 5 ? `${lec.endTime}:00` : lec.endTime,
            lecture_type: lec.lectureType,
            activity_type: lec.activityType,
            slot_label: lec.slotLabel,
            topic: lec.topic,
            status: lec.status?.toLowerCase() || 'scheduled'
          });
        } else {
          await timetableApi.createLecture({
            branch_id: numBranchId,
            academic_year_id: numAcademicYearId,
            batch_id: numBatchId,
            subject_id: subjectId,
            teacher_user_id: teacherId,
            classroom_id: roomId,
            lecture_date: lec.date,
            start_time: lec.startTime.length === 5 ? `${lec.startTime}:00` : lec.startTime,
            end_time: lec.endTime.length === 5 ? `${lec.endTime}:00` : lec.endTime,
            lecture_type: lec.lectureType || 'Regular',
            activity_type: lec.activityType || 'Lecture',
            slot_label: lec.slotLabel,
            topic: lec.topic,
            status: 'scheduled'
          });
        }
      }

      // Reload fresh week from DB
      if (targetWeekStart) {
        const endD = parseLocalDate(targetWeekStart);
        endD.setDate(endD.getDate() + 6);
        const endDateStr = formatLocalDate(endD);
        const fresh = await timetableApi.getWeeklyLectures({
          batchId: numBatchId,
          startDate: targetWeekStart,
          endDate: endDateStr
        });
        setLectures(fresh);
      }
    } catch (error) {
      console.error('Error syncing lectures with API:', error);
    } finally {
      setLoading(false);
    }
  };

  // Apply Default Timetable to Week
  const applyDefaultToWeek = async (batchId: string | number, weekStartDate: string, overwriteExisting = false, skipHolidays = true) => {
    const res = await timetableApi.applyDefaultTimetable({
      batchId,
      weekStartDate,
      overwriteExisting,
      skipHolidays
    });

    const endD = parseLocalDate(weekStartDate);
    endD.setDate(endD.getDate() + 6);
    const fresh = await timetableApi.getWeeklyLectures({
      batchId,
      startDate: weekStartDate,
      endDate: formatLocalDate(endD)
    });
    setLectures(fresh);

    return res;
  };

  // Replicate Week
  const replicateWeek = async (batchId: string | number, sourceWeekStart: string, targetWeekStart: string, overwriteExisting = true) => {
    const res = await timetableApi.replicateWeek({
      batchId,
      sourceWeekStart,
      targetWeekStart,
      overwriteExisting
    });

    const endD = parseLocalDate(targetWeekStart);
    endD.setDate(endD.getDate() + 6);
    const fresh = await timetableApi.getWeeklyLectures({
      batchId,
      startDate: targetWeekStart,
      endDate: formatLocalDate(endD)
    });
    setLectures(fresh);

    return res;
  };

  const value = useMemo(() => ({
    lectures,
    rooms,
    options,
    loading,
    fetchWeeklyLectures,
    addLectures,
    updateLecture,
    cancelLecture,
    publishLectures,
    syncLectures,
    applyDefaultToWeek,
    replicateWeek,
    refreshOptions
  }), [lectures, rooms, options, loading, fetchWeeklyLectures, refreshOptions]);

  return <SchedulerContext.Provider value={value}>{children}</SchedulerContext.Provider>;
};

export const useScheduler = (): SchedulerContextType => {
  const context = useContext(SchedulerContext);
  if (!context) {
    throw new Error('useScheduler must be used within a SchedulerProvider');
  }
  return context;
};
