import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  AlertCircle,
  CheckCircle2,
  Send,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export type LectureRequestType = 'RESCHEDULE' | 'ROOM_CHANGE' | 'TEACHER_CHANGE' | 'CANCEL' | 'NEW_LECTURE';

export interface CreateLectureRequestPayload {
  branch_id: number;
  batch_id: number;
  subject_id: number;
  lecture_id?: number | null;
  request_type: LectureRequestType;
  current_date?: string | null;
  current_start_time?: string | null;
  current_end_time?: string | null;
  current_classroom_id?: number | null;
  current_teacher_user_id?: number | null;
  requested_date?: string | null;
  requested_start_time?: string | null;
  requested_end_time?: string | null;
  requested_classroom_id?: number | null;
  requested_teacher_user_id?: number | null;
  reason: string;
}

interface RequestChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateLectureRequestPayload) => Promise<void> | void;
  batches: Array<{ id: number; branch_id: number; name: string; code?: string }>;
  subjects: Array<{ id: number; name: string; code?: string }>;
  classrooms: Array<{ id: number; branch_id?: number; name: string; room_number?: string }>;
  teachers: Array<{ id: number; name: string; email?: string }>;
  branches?: Array<{ id: number; name: string; code?: string }>;
  lectures: any[];
  currentTeacher: any;
  prefillLecture?: any | null;
}

