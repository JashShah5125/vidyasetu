import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import type { Lecture, Room, DefaultTimetable, PublishStatus, LectureStatus } from '../types/scheduler';
import classroomsList from '../../../data/classrooms.json';

interface SchedulerContextType {
  lectures: Lecture[];
  rooms: Room[];
  defaultTimetables: DefaultTimetable[];

  // CRUD Operations
  addLectures: (newLectures: (Omit<Lecture, 'id' | 'createdAt' | 'updatedAt' | 'publishStatus' | 'status'> & { publishStatus?: PublishStatus })[]) => void;
  updateLecture: (id: string, updates: Partial<Lecture>) => void;
  cancelLecture: (id: string) => void;
  publishLectures: (lectureIds: string[]) => void;
  syncLectures: (batchId: string, updatedLectures: Lecture[], isDefaultMode: boolean, publishStatus: PublishStatus) => Promise<void>;

  // Templates
  saveDefaultTimetable: (timetable: Omit<DefaultTimetable, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

const SchedulerContext = createContext<SchedulerContextType | undefined>(undefined);

export const SchedulerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [rooms] = useState<Room[]>(classroomsList as any[]);
  const [defaultTimetables, setDefaultTimetables] = useState<DefaultTimetable[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const lecturesRes = await fetch('http://localhost:3002/lectures');
        const lecturesData = await lecturesRes.json();
        setLectures(lecturesData);
      } catch (err) {
        console.error('Error fetching scheduler data', err);
      }
    };
    fetchData();
  }, []);

  const addLectures = async (newLectures: (Omit<Lecture, 'id' | 'createdAt' | 'updatedAt' | 'publishStatus' | 'status'> & { publishStatus?: PublishStatus })[]) => {
    const now = new Date().toISOString();
    const created = newLectures.map(l => ({
      ...l,
      id: `LEC-${Math.floor(10000 + Math.random() * 90000)}`,
      publishStatus: l.publishStatus || ('DRAFT' as PublishStatus),
      status: 'SCHEDULED' as LectureStatus,
      createdAt: now,
      updatedAt: now
    }));

    try {
      await Promise.all(created.map(lecture => 
        fetch('http://localhost:3002/lectures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lecture)
        })
      ));
      setLectures(prev => [...prev, ...created]);
    } catch (err) {
      console.error('Error adding lectures', err);
    }
  };

  const updateLecture = async (id: string, updates: Partial<Lecture>) => {
    const updatedAt = new Date().toISOString();
    try {
      await fetch(`http://localhost:3002/lectures/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updates, updatedAt })
      });
      setLectures(prev => prev.map(lecture =>
        lecture.id === id
          ? { ...lecture, ...updates, updatedAt }
          : lecture
      ));
    } catch (err) {
      console.error('Error updating lecture', err);
    }
  };

  const cancelLecture = async (id: string) => {
    const updatedAt = new Date().toISOString();
    try {
      await fetch(`http://localhost:3002/lectures/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED', updatedAt })
      });
      setLectures(prev => prev.map(lecture =>
        lecture.id === id
          ? { ...lecture, status: 'CANCELLED', updatedAt }
          : lecture
      ));
    } catch (err) {
      console.error('Error cancelling lecture', err);
    }
  };

  const publishLectures = async (lectureIds: string[]) => {
    const updatedAt = new Date().toISOString();
    try {
      await Promise.all(lectureIds.map(id => 
        fetch(`http://localhost:3002/lectures/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publishStatus: 'PUBLISHED', updatedAt })
        })
      ));
      setLectures(prev => prev.map(lecture =>
        lectureIds.includes(lecture.id)
          ? { ...lecture, publishStatus: 'PUBLISHED', updatedAt }
          : lecture
      ));
    } catch (err) {
      console.error('Error publishing lectures', err);
    }
  };

  const saveDefaultTimetable = async (timetable: Omit<DefaultTimetable, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const existingIdx = defaultTimetables.findIndex(t => t.batchId === timetable.batchId);
    
    if (existingIdx >= 0) {
      const existingId = defaultTimetables[existingIdx].id;
      const newDt: DefaultTimetable = {
        ...timetable,
        id: existingId,
        createdAt: defaultTimetables[existingIdx].createdAt,
        updatedAt: now
      };
      try {
        await fetch(`http://localhost:3002/defaultTimetables/${existingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newDt)
        });
        setDefaultTimetables(prev => {
          const copy = [...prev];
          copy[existingIdx] = newDt;
          return copy;
        });
      } catch(err) { console.error('Error saving timetable', err); }
    } else {
      const newDt: DefaultTimetable = {
        ...timetable,
        id: `DT-${Math.floor(Math.random() * 90000)}`,
        createdAt: now,
        updatedAt: now
      };
      try {
        await fetch(`http://localhost:3002/defaultTimetables`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newDt)
        });
        setDefaultTimetables(prev => [...prev, newDt]);
      } catch(err) { console.error('Error saving timetable', err); }
    }
  };
  const syncLectures = async (batchId: string, updatedLectures: Lecture[], isDefaultMode: boolean, publishStatus: PublishStatus) => {
    const originalLectures = lectures.filter(l => l.batchId === batchId && (isDefaultMode ? l.isOverride === false : true));

    // Lectures to delete: present in original but not in updated
    const toDelete = originalLectures.filter(orig => !updatedLectures.some(upd => upd.id === orig.id));

    // Lectures to create: have "TEMP-" in id
    const toCreate = updatedLectures.filter(upd => String(upd.id).startsWith('TEMP-')).map(upd => {
      const { id, ...rest } = upd; // strip temp id
      return {
        ...rest,
        publishStatus,
        status: 'SCHEDULED' as LectureStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });

    // Lectures to update: present in both, but might have changed
    const toUpdate = updatedLectures.filter(upd => !String(upd.id).startsWith('TEMP-')).map(upd => ({
      ...upd,
      publishStatus,
      updatedAt: new Date().toISOString()
    }));

    try {
      // 1. Delete
      await Promise.all(toDelete.map(l => 
        fetch(`http://localhost:3002/lectures/${l.id}`, { method: 'DELETE' })
      ));

      // 2. Create
      const createdResults = await Promise.all(toCreate.map(async (l) => {
        const res = await fetch('http://localhost:3002/lectures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(l)
        });
        return res.json();
      }));

      // 3. Update
      await Promise.all(toUpdate.map(l => 
        fetch(`http://localhost:3002/lectures/${l.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(l)
        })
      ));

      // 4. Update local context state
      setLectures(prev => {
        // Remove deleted lectures
        let filtered = prev.filter(l => !toDelete.some(del => del.id === l.id));
        // Replace updated lectures
        filtered = filtered.map(l => {
          const upd = toUpdate.find(u => u.id === l.id);
          return upd ? upd : l;
        });
        // Append created lectures
        return [...filtered, ...createdResults];
      });

    } catch (err) {
      console.error('Error syncing lectures:', err);
    }
  };
  const value = useMemo(() => ({
    lectures,
    rooms,
    defaultTimetables,
    addLectures,
    updateLecture,
    cancelLecture,
    publishLectures,
    syncLectures,
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
