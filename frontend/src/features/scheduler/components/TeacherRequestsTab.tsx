import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../../../components/ui/Button';
import { Table } from '../../../components/ui/Table';
import { Modal } from '../../../components/ui/Modal';
import { useApp } from '../../../context/AppContext';
import { useScheduler } from '../context/SchedulerContext';
import type { ScheduleChange } from '../../../data/mockData';
import scheduleRequestsData from '../../../data/scheduleRequests.json';
import teachersList from '../../../data/teachers.json';
import classroomsList from '../../../data/classrooms.json';
import {
  Clock, CheckCircle, XCircle, MessageSquare, ArrowRight,
  Sparkles, Check, X, AlertCircle, Eye, User, Calendar, MapPin
} from 'lucide-react';

interface TeacherRequestsTabProps {
  onSolveRequest: (request: ScheduleChange) => void;
  currentBatch?: string;
  currentBranch?: string;
}

const getTeacherName = (id?: string) => {
  if (!id) return '';
  const teacher = teachersList.find(t => t.id === id || t.name === id);
  return teacher ? teacher.name : id;
};

const getRoomName = (id?: string) => {
  if (!id) return '';
  const room = classroomsList.find(r => r.id === id || r.name === id);
  return room ? room.name : id;
};

export const TeacherRequestsTab: React.FC<TeacherRequestsTabProps> = ({
  onSolveRequest,
  currentBatch,
  currentBranch
}) => {
  const { addToast } = useApp();
  const { lectures } = useScheduler();

  // Requests state linked to localStorage & scheduleRequests.json
  const [requests, setRequests] = useState<ScheduleChange[]>(() => {
    const saved = localStorage.getItem('vs_schedule_requests');
    return saved ? JSON.parse(saved) : (scheduleRequestsData as ScheduleChange[]);
  });

  useEffect(() => {
    localStorage.setItem('vs_schedule_requests', JSON.stringify(requests));
  }, [requests]);

  // Sync if other tabs modify localStorage
  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem('vs_schedule_requests');
      if (saved) {
        setRequests(JSON.parse(saved));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [showOnlyCurrentBatch, setShowOnlyCurrentBatch] = useState(false);

  // Selected request for details modal
  const [selectedRequest, setSelectedRequest] = useState<ScheduleChange | null>(null);

  // Rejection modal state
  const [rejectingRequest, setRejectingRequest] = useState<ScheduleChange | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Target lecture matching selected request
  const targetLecture = useMemo(() => {
    if (!selectedRequest) return null;
    if (selectedRequest.lectureId) {
      const found = lectures.find(l => l.id === selectedRequest.lectureId);
      if (found) return found;
    }
    const targetDate = selectedRequest.date || (selectedRequest.dateTime ? selectedRequest.dateTime.split(' ')[0] : '');
    return lectures.find(l => l.batchId === selectedRequest.batchId && l.date === targetDate && l.subjectId === selectedRequest.subject) ||
      lectures.find(l => l.batchId === selectedRequest.batchId && l.date === targetDate) ||
      lectures.find(l => l.batchId === selectedRequest.batchId) || null;
  }, [selectedRequest, lectures]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      // Batch filter
      if (showOnlyCurrentBatch && currentBatch && req.batchId !== currentBatch) {
        return false;
      }
      // Status filter
      if (statusFilter === 'All') return true;
      if (statusFilter === 'Pending') return req.status === 'Pending Approval';
      if (statusFilter === 'Approved') return req.status === 'Approved' || req.status === 'Upcoming' || req.status === 'Occurred';
      if (statusFilter === 'Rejected') return req.status === 'Rejected';
      return true;
    });
  }, [requests, statusFilter, showOnlyCurrentBatch, currentBatch]);

  // Status counts
  const counts = useMemo(() => {
    const relevant = showOnlyCurrentBatch && currentBatch
      ? requests.filter(r => r.batchId === currentBatch)
      : requests;

    return {
      all: relevant.length,
      pending: relevant.filter(r => r.status === 'Pending Approval').length,
      approved: relevant.filter(r => r.status === 'Approved' || r.status === 'Upcoming' || r.status === 'Occurred').length,
      rejected: relevant.filter(r => r.status === 'Rejected').length
    };
  }, [requests, showOnlyCurrentBatch, currentBatch]);

  const handleRejectConfirm = () => {
    if (!rejectingRequest) return;

    const updated = requests.map(r => {
      if (r.id === rejectingRequest.id) {
        return {
          ...r,
          status: 'Rejected' as const,
          message: rejectReason.trim() ? `${r.message || ''} [Admin Rejection Note: ${rejectReason.trim()}]` : r.message,
          updatedAt: new Date().toISOString()
        };
      }
      return r;
    });

    setRequests(updated);
    addToast(`Request ${rejectingRequest.id} has been rejected.`, 'info');
    setRejectingRequest(null);
    setRejectReason('');
    if (selectedRequest?.id === rejectingRequest.id) {
      setSelectedRequest(null);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div>
          <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare size={18} className="text-blue-600" />
            Teacher Schedule Requests
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Review modification requests submitted by faculty. Click "Solve" to adjust and publish the timetable.
          </p>
        </div>

        {currentBatch && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
              <input
                type="checkbox"
                checked={showOnlyCurrentBatch}
                onChange={(e) => setShowOnlyCurrentBatch(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
              />
              <span>Filter by Selected Batch ({currentBatch})</span>
            </label>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {(['All', 'Pending', 'Approved', 'Rejected'] as const).map(status => {
          const count = status === 'All' ? counts.all :
            status === 'Pending' ? counts.pending :
            status === 'Approved' ? counts.approved : counts.rejected;

          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
                statusFilter === status
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{status}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                statusFilter === status ? 'bg-blue-700 text-white' :
                status === 'Pending' && count > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Requests Table */}
      <Table headers={['Request ID', 'Teacher', 'Type', 'Batch', 'Subject', 'Date & Time', 'Proposed Change', 'Reason', 'Status', 'Actions']}>
        {filteredRequests.length > 0 ? (
          filteredRequests.map(req => {
            const isPending = req.status === 'Pending Approval';
            const isApproved = req.status === 'Approved' || req.status === 'Upcoming' || req.status === 'Occurred';
            const isRejected = req.status === 'Rejected';

            return (
              <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-700 whitespace-nowrap text-xs">
                  {req.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-semibold text-slate-900 text-xs">{req.teacherName || getTeacherName(req.teacherId) || 'Faculty'}</div>
                  {req.teacherId && <div className="text-[10px] text-slate-400">{req.teacherId}</div>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                    req.type === 'ROOM_CHANGE' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    req.type === 'CANCELLED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                    req.type === 'SUBSTITUTE' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                    req.type === 'RESCHEDULED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {req.type.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-bold text-blue-700 text-xs">
                  {req.batchId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-800 text-xs">
                  {req.subject}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600">
                  {req.dateTime || req.date}
                </td>
                <td className="px-6 py-4 text-xs font-semibold">
                  {req.newValue ? (
                    <span className="text-slate-900 flex items-center gap-1">
                      <ArrowRight size={12} className="text-blue-500 flex-shrink-0" />
                      {req.newValue}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-xs text-slate-600 max-w-xs">
                  {req.message ? (
                    <div className="truncate" title={req.message}>
                      {req.message}
                    </div>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${
                    isPending ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                    isApproved ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                    'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}>
                    {isPending && <Clock size={11} />}
                    {isApproved && <CheckCircle size={11} />}
                    {isRejected && <XCircle size={11} />}
                    {isPending ? 'Pending' : isApproved ? 'Approved' : 'Rejected'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedRequest(req)}
                      className="px-2.5 py-1 text-xs"
                    >
                      <Eye size={13} className="mr-1" /> View
                    </Button>
                    {isPending && (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => onSolveRequest(req)}
                          className="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
                        >
                          <Sparkles size={13} className="mr-1" /> Solve
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setRejectingRequest(req);
                            setRejectReason('');
                          }}
                          className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 border-rose-200"
                        >
                          <X size={13} className="mr-1" /> Reject
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })
        ) : (
          <tr>
            <td colSpan={10} className="px-6 py-12 text-center text-slate-500">
              <MessageSquare className="mx-auto text-slate-300 mb-3" size={32} />
              <div className="font-semibold text-slate-700">No requests found</div>
              <div className="text-xs text-slate-400 mt-1">No teacher schedule modification requests match the current filter.</div>
            </td>
          </tr>
        )}
      </Table>

      {/* REQUEST DETAIL MODAL (READ-ONLY) */}
      <Modal
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        title={`Request Details: ${selectedRequest?.id || ''}`}
      >
        {selectedRequest && (() => {
          const lectureDate = selectedRequest.date || targetLecture?.date || (selectedRequest.dateTime ? selectedRequest.dateTime.split(' ')[0] : '');
          const formattedDate = lectureDate ? new Date(lectureDate).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }) : 'Date TBA';
          const timeSlot = selectedRequest.time || (targetLecture ? `${targetLecture.startTime} – ${targetLecture.endTime}` : (selectedRequest.dateTime?.includes(' ') ? selectedRequest.dateTime.split(' ')[1] : 'Time TBA'));
          const roomName = getRoomName(targetLecture?.roomId) || (selectedRequest.type === 'ROOM_CHANGE' ? selectedRequest.previousValue : 'Room TBA');
          const teacherName = selectedRequest.teacherName || getTeacherName(selectedRequest.teacherId || targetLecture?.teacherId) || 'Faculty';
          const lectureType = targetLecture?.lectureType || 'Regular (Theory)';

          return (
            <div className="space-y-5">
              {/* Header Status Banner */}
              <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded border ${
                    selectedRequest.type === 'ROOM_CHANGE' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    selectedRequest.type === 'CANCELLED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                    selectedRequest.type === 'SUBSTITUTE' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                    selectedRequest.type === 'RESCHEDULED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {selectedRequest.type.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">• {selectedRequest.id}</span>
                </div>

                <span className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${
                  selectedRequest.status === 'Pending Approval' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                  selectedRequest.status === 'Approved' || selectedRequest.status === 'Upcoming' || selectedRequest.status === 'Occurred' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                  'bg-rose-100 text-rose-800 border border-rose-200'
                }`}>
                  {selectedRequest.status === 'Pending Approval' ? <Clock size={12} /> :
                   selectedRequest.status === 'Rejected' ? <XCircle size={12} /> : <CheckCircle size={12} />}
                  {selectedRequest.status}
                </span>
              </div>

              {/* Complete Lecture Details Section */}
              <div className="space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Target Lecture Details</div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  {/* Box 1: Subject & Batch */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Subject & Batch</div>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">{selectedRequest.subject}</div>
                    <div className="font-semibold text-blue-700 mt-0.5">{selectedRequest.batchId}</div>
                  </div>

                  {/* Box 2: Faculty */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Faculty Member</div>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">{teacherName}</div>
                    <div className="text-slate-500 mt-0.5">{selectedRequest.teacherId || targetLecture?.teacherId || 'ID: Faculty'}</div>
                  </div>

                  {/* Box 3: Date & Time */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="font-bold text-slate-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
                      <Calendar size={11} className="text-blue-500" />
                      Scheduled Date & Time
                    </div>
                    <div className="font-bold text-slate-800 mt-1">{formattedDate}</div>
                    <div className="text-slate-600 font-semibold mt-0.5 flex items-center gap-1">
                      <Clock size={11} className="text-slate-400" />
                      {timeSlot}
                    </div>
                  </div>

                  {/* Box 4: Room & Format */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="font-bold text-slate-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
                      <MapPin size={11} className="text-blue-500" />
                      Location & Format
                    </div>
                    <div className="font-bold text-slate-800 mt-1">{roomName}</div>
                    <div className="text-slate-500 font-medium mt-0.5">{lectureType}</div>
                  </div>
                </div>
              </div>

              {/* Schedule Comparison Box */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Schedule Modification Summary</div>
                <div className="flex items-start gap-2">
                  <span className="text-slate-400 font-medium min-w-[75px]">Current / Old:</span>
                  <span className="text-slate-600 line-through decoration-slate-400 font-medium">
                    {selectedRequest.previousValue}
                  </span>
                </div>
                {selectedRequest.newValue && (
                  <div className="flex items-start gap-2 pt-1 border-t border-slate-200/60">
                    <span className="text-blue-600 font-bold min-w-[75px]">Requested:</span>
                    <span className="text-slate-900 font-bold flex items-center gap-1.5">
                      <ArrowRight size={13} className="text-blue-500" />
                      {selectedRequest.newValue}
                    </span>
                  </div>
                )}
              </div>

              {/* Teacher Reason Note */}
              {selectedRequest.message && (
                <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 text-xs text-slate-700 space-y-1">
                  <div className="font-bold text-blue-900 flex items-center gap-1.5">
                    <MessageSquare size={14} className="text-blue-600" />
                    Teacher Message / Reason
                  </div>
                  <p className="text-slate-700 leading-relaxed pl-5 font-normal">
                    {selectedRequest.message}
                  </p>
                </div>
              )}

              {/* Metadata Footer */}
              <div className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-slate-100">
                <span>Submitted: {selectedRequest.createdAt ? new Date(selectedRequest.createdAt).toLocaleString() : 'Recent'}</span>
                <span>Branch: {selectedRequest.branchName || selectedRequest.branchId || currentBranch || 'Mumbai West'}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                {selectedRequest.status === 'Pending Approval' ? (
                  <>
                    <Button
                      variant="primary"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 border-emerald-600 flex items-center justify-center gap-2"
                      onClick={() => {
                        const req = selectedRequest;
                        setSelectedRequest(null);
                        onSolveRequest(req);
                      }}
                    >
                      <Sparkles size={15} />
                      Solve Request
                    </Button>
                    <Button
                      variant="secondary"
                      className="flex-1 text-rose-600 hover:bg-rose-50 border-rose-200 flex items-center justify-center gap-2"
                      onClick={() => {
                        setRejectingRequest(selectedRequest);
                        setRejectReason('');
                      }}
                    >
                      <X size={15} />
                      Reject
                    </Button>
                    <Button variant="secondary" onClick={() => setSelectedRequest(null)}>
                      Close
                    </Button>
                  </>
                ) : (
                  <Button variant="secondary" className="w-full" onClick={() => setSelectedRequest(null)}>
                    Close
                  </Button>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* REJECT CONFIRMATION MODAL */}
      <Modal
        isOpen={!!rejectingRequest}
        onClose={() => setRejectingRequest(null)}
        title="Reject Schedule Change Request"
      >
        {rejectingRequest && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to reject request <strong className="text-slate-900">{rejectingRequest.id}</strong> submitted by <strong className="text-slate-900">{rejectingRequest.teacherName || getTeacherName(rejectingRequest.teacherId) || 'Faculty'}</strong> for batch <strong className="text-blue-700">{rejectingRequest.batchId}</strong>?
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Optional Rejection Note / Reason for Faculty:
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., Room 201 is already booked by JEE-Evening batch during this time slot."
                rows={3}
                className="w-full p-2.5 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              />
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <Button
                variant="primary"
                className="flex-1 bg-rose-600 hover:bg-rose-700 border-rose-600"
                onClick={handleRejectConfirm}
              >
                Confirm Rejection
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setRejectingRequest(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
