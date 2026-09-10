import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../../../components/ui/Button';
import { Table } from '../../../components/ui/Table';
import { Modal } from '../../../components/ui/Modal';
import { useApp } from '../../../context/AppContext';
import { lectureRequestApi, type LectureRequest } from '../../../services/lectureRequestApi';
import {
  Clock, CheckCircle, XCircle, MessageSquare, ArrowRight,
  Check, X, Eye, Calendar, MapPin, AlertTriangle,
  Loader2, RefreshCw, Send, Ban
} from 'lucide-react';

interface TeacherRequestsTabProps {
  currentBranch?: string;
  onRequestUpdated?: () => void;
}

const formatTime = (t: string | null) => {
  if (!t) return '';
  return t.slice(0, 5);
};

const formatDate = (d: string | null) => {
  if (!d) return 'Date TBA';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

const typeLabels: Record<string, string> = {
  RESCHEDULE: 'Reschedule',
  ROOM_CHANGE: 'Room Change',
  TEACHER_CHANGE: 'Teacher Change',
  CANCEL: 'Cancel',
  NEW_LECTURE: 'New Lecture'
};

const typeColors: Record<string, string> = {
  RESCHEDULE: 'bg-amber-50 text-amber-700 border-amber-200',
  ROOM_CHANGE: 'bg-blue-50 text-blue-700 border-blue-200',
  TEACHER_CHANGE: 'bg-purple-50 text-purple-700 border-purple-200',
  CANCEL: 'bg-rose-50 text-rose-700 border-rose-200',
  NEW_LECTURE: 'bg-emerald-50 text-emerald-700 border-emerald-200'
};

const statusDisplay: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800 border border-amber-200', icon: <Clock size={10} /> },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-800 border border-blue-200', icon: <CheckCircle size={10} /> },
  rejected: { label: 'Rejected', color: 'bg-rose-100 text-rose-800 border border-rose-200', icon: <XCircle size={10} /> },
  cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-600 border border-slate-200', icon: <Ban size={10} /> },
  applied: { label: 'Applied', color: 'bg-emerald-100 text-emerald-800 border border-emerald-200', icon: <CheckCircle size={10} /> }
};

