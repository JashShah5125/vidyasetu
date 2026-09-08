import React, { useState, useEffect, useMemo } from 'react';
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

const getBatchMetadata = (batchId: string, optionsBatches?: any[]) => {
  if (optionsBatches) {
    const matched = optionsBatches.find(b => String(b.id) === String(batchId) || b.name === batchId || b.code === batchId);
    if (matched) {
      return {
        batchName: matched.name,
        batchCode: matched.code
      };
    }
  }

  for (const course of courseHierarchy) {
    for (const program of course.programs) {
      for (const level of program.levels) {
        if (level.batches.includes(batchId)) {
          return {
            courseName: course.courseName,
            programName: program.programName,
            levelName: level.levelName,
            batchName: batchId
          };
        }
      }
    }
  }
  return { batchName: batchId };
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
  const { branches } = useApp();
  const { rooms, lectures, options, addLectures, updateLecture, cancelLecture } = useScheduler();

  const branchName = branches.find(b => String(b.id) === String(branchId) || b.code === branchId || b.name === branchId)?.name || branchId;
  const metadata = getBatchMetadata(batchId, options?.batches);

  const [formData, setFormData] = useState({
    academicYearId: '1',
    subjectId: '',
    teacherId: '',
    roomId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:30',
    lectureType: 'Regular' as LectureType,
    activityType: 'Lecture' as 'Lecture' | 'Break',
    topic: '',
    slotLabel: ''
  });

  const [conflicts, setConflicts] = useState<{ message: string; severity: string }[]>([]);

  useEffect(() => {
    if (existingLecture) {
      setFormData({
        academicYearId: String(existingLecture.academicYearId || '1'),
        subjectId: String(existingLecture.subjectId || ''),
        teacherId: String(existingLecture.teacherId || ''),
        roomId: String(existingLecture.roomId || ''),
        date: existingLecture.date,
        startTime: existingLecture.startTime || '09:00',
        endTime: existingLecture.endTime || '10:30',
        lectureType: existingLecture.lectureType || 'Regular',
        activityType: (existingLecture.activityType || 'Lecture') as any,
        topic: existingLecture.topic || '',
        slotLabel: existingLecture.slotLabel || ''
      });
    } else {
      const targetDate = initialDate || (isTemplate ? '2026-01-05' : new Date().toISOString().split('T')[0]);
      setFormData(prev => ({
        ...prev,
        date: targetDate,
        startTime: '09:00',
        endTime: '10:30',
        roomId: '',
        teacherId: '',
        subjectId: '',
        activityType: 'Lecture',
        topic: '',
        slotLabel: ''
      }));
    }
  }, [existingLecture, isOpen, batchId, initialDate, isTemplate]);

  useEffect(() => {
    if (batchId && formData.date && formData.startTime && formData.endTime && (formData.activityType === 'Break' || formData.teacherId)) {
      const detected = detectConflicts({
        ...formData,
        batchId,
        branchId,
        id: String(existingLecture?.id || '')
      }, lectures);
      setConflicts(detected.map(c => ({ message: c.message, severity: c.severity })));
    } else {
      setConflicts([]);
    }
  }, [formData, batchId, branchId, existingLecture, lectures]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resolvedBatchObj = useMemo(() => {
    if (!batchId) return null;
    return options?.batches?.find(b => String(b.id) === String(batchId) || b.name === batchId || b.code === batchId) || null;
  }, [batchId, options]);

  const resolvedBatchId = resolvedBatchObj?.id || batchId;
  const resolvedLevelId = resolvedBatchObj?.level_id;

  // 1. Available subjects: Filtered to only subjects assigned to this batch's level
  const availableSubjects = useMemo(() => {
    if (!options?.subjects || options.subjects.length === 0) {
      return [
        { value: 'Physics', label: 'Physics' },
        { value: 'Chemistry', label: 'Chemistry' },
        { value: 'Mathematics', label: 'Mathematics' },
        { value: 'Biology', label: 'Biology' },
        { value: 'English', label: 'English' }
      ];
    }

    if (resolvedLevelId && options.levelSubjects && options.levelSubjects.length > 0) {
      const levelSubjectIds = options.levelSubjects
        .filter(ls => String(ls.level_id) === String(resolvedLevelId))
        .map(ls => Number(ls.subject_id));

      if (levelSubjectIds.length > 0) {
        const filtered = options.subjects.filter(s => levelSubjectIds.includes(Number(s.id)));
        if (filtered.length > 0) {
          return filtered.map(s => ({ value: String(s.id), label: s.name }));
        }
      }
    }

    return options.subjects.map(s => ({ value: String(s.id), label: s.name }));
  }, [options, resolvedLevelId]);

  // 2. Available teachers: Filtered to teachers allocated to this batch for the selected subject
  const availableTeachers = useMemo(() => {
    if (!options?.teachers || options.teachers.length === 0) {
      return teachersList.map(t => ({ value: String(t.id), label: t.name }));
    }

    const selectedSubjectId = options.subjects?.find(
      s => String(s.id) === String(formData.subjectId) || s.name === formData.subjectId
    )?.id || (formData.subjectId && !isNaN(Number(formData.subjectId)) ? Number(formData.subjectId) : undefined);

    // Faculty allocated to this batch
    const batchTeacherIds = (options.teacherAllocations || [])
      .filter(ta => String(ta.batch_id) === String(resolvedBatchId))
      .map(ta => Number(ta.teacher_user_id));

    // Faculty mapped to this subject
    const subjectTeacherIds = (options.teacherSubjects || [])
      .filter(ts => selectedSubjectId !== undefined && Number(ts.subject_id) === Number(selectedSubjectId))
      .map(ts => Number(ts.teacher_user_id));

    // Priority 1: Teachers allocated to this batch who ALSO teach this subject
    if (selectedSubjectId !== undefined && subjectTeacherIds.length > 0 && batchTeacherIds.length > 0) {
      const exactMatchTeachers = options.teachers.filter(
        t => batchTeacherIds.includes(Number(t.id)) && subjectTeacherIds.includes(Number(t.id))
      );

      if (exactMatchTeachers.length > 0) {
        const otherSubjectTeachers = options.teachers.filter(
          t => !batchTeacherIds.includes(Number(t.id)) && subjectTeacherIds.includes(Number(t.id))
        );

        if (otherSubjectTeachers.length > 0) {
          return [
            ...exactMatchTeachers.map(t => ({
              value: String(t.id),
              label: `${t.full_name || t.name} (Assigned to Batch)`
            })),
            ...otherSubjectTeachers.map(t => ({
              value: String(t.id),
              label: `${t.full_name || t.name} (Other Faculty)`
            }))
          ];
        }

        return exactMatchTeachers.map(t => ({
          value: String(t.id),
          label: t.full_name || t.name || `Teacher #${t.id}`
        }));
      }
    }

    // Fallback: If only batch teachers exist
    if (batchTeacherIds.length > 0) {
      const batchTeachers = options.teachers.filter(t => batchTeacherIds.includes(Number(t.id)));
      if (batchTeachers.length > 0) {
        return batchTeachers.map(t => ({
          value: String(t.id),
          label: t.full_name || t.name || `Teacher #${t.id}`
        }));
      }
    }

    // Fallback: If only subject teachers exist
    if (selectedSubjectId !== undefined && subjectTeacherIds.length > 0) {
      const subjectTeachers = options.teachers.filter(t => subjectTeacherIds.includes(Number(t.id)));
      if (subjectTeachers.length > 0) {
        return subjectTeachers.map(t => ({
          value: String(t.id),
          label: t.full_name || t.name || `Teacher #${t.id}`
        }));
      }
    }

    // Fallback: All teachers
    return options.teachers.map(t => ({
      value: String(t.id),
      label: t.full_name || t.name || `Teacher #${t.id}`
    }));
  }, [options, resolvedBatchId, formData.subjectId]);

  // Available classrooms from backend options or scheduler rooms
  const availableRooms = useMemo(() => {
    if (rooms && rooms.length > 0) {
      return rooms.map(r => ({
        value: String(r.id),
        label: r.name ? `${r.name} ${r.room_number ? `(${r.room_number})` : ''}` : `Room #${r.id}`
      }));
    }
    return [];
  }, [rooms]);

  const handleSubmit = async (e: React.FormEvent, publishStatus: 'DRAFT' | 'PUBLISHED' = 'PUBLISHED') => {
    e.preventDefault();
    if (conflicts.some(c => c.severity === 'BLOCKING')) return;

    const subjectObj = options?.subjects?.find(s => String(s.id) === String(formData.subjectId));
    const teacherObj = options?.teachers?.find(t => String(t.id) === String(formData.teacherId));
    const roomObj = rooms?.find(r => String(r.id) === String(formData.roomId));

    const enrichedData = {
      ...formData,
      subjectName: subjectObj?.name || formData.subjectId,
      teacherName: teacherObj?.full_name || teacherObj?.name || formData.teacherId,
      roomName: roomObj?.name || '',
      roomNumber: roomObj?.room_number || ''
    };

    if (onSave) {
      onSave({
        ...enrichedData,
        batchId,
        branchId,
        id: existingLecture?.id,
        publishStatus,
        status: existingLecture?.status || 'SCHEDULED'
      });
    } else {
      if (existingLecture) {
        await updateLecture(existingLecture.id, {
          ...enrichedData,
          publishStatus
        });
      } else {
        await addLectures([{
          ...enrichedData,
          batchId,
          branchId,
          publishStatus
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
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="block font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Branch</span>
            <span className="font-bold text-slate-800">{branchName}</span>
          </div>
          <div>
            <span className="block font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Batch</span>
            <span className="font-bold text-blue-600">{metadata?.batchName || batchId}</span>
          </div>
          <div>
            <span className="block font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Schedule Type</span>
            <span className="font-bold text-emerald-700">{isTemplate ? 'Recurring Weekly Template' : 'Calendar Lecture'}</span>
          </div>
          <div>
            <span className="block font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Timing</span>
            <span className="font-bold text-slate-700">{formData.startTime} – {formData.endTime}</span>
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
        {formData.activityType === 'Lecture' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-200 pb-4">
            <Select
              label="Subject" required
              options={[{ value: '', label: 'Select Subject' }, ...availableSubjects]}
              value={formData.subjectId} onChange={(e) => handleChange('subjectId', e.target.value)}
            />
            <Select
              label="Teacher" required
              options={[{ value: '', label: 'Select Teacher' }, ...availableTeachers]}
              value={formData.teacherId} onChange={(e) => handleChange('teacherId', e.target.value)}
            />
            <Select
              label="Room / Classroom"
              options={[{ value: '', label: 'Select Room (Optional)' }, ...availableRooms]}
              value={formData.roomId} onChange={(e) => handleChange('roomId', e.target.value)}
            />
            <Select
              label="Lecture Type"
              options={['Regular', 'Tutorial', 'Practical', 'Lab', 'Doubt Session', 'Revision', 'Test Preparation'].map(t => ({ value: t, label: t }))}
              value={formData.lectureType} onChange={(e) => handleChange('lectureType', e.target.value)}
            />
          </div>
        )}

        {/* Schedule Timing Group */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4">
          {isTemplate ? (
            <Select
              label="Day of Week" required
              options={TEMPLATE_DAYS}
              value={formData.date} onChange={(e) => handleChange('date', e.target.value)}
            />
          ) : (
            <Input
              label="Lecture Date" type="date" required
              value={formData.date} onChange={(e) => handleChange('date', e.target.value)}
            />
          )}
          <Input
            label="Start Time" type="time" required
            value={formData.startTime} onChange={(e) => handleChange('startTime', e.target.value)}
          />
          <Input
            label="End Time" type="time" required
            value={formData.endTime} onChange={(e) => handleChange('endTime', e.target.value)}
          />
        </div>

        {!isTemplate && (
          <div>
            <Input
              label="Planned Topic / Syllabus Unit (Optional)"
              placeholder="e.g. Chapter 4: Newton's Laws of Motion - Part 2"
              value={formData.topic}
              onChange={(e) => handleChange('topic', e.target.value)}
            />
          </div>
        )}

        {/* Conflicts Banner */}
        {conflicts.length > 0 && (
          <div className={`p-4 rounded-xl border ${isBlocking ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
            <h4 className="font-bold text-xs uppercase tracking-wider mb-1">
              {isBlocking ? 'Scheduling Conflict Detected' : 'Schedule Notice'}
            </h4>
            <ul className="text-xs space-y-1 list-disc list-inside">
              {conflicts.map((c, i) => (
                <li key={i}>{c.message}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <div>
            {existingLecture && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this lecture slot?')) {
                    if (onDelete && existingLecture.id) {
                      onDelete(String(existingLecture.id));
                    } else if (existingLecture.id) {
                      cancelLecture(existingLecture.id, 'Deleted by user');
                    }
                    onClose();
                  }
                }}
              >
                Delete Slot
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isBlocking}>
              {existingLecture ? 'Update Slot' : 'Save Slot'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
