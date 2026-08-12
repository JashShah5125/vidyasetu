import React, { createContext, useContext, useState, useMemo } from 'react';
import type { Lecture, Room, DefaultTimetable, PublishStatus, LectureStatus } from '../types/scheduler';
import { INITIAL_LECTURES, INITIAL_ROOMS } from '../../../data/mockData';

interface SchedulerContextType {
  lectures: Lecture[];
  rooms: Room[];
  defaultTimetables: DefaultTimetable[];
  
  // CRUD Operations
  addLectures: (newLectures: Omit<Lecture, 'id' | 'createdAt' | 'updatedAt' | 'publishStatus' | 'status'>[]) => void;
  updateLecture: (id: string, updates: Partial<Lecture>) => void;
  cancelLecture: (id: string) => void;
  publishLectures: (lectureIds: string[]) => void;
  
  // Templates
  saveDefaultTimetable: (timetable: Omit<DefaultTimetable, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

const SchedulerContext = createContext<SchedulerContextType | undefined>(undefined);

export const SchedulerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lectures, setLectures] = useState<Lecture[]>(INITIAL_LECTURES);
  const [rooms] = useState<Room[]>(INITIAL_ROOMS);
  const [defaultTimetables, setDefaultTimetables] = useState<DefaultTimetable[]>([]);

  const addLectures = (newLectures: Omit<Lecture, 'id' | 'createdAt' | 'updatedAt' | 'publishStatus' | 'status'>[]) => {
    const now = new Date().toISOString();
    const created = newLectures.map(l => ({
      ...l,
      id: `LEC-${Math.floor(10000 + Math.random() * 90000)}`,
      publishStatus: 'DRAFT' as PublishStatus,
      status: 'SCHEDULED' as LectureStatus,
      createdAt: now,
      updatedAt: now
    }));
    
    setLectures(prev => [...prev, ...created]);
  };

  const updateLecture = (id: string, updates: Partial<Lecture>) => {
    setLectures(prev => prev.map(lecture => 
      lecture.id === id 
        ? { ...lecture, ...updates, updatedAt: new Date().toISOString() } 
        : lecture
    ));
  };

  const cancelLecture = (id: string) => {
    setLectures(prev => prev.map(lecture => 
      lecture.id === id 
        ? { ...lecture, status: 'CANCELLED', updatedAt: new Date().toISOString() } 
        : lecture
    ));
  };

  const publishLectures = (lectureIds: string[]) => {
    setLectures(prev => prev.map(lecture => 
      lectureIds.includes(lecture.id)
        ? { ...lecture, publishStatus: 'PUBLISHED', updatedAt: new Date().toISOString() } 
        : lecture
    ));
  };

  const saveDefaultTimetable = (timetable: Omit<DefaultTimetable, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newDt: DefaultTimetable = {
      ...timetable,
      id: `DT-${Math.floor(Math.random() * 90000)}`,
      createdAt: now,
      updatedAt: now
    };
    setDefaultTimetables(prev => {
      // replace existing for batch if exists
      const existingIdx = prev.findIndex(t => t.batchId === timetable.batchId);
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = { ...newDt, id: prev[existingIdx].id }; // preserve ID
        return copy;
      }
      return [...prev, newDt];
    });
  };

  const value = useMemo(() => ({
    lectures,
    rooms,
    defaultTimetables,
    addLectures,
    updateLecture,
    cancelLecture,
    publishLectures,
    saveDefaultTimetable
  }), [lectures, rooms, defaultTimetables]);

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
