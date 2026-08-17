import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import type { Lecture, Room, PublishStatus, LectureStatus } from '../types/scheduler';
import classroomsList from '../../../data/classrooms.json';
import initialLecturesData from '../../../data/lectures.json';

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

  // CRUD Operations
  addLectures: (newLectures: (Omit<Lecture, 'id' | 'createdAt' | 'updatedAt' | 'publishStatus' | 'status'> & { publishStatus?: PublishStatus })[]) => void;
  updateLecture: (id: string, updates: Partial<Lecture>) => void;
  cancelLecture: (id: string) => void;
  publishLectures: (lectureIds: string[]) => void;
  syncLectures: (batchId: string, updatedLectures: Lecture[], publishStatus: PublishStatus, targetWeekStart?: string) => Promise<void>;
}

const SchedulerContext = createContext<SchedulerContextType | undefined>(undefined);

export const SchedulerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize lectures from localStorage and ensure initial seed data is loaded
  const [lectures, setLectures] = useState<Lecture[]>(() => {
    const seed = (initialLecturesData as Lecture[]) || [];
    const saved = localStorage.getItem('vs_lectures');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const existingIds = new Set(parsed.map(p => p.id));
          const missingSeeds = seed.filter(s => !existingIds.has(s.id));
          const combined = [...parsed, ...missingSeeds];
          localStorage.setItem('vs_lectures', JSON.stringify(combined));
          return combined;
        }
      } catch {}
    }
    localStorage.setItem('vs_lectures', JSON.stringify(seed));
    return seed;
  });

  const [rooms] = useState<Room[]>(classroomsList as any[]);

  // Persist lectures state to localStorage on any modification
  useEffect(() => {
    localStorage.setItem('vs_lectures', JSON.stringify(lectures));
  }, [lectures]);

  // Sync across tabs/windows if localStorage changes
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'vs_lectures' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setLectures(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Add Lectures directly into client storage
  const addLectures = (
    newLectures: (Omit<Lecture, 'id' | 'createdAt' | 'updatedAt' | 'publishStatus' | 'status'> & { publishStatus?: PublishStatus })[]
  ) => {
    const now = new Date().toISOString();
    const created: Lecture[] = newLectures.map(l => ({
      ...l,
      id: `LEC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      publishStatus: l.publishStatus || 'PUBLISHED',
      status: 'SCHEDULED',
      createdAt: now,
      updatedAt: now
    }));

    setLectures(prev => {
      const next = [...prev, ...created];
      localStorage.setItem('vs_lectures', JSON.stringify(next));
      return next;
    });
  };

  // Update Lecture in client storage
  const updateLecture = (id: string, updates: Partial<Lecture>) => {
    const updatedAt = new Date().toISOString();
    setLectures(prev => {
      const next = prev.map(l => (l.id === id ? { ...l, ...updates, updatedAt } : l));
      localStorage.setItem('vs_lectures', JSON.stringify(next));
      return next;
    });
  };

  // Cancel / Delete Lecture in client storage
  const cancelLecture = (id: string) => {
    setLectures(prev => {
      const next = prev.filter(l => l.id !== id);
      localStorage.setItem('vs_lectures', JSON.stringify(next));
      return next;
    });
  };

  // Batch Publish Lectures
  const publishLectures = (lectureIds: string[]) => {
    const updatedAt = new Date().toISOString();
    setLectures(prev => {
      const next = prev.map(lecture =>
        lectureIds.includes(lecture.id)
          ? { ...lecture, publishStatus: 'PUBLISHED' as PublishStatus, updatedAt }
          : lecture
      );
      localStorage.setItem('vs_lectures', JSON.stringify(next));
      return next;
    });
  };

  // Save new lectures for a specific week directly without touching other weeks
  const syncLectures = async (batchId: string, updatedLectures: Lecture[], publishStatus: PublishStatus, targetWeekStart?: string) => {
    const now = new Date().toISOString();

    // Determine week start and end (Monday through Sunday)
    let weekStartStr = targetWeekStart;
    if (!weekStartStr && updatedLectures.length > 0 && updatedLectures[0].date) {
      const d = parseLocalDate(updatedLectures[0].date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      weekStartStr = formatLocalDate(d);
    }

    let weekEndStr = '';
    if (weekStartStr) {
      const endD = parseLocalDate(weekStartStr);
      endD.setDate(endD.getDate() + 6);
      weekEndStr = formatLocalDate(endD);
    }

    // Build the new official lecture records for this week
    const weekRecords: Lecture[] = updatedLectures.map(l => ({
      ...l,
      id: l.id && !String(l.id).startsWith('TEMP-') ? l.id : `LEC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      batchId,
      publishStatus,
      status: 'SCHEDULED' as LectureStatus,
      updatedAt: now,
      createdAt: l.createdAt || now
    }));

    setLectures(prev => {
      // Keep all lectures from other batches and other weeks
      const otherLectures = prev.filter(l => {
        if (l.batchId !== batchId) return true;
        if (weekStartStr && weekEndStr) {
          return l.date < weekStartStr || l.date > weekEndStr;
        }
        return false;
      });

      // Combine other weeks + this week's new records
      const next = [...otherLectures, ...weekRecords];
      localStorage.setItem('vs_lectures', JSON.stringify(next));
      return next;
    });
  };

  const value = useMemo(() => ({
    lectures,
    rooms,
    addLectures,
    updateLecture,
    cancelLecture,
    publishLectures,
    syncLectures
  }), [lectures, rooms]);

  return <SchedulerContext.Provider value={value}>{children}</SchedulerContext.Provider>;
};

export const useScheduler = (): SchedulerContextType => {
  const context = useContext(SchedulerContext);
  if (!context) {
    throw new Error('useScheduler must be used within a SchedulerProvider');
  }
  return context;
};
