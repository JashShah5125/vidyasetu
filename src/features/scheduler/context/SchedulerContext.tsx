import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import type { Lecture, Room, PublishStatus, LectureStatus } from '../types/scheduler';
import classroomsList from '../../../data/classrooms.json';
import initialLecturesData from '../../../data/lectures.json';

interface SchedulerContextType {
  lectures: Lecture[];
  rooms: Room[];

  // CRUD Operations
  addLectures: (newLectures: (Omit<Lecture, 'id' | 'createdAt' | 'updatedAt' | 'publishStatus' | 'status'> & { publishStatus?: PublishStatus })[]) => void;
  updateLecture: (id: string, updates: Partial<Lecture>) => void;
  cancelLecture: (id: string) => void;
  publishLectures: (lectureIds: string[]) => void;
  syncLectures: (batchId: string, updatedLectures: Lecture[], publishStatus: PublishStatus) => Promise<void>;
}

const SchedulerContext = createContext<SchedulerContextType | undefined>(undefined);

export const SchedulerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize lectures from localStorage or fallback to seed lectures.json
  const [lectures, setLectures] = useState<Lecture[]>(() => {
    const saved = localStorage.getItem('vs_lectures');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // Corrupt localStorage entry, fallback to seed
      }
    }
    return (initialLecturesData as Lecture[]);
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

  // Add new lectures
  const addLectures = (newLectures: (Omit<Lecture, 'id' | 'createdAt' | 'updatedAt' | 'publishStatus' | 'status'> & { publishStatus?: PublishStatus })[]) => {
    const now = new Date().toISOString();
    const created: Lecture[] = newLectures.map(l => ({
      ...l,
      id: `LEC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      publishStatus: l.publishStatus || ('DRAFT' as PublishStatus),
      status: 'SCHEDULED' as LectureStatus,
      createdAt: now,
      updatedAt: now
    }));

    setLectures(prev => {
      const next = [...prev, ...created];
      localStorage.setItem('vs_lectures', JSON.stringify(next));
      return next;
    });
  };

  // Update existing lecture
  const updateLecture = (id: string, updates: Partial<Lecture>) => {
    const updatedAt = new Date().toISOString();
    setLectures(prev => {
      const next = prev.map(lecture =>
        lecture.id === id
          ? { ...lecture, ...updates, updatedAt }
          : lecture
      );
      localStorage.setItem('vs_lectures', JSON.stringify(next));
      return next;
    });
  };

  // Cancel lecture
  const cancelLecture = (id: string) => {
    const updatedAt = new Date().toISOString();
    setLectures(prev => {
      const next = prev.map(lecture =>
        lecture.id === id
          ? { ...lecture, status: 'CANCELLED' as LectureStatus, updatedAt }
          : lecture
      );
      localStorage.setItem('vs_lectures', JSON.stringify(next));
      return next;
    });
  };

  // Publish lectures
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

  // Synchronize weekly grid changes for a batch (Insert, Update, Delete, Publish)
  const syncLectures = async (batchId: string, updatedLectures: Lecture[], publishStatus: PublishStatus) => {
    const now = new Date().toISOString();
    const originalLectures = lectures.filter(l => l.batchId === batchId);

    // 1. Determine deleted lectures (present in original batch schedule, but removed from updated list)
    const toDeleteIds = new Set(
      originalLectures.filter(orig => !updatedLectures.some(upd => upd.id === orig.id)).map(l => l.id)
    );

    // 2. Determine newly created lectures (having "TEMP-" or missing ID)
    const createdResults: Lecture[] = updatedLectures
      .filter(upd => !upd.id || String(upd.id).startsWith('TEMP-'))
      .map(upd => {
        const { id, ...rest } = upd;
        return {
          ...rest,
          id: `LEC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
          publishStatus,
          status: 'SCHEDULED' as LectureStatus,
          createdAt: now,
          updatedAt: now
        };
      });

    // 3. Determine updated existing lectures
    const toUpdate = updatedLectures
      .filter(upd => upd.id && !String(upd.id).startsWith('TEMP-'))
      .map(upd => ({
        ...upd,
        publishStatus,
        updatedAt: now
      }));

    // 4. Update React state and write directly to localStorage
    setLectures(prev => {
      // Remove deleted lectures
      let filtered = prev.filter(l => !toDeleteIds.has(l.id));

      // Replace updated lectures
      filtered = filtered.map(l => {
        const upd = toUpdate.find(u => u.id === l.id);
        return upd ? upd : l;
      });

      // Append newly created lectures
      const next = [...filtered, ...createdResults];
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

  return (
    <SchedulerContext.Provider value={value}>
      {children}
    </SchedulerContext.Provider>
  );
};

export const useScheduler = () => {
  const context = useContext(SchedulerContext);
  if (!context) {
    throw new Error('useScheduler must be used within a SchedulerProvider');
  }
  return context;
};
