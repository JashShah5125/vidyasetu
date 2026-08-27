import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Calendar, Clock, MapPin, AlertCircle, CheckCircle2, BookOpen, Send } from 'lucide-react';
import type { ScheduleChange, Batch } from '../../data/mockData';
import type { Lecture } from '../../features/scheduler/types/scheduler';

interface RequestChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (change: ScheduleChange) => void;
  batches: Batch[];
  lectures: Lecture[];
  currentTeacher: any;
  getRoomName: (id?: string) => string;
  getTeacherName: (id?: string) => string;
  prefillLecture?: Lecture | null;
}

export const RequestChangeModal: React.FC<RequestChangeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  batches,
  lectures,
  currentTeacher,
  getRoomName,
  getTeacherName,
  prefillLecture
}) => {
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedLectureId, setSelectedLectureId] = useState<string>('');
  const [changeType, setChangeType] = useState<ScheduleChange['type']>('RESCHEDULED');
  const [proposedValue, setProposedValue] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Prefill if provided
  useEffect(() => {
    if (prefillLecture) {
      setSelectedBatch(prefillLecture.batchId);
      setSelectedDate(prefillLecture.date);
      setSelectedLectureId(prefillLecture.id);
    } else if (isOpen) {
      if (batches.length > 0 && !selectedBatch) {
        setSelectedBatch(batches[0].name);
      }
      if (!selectedDate) {
        setSelectedDate(new Date().toISOString().split('T')[0]);
      }
    }
  }, [isOpen, prefillLecture, batches]);

  // Reset on modal close
  useEffect(() => {
    if (!isOpen) {
      setSelectedBatch('');
      setSelectedDate('');
      setSelectedLectureId('');
      setChangeType('RESCHEDULED');
      setProposedValue('');
      setMessage('');
      setError('');
    }
  }, [isOpen]);

  // Query lectures for the chosen batch and date
  const dayLectures = useMemo(() => {
    if (!selectedBatch || !selectedDate) return [];
    return lectures.filter(l => 
      l.batchId === selectedBatch && 
      l.date === selectedDate && 
      l.status !== 'CANCELLED'
    ).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [lectures, selectedBatch, selectedDate]);

  const selectedLecture = useMemo(() => {
    return dayLectures.find(l => l.id === selectedLectureId) || null;
  }, [dayLectures, selectedLectureId]);

  // Auto-select first lecture if single lecture exists on the day
  useEffect(() => {
    if (dayLectures.length === 1 && !selectedLectureId) {
      setSelectedLectureId(dayLectures[0].id);
    } else if (dayLectures.length > 0 && !dayLectures.some(l => l.id === selectedLectureId)) {
      setSelectedLectureId(dayLectures[0].id);
    }
  }, [dayLectures, selectedLectureId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) {
      setError('Please select a batch.');
      return;
    }
    if (!selectedDate) {
      setError('Please select a date.');
      return;
    }
    if (!selectedLecture) {
      setError('Please select a lecture to request change for.');
      return;
    }
    if (!message.trim()) {
      setError('Please enter a message explaining the reason for the change request.');
      return;
    }

    const currentRoom = getRoomName(selectedLecture.roomId) || selectedLecture.roomId || 'Room TBA';
    let prevVal = `${selectedLecture.date} (${selectedLecture.startTime} – ${selectedLecture.endTime}) at ${currentRoom}`;
    if (changeType === 'ROOM_CHANGE') {
      prevVal = currentRoom;
    } else if (changeType === 'RESCHEDULED') {
      prevVal = `${selectedLecture.date} ${selectedLecture.startTime}`;
    } else if (changeType === 'CANCELLED') {
      prevVal = `${selectedLecture.date} ${selectedLecture.startTime} (${selectedLecture.subjectId || 'Lecture'})`;
    }

    const newChange: ScheduleChange = {
      id: 'REQ-' + Date.now().toString().slice(-6),
      type: changeType,
      batchId: selectedBatch,
      subject: selectedLecture.subjectId || 'Lecture',
      branchId: selectedLecture.branchId || 'MUM-WEST',
      branchName: 'Mumbai West',
      lectureId: selectedLecture.id,
      teacherId: currentTeacher?.id || selectedLecture.teacherId,
      teacherName: currentTeacher?.name || getTeacherName(selectedLecture.teacherId) || 'Faculty',
      date: selectedLecture.date,
      time: `${selectedLecture.startTime} - ${selectedLecture.endTime}`,
      previousValue: prevVal,
      newValue: proposedValue.trim() || undefined,
      dateTime: `${selectedLecture.date} ${selectedLecture.startTime}`,
      status: 'Pending Approval',
      requestedBy: currentTeacher?.name || 'Faculty',
      message: message.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSubmit(newChange);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request Schedule Change">
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-sm text-slate-500 -mt-2">
          Select the batch, date, and lecture for which you would like to request a reschedule, room change, or cancellation.
        </p>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700 font-medium">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: SELECT BATCH & STEP 2: SELECT DATE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              1. Select Batch <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedBatch}
              onChange={(e) => {
                setSelectedBatch(e.target.value);
                setSelectedLectureId('');
                setError('');
              }}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
              required
            >
              <option value="">Choose a batch...</option>
              {batches.map(b => (
                <option key={b.name} value={b.name}>
                  {b.name} ({b.course || 'Course'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              2. Select Day / Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedLectureId('');
                setError('');
              }}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
              required
            />
          </div>
        </div>

        {/* STEP 3: SELECT LECTURE */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              3. Select Lecture for this Day <span className="text-rose-500">*</span>
            </label>
            {dayLectures.length > 0 && (
              <span className="text-xs font-semibold text-blue-600">
                {dayLectures.length} lecture{dayLectures.length > 1 ? 's' : ''} scheduled
              </span>
            )}
          </div>

          {!selectedBatch || !selectedDate ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs text-slate-400 font-medium">
              Please select a batch and date above to load scheduled lectures.
            </div>
          ) : dayLectures.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
              {dayLectures.map((lec) => {
                const isSelected = selectedLectureId === lec.id;
                const roomName = getRoomName(lec.roomId) || 'Room TBA';
                return (
                  <div
                    key={lec.id}
                    onClick={() => {
                      setSelectedLectureId(lec.id);
                      setError('');
                    }}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Clock size={13} className={isSelected ? 'text-blue-600' : 'text-slate-400'} />
                          {lec.startTime} – {lec.endTime}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {lec.lectureType || 'Regular'}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-blue-800 mt-1.5 truncate">
                        {lec.subjectId}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
                      <span className="flex items-center gap-1">
                        <MapPin size={11} /> {roomName}
                      </span>
                      {isSelected && (
                        <span className="text-xs font-bold text-blue-700 flex items-center gap-1">
                          <CheckCircle2 size={13} /> Selected
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-center text-xs text-amber-800 font-medium">
              No scheduled lectures found for <strong>{selectedBatch}</strong> on <strong>{selectedDate}</strong>. Please choose another date or batch.
            </div>
          )}
        </div>

        {/* STEP 4: CHANGE TYPE, PROPOSED VALUES & MESSAGE */}
        {selectedLecture && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 animate-fade-in">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              4. Request Details & Note
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Change Request Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={changeType}
                  onChange={(e) => setChangeType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="RESCHEDULED">Reschedule Lecture (Time / Date)</option>
                  <option value="ROOM_CHANGE">Room Change Request</option>
                  <option value="CANCELLED">Lecture Cancellation</option>
                  <option value="SUBSTITUTE">Substitute Faculty Request</option>
                  <option value="OTHER">Other Modification</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {changeType === 'ROOM_CHANGE'
                    ? 'Preferred Room (Optional)'
                    : changeType === 'RESCHEDULED'
                    ? 'Proposed Date / Time (Optional)'
                    : changeType === 'SUBSTITUTE'
                    ? 'Suggested Faculty (Optional)'
                    : 'Proposed Value / Modification (Optional)'}
                </label>
                <input
                  type="text"
                  placeholder={
                    changeType === 'ROOM_CHANGE'
                      ? 'e.g. Room 201, Lab 1'
                      : changeType === 'RESCHEDULED'
                      ? 'e.g. Tomorrow 11:00 AM, Fri 2:00 PM'
                      : 'e.g. Details of change'
                  }
                  value={proposedValue}
                  onChange={(e) => setProposedValue(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Request Message / Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Explain the reason for this schedule change request (e.g. medical emergency, lab maintenance, student request)..."
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setError('');
                }}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
          </div>
        )}

        {/* FOOTER ACTIONS */}
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!selectedBatch || !selectedDate || !selectedLecture || !message.trim()}
            className="flex items-center gap-2"
          >
            <Send size={15} />
            Submit Request
          </Button>
        </div>
      </form>
    </Modal>
  );
};
