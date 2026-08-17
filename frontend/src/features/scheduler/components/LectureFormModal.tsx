import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { useApp } from '../../../context/AppContext';
import { useScheduler } from '../context/SchedulerContext';
import type { Lecture, LectureType } from '../types/scheduler';
import { detectConflicts } from '../utils/schedulerUtils';
import courseHierarchy from '../../../data/courseHierarchy.json';
import teachersList from '../../../data/teachers.json';

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

const getSubjectsForBatch = (batchId: string): string[] => {
  for (const course of courseHierarchy) {
    for (const program of course.programs) {
      for (const level of program.levels) {
        if (level.batches.includes(batchId)) {
          return level.subjects || [];
        }
      }
    }
  }
  return [];
};

const getBatchMetadata = (batchId: string) => {
  for (const course of courseHierarchy) {
    for (const program of course.programs) {
      for (const level of program.levels) {
        if (level.batches.includes(batchId)) {
          return {
            courseName: course.courseName,
            programName: program.programName,
            levelName: level.levelName
          };
        }
      }
    }
  }
  return null;
};

const TEMPLATE_DAYS = [
  { value: '2026-01-05', label: 'Monday' },
  { value: '2026-01-06', label: 'Tuesday' },
  { value: '2026-01-07', label: 'Wednesday' },
  { value: '2026-01-08', label: 'Thursday' },
  { value: '2026-01-09', label: 'Friday' },
  { value: '2026-01-10', label: 'Saturday' },
  { value: '2026-01-11', label: 'Sunday' }
];

interface LectureFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  batchId: string;
  existingLecture?: Lecture;
  initialDate?: string;
  isTemplate?: boolean;
  onSave?: (lecture: any) => void;
  onDelete?: (id: string) => void;
}