export const RequestChangeModal: React.FC<RequestChangeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  batches = [],
  subjects = [],
  classrooms = [],
  teachers = [],
  branches = [],
  lectures = [],
  currentTeacher,
  prefillLecture
}) => {
  // Form State
  const [requestType, setRequestType] = useState<LectureRequestType>('RESCHEDULE');
  const [selectedBatchId, setSelectedBatchId] = useState<number | ''>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedLectureId, setSelectedLectureId] = useState<number | ''>('');

  // Explicit Requested Column Fields
  const [requestedDate, setRequestedDate] = useState<string>('');
  const [requestedStartTime, setRequestedStartTime] = useState<string>('');
  const [requestedEndTime, setRequestedEndTime] = useState<string>('');
  const [requestedClassroomId, setRequestedClassroomId] = useState<number | ''>('');
  const [requestedTeacherUserId, setRequestedTeacherUserId] = useState<number | ''>('');
  const [reason, setReason] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Prefill when opened
  useEffect(() => {
    if (prefillLecture) {
      const bId = prefillLecture.batch?.id || prefillLecture.batchId;
      const parsedBId = Number(bId);
      if (parsedBId) setSelectedBatchId(parsedBId);
      else if (batches.length > 0) {
        const found = batches.find(b => b.name === bId || String(b.id) === String(bId));
        if (found) setSelectedBatchId(found.id);
      }

      const sId = prefillLecture.subject?.id || prefillLecture.subjectId;
      const parsedSId = Number(sId);
      if (parsedSId) setSelectedSubjectId(parsedSId);
      else if (subjects.length > 0) {
        const foundS = subjects.find(s => s.name === sId || String(s.id) === String(sId));
        if (foundS) setSelectedSubjectId(foundS.id);
      }

      const lDate = prefillLecture.date || new Date().toISOString().split('T')[0];
      setSelectedDate(lDate);
      setRequestedDate(lDate);

      if (prefillLecture.id) {
        setSelectedLectureId(Number(prefillLecture.id));
      }

      if (prefillLecture.startTime) {
        const rawStart = prefillLecture.startTime.slice(0, 5);
        setRequestedStartTime(rawStart);
      }
      if (prefillLecture.endTime) {
        const rawEnd = prefillLecture.endTime.slice(0, 5);
        setRequestedEndTime(rawEnd);
      }
      if (prefillLecture.classroom?.id || prefillLecture.roomId) {
        const rId = Number(prefillLecture.classroom?.id || prefillLecture.roomId);
        if (rId) setRequestedClassroomId(rId);
      }
      if (prefillLecture.teacherId || currentTeacher?.id) {
        setRequestedTeacherUserId(Number(prefillLecture.teacherId || currentTeacher?.id));
      }
    } else if (isOpen) {
      if (batches.length > 0 && selectedBatchId === '') {
        setSelectedBatchId(batches[0].id);
      }
      if (subjects.length > 0 && selectedSubjectId === '') {
        setSelectedSubjectId(subjects[0].id);
      }
      if (!selectedDate) {
        const todayStr = new Date().toISOString().split('T')[0];
        setSelectedDate(todayStr);
        setRequestedDate(todayStr);
      }
    }
  }, [isOpen, prefillLecture, batches, subjects, currentTeacher]);

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setRequestType('RESCHEDULE');
      setSelectedBatchId('');
      setSelectedSubjectId('');
      setSelectedDate('');
      setSelectedLectureId('');
      setRequestedDate('');
      setRequestedStartTime('');
      setRequestedEndTime('');
      setRequestedClassroomId('');
      setRequestedTeacherUserId('');
      setReason('');
      setError('');
      setSubmitting(false);
    }
  }, [isOpen]);

  // Filter lectures for selected batch and date
  const dayLectures = useMemo(() => {
    if (!selectedBatchId || !selectedDate) return [];
    return lectures.filter(l => {
      const bId = (l as any).batch?.id || (l as any).batchId;
      const bMatches = Number(bId) === Number(selectedBatchId) ||
        (l as any).batch?.name === batches.find(b => b.id === selectedBatchId)?.name;
      const lDate = (l as any).date || (l as any).lectureDate || '';
      const status = (l as any).status || '';
      return bMatches && (!lDate || lDate === selectedDate) && status.toUpperCase() !== 'CANCELLED';
    }).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  }, [lectures, selectedBatchId, selectedDate, batches]);

  // Find currently selected lecture object
  const selectedLecture = useMemo(() => {
    if (requestType === 'NEW_LECTURE') return null;
    return dayLectures.find(l => Number(l.id) === Number(selectedLectureId)) || null;
  }, [dayLectures, selectedLectureId, requestType]);

  // When a lecture is chosen, sync subject and current fields to requested inputs
  const handleSelectLecture = (lec: any) => {
    setSelectedLectureId(Number(lec.id));
    setError('');

    if (lec.subject?.id) {
      setSelectedSubjectId(Number(lec.subject.id));
    }
    if (lec.startTime) {
      setRequestedStartTime(lec.startTime.slice(0, 5));
    }
    if (lec.endTime) {
      setRequestedEndTime(lec.endTime.slice(0, 5));
    }
    if (lec.classroom?.id || lec.roomId) {
      setRequestedClassroomId(Number(lec.classroom?.id || lec.roomId));
    }
    if (lec.teacherId) {
      setRequestedTeacherUserId(Number(lec.teacherId));
    } else if (currentTeacher?.id) {
      setRequestedTeacherUserId(Number(currentTeacher.id));
    }
    if (lec.date) {
      setRequestedDate(lec.date);
    }
  };

  // Auto-select first lecture if single lecture exists on the selected day
  useEffect(() => {
    if (requestType !== 'NEW_LECTURE' && dayLectures.length > 0) {
      if (!selectedLectureId || !dayLectures.some(l => Number(l.id) === Number(selectedLectureId))) {
        handleSelectLecture(dayLectures[0]);
      }
    }
  }, [dayLectures, selectedLectureId, requestType]);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedBatchId) {
      setError('Please select a target batch.');
      return;
    }

    const targetSubjectId = selectedSubjectId || (selectedLecture as any)?.subject?.id;
    if (!targetSubjectId && requestType === 'NEW_LECTURE') {
      setError('Please select a subject for the new lecture.');
      return;
    }

    if (requestType !== 'NEW_LECTURE' && !selectedLecture) {
      setError('Please select the scheduled lecture to modify.');
      return;
    }

    if (requestType === 'RESCHEDULE') {
      if (!requestedDate) {
        setError('Please specify the requested date.');
        return;
      }
      if (!requestedStartTime || !requestedEndTime) {
        setError('Please specify both requested start time and end time.');
        return;
      }
      if (requestedStartTime >= requestedEndTime) {
        setError('Requested start time must be earlier than end time.');
        return;
      }
    } else if (requestType === 'ROOM_CHANGE') {
      if (!requestedClassroomId) {
        setError('Please select the requested classroom.');
        return;
      }
    } else if (requestType === 'TEACHER_CHANGE') {
      if (!requestedTeacherUserId) {
        setError('Please select the requested faculty / substitute teacher.');
        return;
      }
    } else if (requestType === 'NEW_LECTURE') {
      if (!requestedDate) {
        setError('Please specify the requested date for the new lecture.');
        return;
      }
      if (!requestedStartTime || !requestedEndTime) {
        setError('Please specify the requested start and end times.');
        return;
      }
      if (requestedStartTime >= requestedEndTime) {
        setError('Requested start time must be earlier than end time.');
        return;
      }
      if (!requestedClassroomId) {
        setError('Please select a classroom for the new lecture.');
        return;
      }
    }

    if (!reason.trim()) {
      setError('Please provide a reason / justification for this request.');
      return;
    }

    // Resolve branch ID
    const matchedBatch = batches.find(b => b.id === Number(selectedBatchId));
    const targetBranchId = matchedBatch?.branch_id || (branches.length > 0 ? branches[0].id : 1);

    // Current lecture values
    const curDate = selectedLecture?.date || selectedDate || null;
    const curStartTime = selectedLecture?.startTime
      ? (selectedLecture.startTime.length === 5 ? `${selectedLecture.startTime}:00` : selectedLecture.startTime)
      : null;
    const curEndTime = selectedLecture?.endTime
      ? (selectedLecture.endTime.length === 5 ? `${selectedLecture.endTime}:00` : selectedLecture.endTime)
      : null;
    const curClassroomId = selectedLecture?.classroom?.id || (selectedLecture?.roomId ? Number(selectedLecture.roomId) : null);
    const curTeacherUserId = selectedLecture?.teacherId ? Number(selectedLecture.teacherId) : (currentTeacher?.id ? Number(currentTeacher.id) : null);

    // Format requested times with seconds
    const reqStartTime = requestedStartTime
      ? (requestedStartTime.length === 5 ? `${requestedStartTime}:00` : requestedStartTime)
      : curStartTime;
    const reqEndTime = requestedEndTime
      ? (requestedEndTime.length === 5 ? `${requestedEndTime}:00` : requestedEndTime)
      : curEndTime;
    const reqDate = requestedDate || curDate;
    const reqClassroomId = requestedClassroomId ? Number(requestedClassroomId) : curClassroomId;
    const reqTeacherUserId = requestedTeacherUserId ? Number(requestedTeacherUserId) : curTeacherUserId;

    const payload: CreateLectureRequestPayload = {
      branch_id: targetBranchId,
      batch_id: Number(selectedBatchId),
      subject_id: Number(targetSubjectId || (subjects.length > 0 ? subjects[0].id : 1)),
      lecture_id: selectedLecture ? Number(selectedLecture.id) : null,
      request_type: requestType,
      current_date: curDate,
      current_start_time: curStartTime,
      current_end_time: curEndTime,
      current_classroom_id: curClassroomId,
      current_teacher_user_id: curTeacherUserId,
      requested_date: reqDate,
      requested_start_time: reqStartTime,
      requested_end_time: reqEndTime,
      requested_classroom_id: reqClassroomId,
      requested_teacher_user_id: reqTeacherUserId,
      reason: reason.trim()
    };

    try {
      setSubmitting(true);
      await onSubmit(payload);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper names
  const getRoomLabel = (id?: number | string | null) => {
    if (!id) return 'Not Assigned';
    const found = classrooms.find(c => Number(c.id) === Number(id));
    return found ? `${found.name} ${found.room_number ? `(${found.room_number})` : ''}` : `Room #${id}`;
  };

  const getTeacherLabel = (id?: number | string | null) => {
    if (!id) return 'Not Assigned';
    const found = teachers.find(t => Number(t.id) === Number(id));
    return found ? found.name : `Faculty #${id}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request Schedule Change" size="4xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-sm text-rose-700 font-medium">
            <AlertCircle size={18} className="flex-shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* ── 1. REQUEST TYPE SELECTOR PILLS ── */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            1. Select Request Type <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {[
              { type: 'RESCHEDULE' as const, label: 'Reschedule', desc: 'Date / Time Slot' },
              { type: 'ROOM_CHANGE' as const, label: 'Room Change', desc: 'Move Classroom' },
              { type: 'TEACHER_CHANGE' as const, label: 'Substitute', desc: 'Assign Faculty' },
              { type: 'CANCEL' as const, label: 'Cancel Lecture', desc: 'Request Cancellation' },
              { type: 'NEW_LECTURE' as const, label: 'Extra Lecture', desc: 'Add New Slot' }
            ].map((item) => {
              const active = requestType === item.type;
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => {
                    setRequestType(item.type);
                    setError('');
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    active
                      ? 'border-blue-600 bg-blue-50/90 ring-2 ring-blue-500/20 shadow-sm'
                      : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className={`text-sm font-bold ${active ? 'text-blue-700' : 'text-slate-800'}`}>
                    {item.label}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {item.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 2. TARGET BATCH & DATE / SUBJECT CONTEXT ── */}
        <div className="p-5 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-4">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers size={15} className="text-blue-600" />
              2. Target Batch & Lecture Context
            </span>
            {requestType !== 'NEW_LECTURE' && dayLectures.length > 0 && (
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                {dayLectures.length} lecture{dayLectures.length > 1 ? 's' : ''} available
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Batch <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedBatchId}
                onChange={(e) => {
                  setSelectedBatchId(Number(e.target.value) || '');
                  setSelectedLectureId('');
                  setError('');
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                required
              >
                <option value="">Choose a batch...</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.code ? `(${b.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {requestType === 'NEW_LECTURE' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Subject <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => {
                    setSelectedSubjectId(Number(e.target.value) || '');
                    setError('');
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                  required
                >
                  <option value="">Choose a subject...</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.code ? `(${s.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Lecture Day / Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setRequestedDate(e.target.value);
                    setSelectedLectureId('');
                    setError('');
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                  required
                />
              </div>
            )}
          </div>

          {/* If existing lecture mode, show lectures list */}
          {requestType !== 'NEW_LECTURE' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Select Scheduled Lecture to Modify <span className="text-rose-500">*</span>
              </label>

              {!selectedBatchId || !selectedDate ? (
                <div className="p-4 bg-white border border-slate-200 rounded-xl text-center text-xs text-slate-400">
                  Select batch and date above to view scheduled lectures.
                </div>
              ) : dayLectures.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-52 overflow-y-auto pr-1">
                  {dayLectures.map((lec) => {
                    const isSelected = Number(selectedLectureId) === Number(lec.id);
                    const roomName = lec.classroom?.name || getRoomLabel(lec.roomId);
                    const subjectName = lec.subject?.name || lec.subjectName || 'Lecture';
                    return (
                      <div
                        key={lec.id}
                        onClick={() => handleSelectLecture(lec)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/90 shadow-sm ring-2 ring-blue-500/20'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <Clock size={13} className={isSelected ? 'text-blue-600' : 'text-slate-400'} />
                              {lec.startTime} – {lec.endTime}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                              {lec.lectureType || 'Regular'}
                            </span>
                          </div>
                          <div className="text-sm font-bold text-slate-900 mt-1.5 truncate">
                            {subjectName}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 mt-2.5 pt-2 border-t border-slate-100">
                          <span className="flex items-center gap-1 text-[11px] truncate">
                            <MapPin size={11} className="flex-shrink-0" /> {roomName}
                          </span>
                          {isSelected && (
                            <span className="text-[11px] font-bold text-blue-700 flex items-center gap-1">
                              <CheckCircle2 size={12} /> Selected
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs text-amber-800">
                  No scheduled lectures found for this batch on this date.
                </div>
              )}
            </div>
          )}

          {/* CURRENT DETAILS SUMMARY BADGE */}
          {selectedLecture && (
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl text-xs space-y-1.5 shadow-sm">
              <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                Current Database Slot:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-700">
                <div>
                  <span className="text-slate-400 block text-[10px]">Date:</span>
                  <span className="font-semibold">{selectedLecture.date || selectedDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Time Window:</span>
                  <span className="font-semibold">{selectedLecture.startTime} - {selectedLecture.endTime}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Classroom:</span>
                  <span className="font-semibold truncate block">{selectedLecture.classroom?.name || getRoomLabel(selectedLecture.roomId)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Faculty:</span>
                  <span className="font-semibold truncate block">{getTeacherLabel(selectedLecture.teacherId || currentTeacher?.id)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── 3. SEPARATE FIELDS FOR ALL REQUESTED COLUMNS ── */}
        {(selectedLecture || requestType === 'NEW_LECTURE') && (
          <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={15} className="text-blue-600" />
                3. Requested Column Values (Proposed Changes)
              </div>
              <span className="text-xs text-slate-400">
                Specify all desired slot values for admin review
              </span>
            </div>

            {/* ROW A: REQUESTED DATE & REQUESTED TIME WINDOW */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Requested Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Calendar size={13} className="text-blue-600" />
                  Requested Date
                  {requestType === 'RESCHEDULE' || requestType === 'NEW_LECTURE' ? (
                    <span className="text-rose-500">*</span>
                  ) : (
                    <span className="text-slate-400 font-normal text-[10px]">(Optional)</span>
                  )}
                </label>
                <input
                  type="date"
                  value={requestedDate}
                  onChange={(e) => setRequestedDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                />
              </div>

              {/* Requested Start Time */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Clock size={13} className="text-blue-600" />
                  Requested Start Time
                  {requestType === 'RESCHEDULE' || requestType === 'NEW_LECTURE' ? (
                    <span className="text-rose-500">*</span>
                  ) : (
                    <span className="text-slate-400 font-normal text-[10px]">(Optional)</span>
                  )}
                </label>
                <input
                  type="time"
                  value={requestedStartTime}
                  onChange={(e) => setRequestedStartTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                />
              </div>

              {/* Requested End Time */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Clock size={13} className="text-blue-600" />
                  Requested End Time
                  {requestType === 'RESCHEDULE' || requestType === 'NEW_LECTURE' ? (
                    <span className="text-rose-500">*</span>
                  ) : (
                    <span className="text-slate-400 font-normal text-[10px]">(Optional)</span>
                  )}
                </label>
                <input
                  type="time"
                  value={requestedEndTime}
                  onChange={(e) => setRequestedEndTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                />
              </div>
            </div>

            {/* ROW B: REQUESTED CLASSROOM & REQUESTED TEACHER */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Requested Classroom / Room */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                  <MapPin size={13} className="text-blue-600" />
                  Requested Classroom / Room
                  {requestType === 'ROOM_CHANGE' || requestType === 'NEW_LECTURE' ? (
                    <span className="text-rose-500">*</span>
                  ) : (
                    <span className="text-slate-400 font-normal text-[10px]">(Optional)</span>
                  )}
                </label>
                <select
                  value={requestedClassroomId}
                  onChange={(e) => setRequestedClassroomId(Number(e.target.value) || '')}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                >
                  <option value="">Keep current / Choose room...</option>
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.room_number ? `(${c.room_number})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Requested Substitute / Teacher */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                  <User size={13} className="text-blue-600" />
                  Requested Faculty / Substitute
                  {requestType === 'TEACHER_CHANGE' ? (
                    <span className="text-rose-500">*</span>
                  ) : (
                    <span className="text-slate-400 font-normal text-[10px]">(Optional)</span>
                  )}
                </label>
                <select
                  value={requestedTeacherUserId}
                  onChange={(e) => setRequestedTeacherUserId(Number(e.target.value) || '')}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                >
                  <option value="">Current faculty / Choose substitute...</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.email ? `(${t.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* REASON / JUSTIFICATION */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Reason / Note for Administration <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Explain why this change is requested (e.g., student lab conflict, medical leave, room maintenance, syllabus catchup)..."
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setError('');
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                required
              />
            </div>
          </div>
        )}

        {/* ── 4. FOOTER ACTIONS ── */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={
              submitting ||
              !selectedBatchId ||
              (!selectedLecture && requestType !== 'NEW_LECTURE') ||
              !reason.trim()
            }
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm"
          >
            <Send size={15} />
            {submitting ? 'Submitting...' : 'Submit Change Request'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
