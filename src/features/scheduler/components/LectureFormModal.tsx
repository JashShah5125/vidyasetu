import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { useApp } from '../../../context/AppContext';
import { useScheduler } from '../context/SchedulerContext';
import type { Lecture, LectureType } from '../types/scheduler';
import { detectConflicts } from '../utils/schedulerUtils';

interface LectureFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  batchId: string;
  existingLecture?: Lecture;
  isDefaultMode?: boolean;
}

export const LectureFormModal: React.FC<LectureFormModalProps> = ({ isOpen, onClose, branchId, batchId, existingLecture, isDefaultMode }) => {
  const { courses, batches, staff } = useApp();
  const { rooms, lectures, addLectures, updateLecture, cancelLecture } = useScheduler();

  const [formData, setFormData] = useState({
    academicYearId: 'AY26',
    subjectId: '',
    teacherId: '',
    roomId: '',
    date: new Date().toISOString().split('T')[0],
    dayOfWeek: new Date().getDay(),
    startTime: '09:00',
    endTime: '10:30',
    lectureType: 'Regular' as LectureType,
    activityType: 'Lecture' as 'Lecture' | 'Break'
  });

  const [conflicts, setConflicts] = useState<{ message: string; severity: string }[]>([]);

  useEffect(() => {
    if (existingLecture) {
      setFormData({
        academicYearId: existingLecture.academicYearId,
        batchId: batchId,
        subjectId: existingLecture.subjectId,
        teacherId: existingLecture.teacherId,
        roomId: existingLecture.roomId || '',
        date: existingLecture.date,
        dayOfWeek: new Date(existingLecture.date).getDay(),
        startTime: existingLecture.startTime,
        endTime: existingLecture.endTime,
        lectureType: existingLecture.lectureType || 'Regular',
        activityType: existingLecture.activityType || 'Lecture'
      });
    } else {
      // Defaults
      setFormData(prev => ({
        ...prev,
        batchId: batchId,
        date: new Date().toISOString().split('T')[0],
        dayOfWeek: new Date().getDay(),
        startTime: '09:00',
        endTime: '10:30',
        roomId: '',
        teacherId: '',
        subjectId: '',
        activityType: 'Lecture'
      }));
    }
  }, [existingLecture, isOpen, batchId]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (conflicts.some(c => c.severity === 'BLOCKING')) return;

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
        isOverride: !isDefaultMode
      });
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
        isOverride: !isDefaultMode
      }]);
    }
    onClose();
  };

  const isBlocking = conflicts.some(c => c.severity === 'BLOCKING');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existingLecture ? 'Edit Lecture' : 'Schedule New Lecture'} size="lg">
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        
        <div className="border-b border-slate-200 pb-4">
          <Select 
            label="Activity Type" required
            options={[{ value: 'Lecture', label: 'Lecture' }, { value: 'Break', label: 'Break' }]}
            value={formData.activityType} onChange={(e) => handleChange('activityType', e.target.value)}
          />
        </div>

        {/* Detail Group */}
        {formData.activityType === 'Lecture' && (
          <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-4">
          <Input 
            label="Subject" required
            value={formData.subjectId} onChange={(e) => handleChange('subjectId', e.target.value)}
          />
          <Select 
            label="Teacher" required
            options={[{ value: '', label: 'Select Teacher' }, ...staff.filter(s => s.role?.toLowerCase() === 'teacher').map(s => ({ value: s.id || s.employeeId || s.name, label: s.name }))]}
            value={formData.teacherId} onChange={(e) => handleChange('teacherId', e.target.value)}
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
        )}

        {/* Schedule Group */}
        <div className="grid grid-cols-3 gap-4 pb-4">
          {isDefaultMode ? (
            <Select
              label="Day of Week" required
              options={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, idx) => ({ value: idx.toString(), label: day }))}
              value={formData.dayOfWeek.toString()} onChange={(e) => handleChange('dayOfWeek', e.target.value)}
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

        <div className="flex justify-between items-center pt-4">
          <div>
            {existingLecture && (
              <Button 
                type="button" 
                variant="danger"
                onClick={() => {
                  if (confirm('Are you sure you want to cancel this activity?')) {
                    cancelLecture(existingLecture.id);
                    onClose();
                  }
                }}
              >
                Cancel Activity
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Close</Button>
            <Button type="submit" variant="primary" disabled={isBlocking}>
              {isDefaultMode ? (existingLecture ? 'Update Default Activity' : 'Add Default Activity') : (existingLecture ? 'Update Activity' : 'Save as Draft')}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