export const LectureFormModal: React.FC<LectureFormModalProps> = ({
  isOpen, onClose, branchId, batchId, existingLecture, initialDate, isTemplate = false, onSave, onDelete
}) => {
  const { staff, branches } = useApp();
  const { rooms, lectures, addLectures, updateLecture, cancelLecture } = useScheduler();

  const branchName = branches.find(b => b.id === branchId || b.code === branchId)?.name || branchId;
  const metadata = getBatchMetadata(batchId);

  const [formData, setFormData] = useState({
    academicYearId: 'AY26',
    subjectId: '',
    teacherId: '',
    roomId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:30',
    lectureType: 'Regular' as LectureType,
    activityType: 'Lecture' as 'Lecture' | 'Break'
  });

  const [conflicts, setConflicts] = useState<{ message: string; severity: string }[]>([]);

  useEffect(() => {
    if (existingLecture) {
      setFormData({
        academicYearId: existingLecture.academicYearId || 'AY26',
        subjectId: existingLecture.subjectId || '',
        teacherId: existingLecture.teacherId || '',
        roomId: existingLecture.roomId || '',
        date: existingLecture.date,
        startTime: existingLecture.startTime || '09:00',
        endTime: existingLecture.endTime || '10:30',
        lectureType: existingLecture.lectureType || 'Regular',
        activityType: existingLecture.activityType || 'Lecture'
      });
    } else {
      // Defaults
      const targetDate = initialDate || new Date().toISOString().split('T')[0];
      setFormData(prev => ({
        ...prev,
        date: targetDate,
        startTime: '09:00',
        endTime: '10:30',
        roomId: '',
        teacherId: '',
        subjectId: '',
        activityType: 'Lecture'
      }));
    }
  }, [existingLecture, isOpen, batchId, initialDate]);

  useEffect(() => {
    if (batchId && formData.date && formData.startTime && formData.endTime && (formData.activityType === 'Break' || formData.teacherId)) {
      const detected = detectConflicts({
        ...formData,
        batchId,
        branchId,
        id: existingLecture?.id
      }, lectures);
      setConflicts(detected.map(c => ({ message: c.message, severity: c.severity })));
    } else {
      setConflicts([]);
    }
  }, [formData, batchId, branchId, existingLecture, lectures]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent, publishStatus: 'DRAFT' | 'PUBLISHED' = 'PUBLISHED') => {
    e.preventDefault();
    if (conflicts.some(c => c.severity === 'BLOCKING')) return;

    if (onSave) {
      onSave({
        id: existingLecture?.id,
        branchId,
        academicYearId: formData.academicYearId,
        batchId,
        subjectId: formData.activityType === 'Break' ? undefined : formData.subjectId,
        teacherId: formData.activityType === 'Break' ? undefined : formData.teacherId,
        roomId: formData.activityType === 'Break' ? undefined : formData.roomId,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        lectureType: formData.lectureType,
        activityType: formData.activityType,
        isOverride: false,
        publishStatus: publishStatus,
        status: 'SCHEDULED'
      });
    } else {
      if (existingLecture) {
        updateLecture(existingLecture.id, {
          subjectId: formData.activityType === 'Break' ? undefined : formData.subjectId,
          teacherId: formData.activityType === 'Break' ? undefined : formData.teacherId,
          roomId: formData.activityType === 'Break' ? undefined : formData.roomId,
          date: formData.date,
          startTime: formData.startTime,
          endTime: formData.endTime,
          lectureType: formData.lectureType,
          activityType: formData.activityType,
          isOverride: false
        });
        if (publishStatus === 'PUBLISHED') {
           updateLecture(existingLecture.id, { publishStatus });
        }
      } else {
        addLectures([{
          branchId,
          academicYearId: formData.academicYearId,
          batchId,
          subjectId: formData.activityType === 'Break' ? undefined : formData.subjectId,
          teacherId: formData.activityType === 'Break' ? undefined : formData.teacherId,
          roomId: formData.activityType === 'Break' ? undefined : formData.roomId,
          date: formData.date,
          startTime: formData.startTime,
          endTime: formData.endTime,
          lectureType: formData.lectureType,
          activityType: formData.activityType,
          isOverride: false,
          publishStatus: publishStatus
        }]);
      }
    }
    onClose();
  };

  const isBlocking = conflicts.some(c => c.severity === 'BLOCKING');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isTemplate ? (existingLecture ? 'Edit Default Slot' : 'Add Default Slot') : (existingLecture ? 'Edit Lecture' : 'Schedule New Lecture')}
      size="lg"
    >
      <form onSubmit={(e) => handleSubmit(e, 'PUBLISHED')} className="p-6 space-y-6">

        {/* Prefilled Filter Information (Read Only) */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 text-xs">
          <div>
            <span className="block font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Branch</span>
            <span className="font-bold text-slate-800">{branchName}</span>
          </div>
          <div>
            <span className="block font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Course</span>
            <span className="font-bold text-slate-800">{metadata?.courseName || 'N/A'}</span>
          </div>
          <div>
            <span className="block font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Program</span>
            <span className="font-bold text-slate-800">{metadata?.programName || 'N/A'}</span>
          </div>
          <div>
            <span className="block font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Level</span>
            <span className="font-bold text-slate-800">{metadata?.levelName || 'N/A'}</span>
          </div>
          <div>
            <span className="block font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Batch</span>
            <span className="font-bold text-blue-600">{batchId}</span>
          </div>
        </div>

        <div className="border-b border-slate-200 pb-4">
          <Select
            label="Activity Type" required
            options={[{ value: 'Lecture', label: 'Lecture' }, { value: 'Break', label: 'Break' }]}
            value={formData.activityType} onChange={(e) => handleChange('activityType', e.target.value)}
          />
        </div>

        {/* Detail Group */}
        {formData.activityType === 'Lecture' && (() => {
          const availableSubjects = getSubjectsForBatch(batchId);
          const filteredTeachers = formData.subjectId
            ? teachersList.filter(t => 
                t.subject.toLowerCase() === formData.subjectId.toLowerCase() && 
                t.batches.includes(batchId)
              )
            : [];
          return (
            <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-4">
              <Select
                label="Subject" required
                options={[{ value: '', label: 'Select Subject' }, ...availableSubjects.map(sub => ({ value: sub, label: sub }))]}
                value={formData.subjectId} onChange={(e) => {
                  handleChange('subjectId', e.target.value);
                  handleChange('teacherId', '');
                }}
              />
              <Select
                label="Teacher" required
                options={[{ value: '', label: 'Select Teacher' }, ...filteredTeachers.map(t => ({ value: t.id, label: t.name }))]}
                value={formData.teacherId} onChange={(e) => handleChange('teacherId', e.target.value)}
                disabled={!formData.subjectId}
              />
              <Select
                label="Room"
                options={[{ value: '', label: 'Select Room' }, ...rooms.filter(r => !r.branchId || r.branchId === branchId || r.branchId === 'B1' || r.branchId === 'MUM-WEST').map(r => ({ value: r.id, label: r.name }))]}
                value={formData.roomId} onChange={(e) => handleChange('roomId', e.target.value)}
              />
              <Select
                label="Lecture Type"
                options={['Regular', 'Tutorial', 'Practical', 'Lab', 'Doubt Session', 'Revision', 'Test Preparation'].map(t => ({ value: t, label: t }))}
                value={formData.lectureType} onChange={(e) => handleChange('lectureType', e.target.value)}
              />
            </div>
          );
        })()}

        {/* Schedule Group */}
        <div className="grid grid-cols-3 gap-4 pb-4">
          {isTemplate ? (
            <Select
              label="Day of Week" required
              options={TEMPLATE_DAYS}
              value={formData.date} onChange={(e) => handleChange('date', e.target.value)}
            />
          ) : (
            <Input
              type="date" label="Date" required
              value={formData.date} onChange={(e) => handleChange('date', e.target.value)}
            />
          )}
          <Input
            type="time" label="Start Time" required
            value={formData.startTime} onChange={(e) => handleChange('startTime', e.target.value)}
          />
          <Input
            type="time" label="End Time" required
            value={formData.endTime} onChange={(e) => handleChange('endTime', e.target.value)}
          />
        </div>

        {conflicts.length > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm space-y-1">
            <p className="font-bold">Conflicts Detected:</p>
            <ul className="list-disc pl-5">
              {conflicts.map((c, idx) => (
                <li key={idx}>{c.message}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t border-slate-100">
          <div>
            {existingLecture && (
              <Button
                type="button"
                variant="ghost"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this activity?')) {
                    if (onDelete) {
                      onDelete(existingLecture.id);
                    } else {
                      cancelLecture(existingLecture.id);
                    }
                    onClose();
                  }
                }}
              >
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={isBlocking}>
              {existingLecture ? 'Save' : 'Add'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