export const TeacherRequestsTab: React.FC<TeacherRequestsTabProps> = ({
  currentBranch,
  onRequestUpdated
}) => {
  const { addToast } = useApp();

  const [requests, setRequests] = useState<LectureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0, applied: 0 });

  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'applied'>('all');
  const [selectedRequest, setSelectedRequest] = useState<LectureRequest | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<LectureRequest | null>(null);

  const [rejectingRequest, setRejectingRequest] = useState<LectureRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (currentBranch) filters.branchId = currentBranch;
      if (statusFilter !== 'all') filters.status = statusFilter;

      const [list, cnt] = await Promise.all([
        lectureRequestApi.listRequests(filters),
        lectureRequestApi.getStatusCounts(currentBranch ? { branchId: currentBranch } : undefined)
      ]);
      setRequests(list);
      setCounts(cnt);
    } catch (err) {
      console.error('Failed to fetch requests:', err);
      addToast('Failed to load schedule requests', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentBranch, statusFilter, addToast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleViewDetail = async (req: LectureRequest) => {
    setSelectedRequest(req);
    setDetailLoading(true);
    try {
      const data = await lectureRequestApi.getRequestById(req.id);
      setDetailData(data);
    } catch {
      setDetailData(req);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async (req: LectureRequest) => {
    setActionLoading(req.id);
    try {
      await lectureRequestApi.approveRequest(req.id);
      addToast(`Request #${req.id} approved`, 'success');
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'approved' } : r));
      setCounts(prev => ({ ...prev, pending: prev.pending - 1, approved: prev.approved + 1 }));
      if (selectedRequest?.id === req.id) {
        setSelectedRequest({ ...selectedRequest, status: 'approved' });
        setDetailData(prev => prev ? { ...prev, status: 'approved' } : prev);
      }
      onRequestUpdated?.();
    } catch (err: any) {
      addToast(err?.response?.data?.message || 'Failed to approve request', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingRequest) return;
    setActionLoading(rejectingRequest.id);
    try {
      await lectureRequestApi.rejectRequest(rejectingRequest.id, rejectReason.trim() || undefined);
      addToast(`Request #${rejectingRequest.id} rejected`, 'info');
      setRequests(prev => prev.map(r => r.id === rejectingRequest.id ? { ...r, status: 'rejected', decision_note: rejectReason.trim() || null } : r));
      setCounts(prev => ({ ...prev, pending: prev.pending - 1, rejected: prev.rejected + 1 }));
      if (selectedRequest?.id === rejectingRequest.id) {
        setSelectedRequest({ ...selectedRequest, status: 'rejected' });
        setDetailData(prev => prev ? { ...prev, status: 'rejected', decision_note: rejectReason.trim() || null } : prev);
      }
      setRejectingRequest(null);
      setRejectReason('');
      onRequestUpdated?.();
    } catch (err: any) {
      addToast(err?.response?.data?.message || 'Failed to reject request', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApply = async (req: LectureRequest) => {
    setActionLoading(req.id);
    try {
      await lectureRequestApi.applyRequest(req.id);
      addToast(`Request #${req.id} applied to timetable`, 'success');
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'applied' } : r));
      setCounts(prev => ({ ...prev, approved: prev.approved - 1, applied: prev.applied + 1 }));
      if (selectedRequest?.id === req.id) {
        setSelectedRequest({ ...selectedRequest, status: 'applied' });
        setDetailData(prev => prev ? { ...prev, status: 'applied' } : prev);
      }
      onRequestUpdated?.();
    } catch (err: any) {
      addToast(err?.response?.data?.message || 'Failed to apply request to timetable', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const buildPreviousValue = (r: LectureRequest) => {
    if (r.request_type === 'NEW_LECTURE') return '—';
    const parts: string[] = [];
    if (r.request_type === 'RESCHEDULE' || r.request_type === 'CANCEL') {
      parts.push(formatDate(r.current_date));
      if (r.current_start_time) parts.push(`${formatTime(r.current_start_time)} - ${formatTime(r.current_end_time)}`);
    }
    if (r.request_type === 'ROOM_CHANGE') parts.push(r.current_classroom_name || `Room ${r.current_classroom_id}`);
    if (r.request_type === 'TEACHER_CHANGE') parts.push(r.current_teacher_name || `Teacher ${r.current_teacher_user_id}`);
    return parts.join(', ') || '—';
  };

  const buildRequestedValue = (r: LectureRequest) => {
    if (r.request_type === 'CANCEL') return 'Cancel Lecture';
    const parts: string[] = [];
    if (r.request_type === 'RESCHEDULE') {
      parts.push(formatDate(r.requested_date));
      if (r.requested_start_time) parts.push(`${formatTime(r.requested_start_time)} - ${formatTime(r.requested_end_time)}`);
    }
    if (r.request_type === 'ROOM_CHANGE') parts.push(r.requested_classroom_name || `Room ${r.requested_classroom_id}`);
    if (r.request_type === 'TEACHER_CHANGE') parts.push(r.requested_teacher_name || `Teacher ${r.requested_teacher_user_id}`);
    if (r.request_type === 'NEW_LECTURE') {
      parts.push(formatDate(r.requested_date));
      if (r.requested_start_time) parts.push(`${formatTime(r.requested_start_time)} - ${formatTime(r.requested_end_time)}`);
      if (r.requested_classroom_name) parts.push(r.requested_classroom_name);
      if (r.requested_teacher_name) parts.push(r.requested_teacher_name);
    }
    return parts.join(', ') || '—';
  };

  const detail = detailData || selectedRequest;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div>
          <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare size={18} className="text-blue-600" />
            Teacher Schedule Requests
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Review and act on modification requests submitted by faculty members.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={fetchRequests}
          className="flex items-center gap-1.5 text-xs"
        >
          <RefreshCw size={13} /> Refresh
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {([
          { key: 'all', label: 'All', count: counts.total },
          { key: 'pending', label: 'Pending', count: counts.pending },
          { key: 'approved', label: 'Approved', count: counts.approved },
          { key: 'applied', label: 'Applied', count: counts.applied },
          { key: 'rejected', label: 'Rejected', count: counts.rejected },
          { key: 'cancelled', label: 'Cancelled', count: counts.cancelled }
        ] as const).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
              statusFilter === key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>{label}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
              statusFilter === key ? 'bg-blue-700 text-white' :
              key === 'pending' && count > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
            }`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Requests Table */}
      <Table headers={['Teacher / Batch', 'Type', 'Lecture Details', 'Proposed Change', 'Status', 'Actions']}>
        {loading ? (
          <tr>
            <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
              <Loader2 className="mx-auto text-blue-500 mb-3 animate-spin" size={28} />
              <div className="font-semibold text-slate-700">Loading requests...</div>
            </td>
          </tr>
        ) : requests.length > 0 ? (
          requests.map(req => {
            const sd = statusDisplay[req.status] || statusDisplay.pending;
            const isActive = actionLoading === req.id;

            return (
              <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900 text-xs">{req.requester_name || 'Faculty'}</div>
                  <div className="text-[10px] text-blue-600 font-bold mt-0.5">{req.batch_name || req.batch_code || `Batch ${req.batch_id}`}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-[10px] font-mono text-slate-400">#{req.id}</div>
                  <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border mt-0.5 ${typeColors[req.request_type] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                    {typeLabels[req.request_type] || req.request_type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-800 text-xs">{req.subject_name || `Subject ${req.subject_id}`}</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {formatDate(req.current_date || req.requested_date)}
                    {req.current_start_time ? ` ${formatTime(req.current_start_time)}` : ''}
                  </div>
                </td>
                <td className="px-4 py-3 max-w-[200px]">
                  <div className="text-xs font-semibold text-slate-900 flex items-center gap-1">
                    {req.request_type !== 'CANCEL' && <ArrowRight size={11} className="text-blue-500 flex-shrink-0" />}
                    <span>{buildRequestedValue(req)}</span>
                  </div>
                  {req.reason && (
                    <div className="text-[10px] text-slate-450 mt-1 truncate max-w-[180px]" title={req.reason}>
                      {req.reason}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${sd.color}`}>
                    {sd.icon} {sd.label}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleViewDetail(req)}
                      className="px-2 py-1 text-[11px] h-7"
                      disabled={isActive}
                    >
                      <Eye size={12} className="mr-0.5" /> View
                    </Button>
                    {req.status === 'pending' && (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleApprove(req)}
                          className="px-2 py-1 text-[11px] bg-emerald-600 hover:bg-emerald-700 border-emerald-600 h-7"
                          disabled={isActive}
                        >
                          {isActive ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} className="mr-0.5" />} Approve
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => { setRejectingRequest(req); setRejectReason(''); }}
                          className="px-2 py-1 text-[11px] text-rose-600 hover:bg-rose-50 border-rose-200 h-7"
                          disabled={isActive}
                        >
                          <X size={12} className="mr-0.5" /> Reject
                        </Button>
                      </>
                    )}
                    {req.status === 'approved' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleApply(req)}
                        className="px-2 py-1 text-[11px] bg-blue-600 hover:bg-blue-700 border-blue-600 h-7"
                        disabled={isActive}
                      >
                        {isActive ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} className="mr-0.5" />} Apply
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })
        ) : (
          <tr>
            <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
              <MessageSquare className="mx-auto text-slate-300 mb-3" size={32} />
              <div className="font-semibold text-slate-700">No requests found</div>
              <div className="text-xs text-slate-400 mt-1">No teacher schedule requests match the current filter.</div>
            </td>
          </tr>
        )}
      </Table>

      {/* REQUEST DETAIL MODAL */}
      <Modal
        isOpen={!!selectedRequest}
        onClose={() => { setSelectedRequest(null); setDetailData(null); }}
        title={`Request #${selectedRequest?.id || ''}`}
      >
        {detail && (() => {
          const sd = statusDisplay[detail.status] || statusDisplay.pending;
          const hasConflicts = detail.conflicts && detail.conflicts.length > 0;
          const hasDanger = hasConflicts && detail.conflicts!.some(c => c.severity === 'danger');

          return (
            <div className="space-y-5">
              {/* Status Banner */}
              <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded border ${typeColors[detail.request_type] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                    {typeLabels[detail.request_type] || detail.request_type}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">• #{detail.id}</span>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${sd.color}`}>
                  {sd.icon} {sd.label}
                </span>
              </div>

              {/* Loading */}
              {detailLoading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="animate-spin text-blue-500" size={20} />
                  <span className="ml-2 text-xs text-slate-500">Loading details & conflict check...</span>
                </div>
              )}

              {/* Lecture Details Grid */}
              <div className="space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {detail.request_type === 'NEW_LECTURE' ? 'Proposed Lecture Details' : 'Current Lecture Details'}
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Subject & Batch</div>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">{detail.subject_name || `Subject ${detail.subject_id}`}</div>
                    <div className="font-semibold text-blue-700 mt-0.5">{detail.batch_name || detail.batch_code || `Batch ${detail.batch_id}`}</div>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Requested By</div>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">{detail.requester_name || 'Faculty'}</div>
                    <div className="text-slate-500 mt-0.5">{detail.requester_email || ''}</div>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="font-bold text-slate-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
                      <Calendar size={11} className="text-blue-500" /> Date & Time
                    </div>
                    <div className="font-bold text-slate-800 mt-1">
                      {formatDate(detail.current_date || detail.requested_date)}
                    </div>
                    <div className="text-slate-600 font-semibold mt-0.5 flex items-center gap-1">
                      <Clock size={11} className="text-slate-400" />
                      {detail.current_start_time ? `${formatTime(detail.current_start_time)} - ${formatTime(detail.current_end_time)}` : 'Time TBA'}
                    </div>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="font-bold text-slate-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
                      <MapPin size={11} className="text-blue-500" /> Room & Faculty
                    </div>
                    <div className="font-bold text-slate-800 mt-1">{detail.current_classroom_name || `Room ${detail.current_classroom_id}`}</div>
                    <div className="text-slate-500 font-medium mt-0.5">{detail.current_teacher_name || `Faculty ${detail.current_teacher_user_id}`}</div>
                  </div>
                </div>
              </div>

              {/* Modification Summary */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Modification Summary</div>
                <div className="flex items-start gap-2">
                  <span className="text-slate-400 font-medium min-w-[80px]">Current:</span>
                  <span className="text-slate-600 line-through decoration-slate-400 font-medium">{buildPreviousValue(detail)}</span>
                </div>
                <div className="flex items-start gap-2 pt-1 border-t border-slate-200/60">
                  <span className="text-blue-600 font-bold min-w-[80px]">Requested:</span>
                  <span className="text-slate-900 font-bold flex items-center gap-1.5">
                    <ArrowRight size={13} className="text-blue-500" />
                    {buildRequestedValue(detail)}
                  </span>
                </div>
              </div>

              {/* Conflicts View */}
              {hasConflicts && (
                <div className={`p-4 rounded-xl border space-y-2 ${hasDanger ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className={`font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 ${hasDanger ? 'text-red-700' : 'text-amber-700'}`}>
                    <AlertTriangle size={14} />
                    Conflict Alert ({detail.conflicts!.length})
                  </div>
                  {detail.conflicts!.map((c, i) => (
                    <div key={i} className={`text-xs pl-5 py-1 ${c.severity === 'danger' ? 'text-red-700' : 'text-amber-700'}`}>
                      • {c.message}
                    </div>
                  ))}
                </div>
              )}

              {/* Reason */}
              {detail.reason && (
                <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 text-xs text-slate-700 space-y-1">
                  <div className="font-bold text-blue-900 flex items-center gap-1.5">
                    <MessageSquare size={14} className="text-blue-600" />
                    Teacher Reason
                  </div>
                  <p className="text-slate-700 leading-relaxed pl-5 font-normal">{detail.reason}</p>
                </div>
              )}

              {/* Rejection Note */}
              {detail.status === 'rejected' && detail.decision_note && (
                <div className="p-3.5 bg-rose-50/50 rounded-xl border border-rose-100 text-xs space-y-1">
                  <div className="font-bold text-rose-900 flex items-center gap-1.5">
                    <XCircle size={14} className="text-rose-600" /> Rejection Note
                  </div>
                  <p className="text-rose-700 pl-5">{detail.decision_note}</p>
                </div>
              )}

              {/* Metadata */}
              <div className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-slate-100">
                <span>Submitted: {detail.created_at ? new Date(detail.created_at).toLocaleString() : ''}</span>
                <span>Branch: {detail.branch_name || `Branch ${detail.branch_id}`}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                {detail.status === 'pending' && (
                  <>
                    <Button
                      variant="primary"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 border-emerald-600 flex items-center justify-center gap-2"
                      onClick={() => { setSelectedRequest(null); setDetailData(null); handleApprove(detail); }}
                      disabled={actionLoading === detail.id}
                    >
                      <Check size={15} /> Approve
                    </Button>
                    <Button
                      variant="secondary"
                      className="flex-1 text-rose-600 hover:bg-rose-50 border-rose-200 flex items-center justify-center gap-2"
                      onClick={() => { setRejectingRequest(detail); setRejectReason(''); }}
                    >
                      <X size={15} /> Reject
                    </Button>
                  </>
                )}
                {detail.status === 'approved' && (
                  <Button
                    variant="primary"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 border-blue-600 flex items-center justify-center gap-2"
                    onClick={() => { setSelectedRequest(null); setDetailData(null); handleApply(detail); }}
                    disabled={actionLoading === detail.id}
                  >
                    <Send size={15} /> Apply to Timetable
                  </Button>
                )}
                <Button variant="secondary" className="flex-1" onClick={() => { setSelectedRequest(null); setDetailData(null); }}>
                  Close
                </Button>
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
              Are you sure you want to reject request <strong className="text-slate-900">#{rejectingRequest.id}</strong> submitted by <strong className="text-slate-900">{rejectingRequest.requester_name || 'Faculty'}</strong> for batch <strong className="text-blue-700">{rejectingRequest.batch_name || rejectingRequest.batch_code}</strong>?
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Optional Rejection Reason:
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., Room 201 is already booked during this time slot."
                rows={3}
                className="w-full p-2.5 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              />
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <Button
                variant="primary"
                className="flex-1 bg-rose-600 hover:bg-rose-700 border-rose-600 flex items-center justify-center gap-2"
                onClick={handleReject}
                disabled={actionLoading === rejectingRequest.id}
              >
                {actionLoading === rejectingRequest.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                Confirm Rejection
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setRejectingRequest(null)}
                disabled={actionLoading === rejectingRequest.id}
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
