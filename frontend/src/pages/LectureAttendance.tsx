import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, Save, Lock, Loader2,
  Users, UserCheck, UserX, Search, Download, AlertCircle, RefreshCw, Upload,
  MapPin, History, ShieldAlert
} from 'lucide-react';
import { BulkImportModal } from '../components/ui/BulkImportModal';
import { attendanceApi } from '../services/attendanceApi';
import type { AttendanceRosterRow, AttendanceRecord, AttendanceLecture, AttendanceCorrectionItem } from '../services/attendanceApi';
import { useApp } from '../context/AppContext';
import {
  AttendanceCorrectionModal,
  AttendanceCorrectionHistoryModal,
  type AttendanceChangeDiff
} from '../components/attendance/AttendanceCorrectionModal';

export const LectureAttendance: React.FC = () => {
  const { lectureId } = useParams<{ lectureId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast, currentUser } = useApp();
  const isTeacher = currentUser?.role?.toLowerCase() === 'teacher' || Boolean(currentUser?.roles?.some((r: string) => r.toLowerCase() === 'teacher'));

  const navState = location.state as {
    lecture?: AttendanceLecture;
    date?: string;
    branch?: string;
    batch?: string;
    course?: string;
  } | null;

  useEffect(() => {
    if (isTeacher && lectureId) {
      navigate('/attendance', {
        replace: true,
        state: { lectureId, activeLecture: navState?.lecture }
      });
    }
  }, [isTeacher, lectureId, navigate, navState]);

  // Student Roster States
  const [rosterRows, setRosterRows] = useState<AttendanceRosterRow[]>([]);
  const [rosterMarks, setRosterMarks] = useState<{ [studentId: number]: { status: 0 | 1 | 2; remarks?: string } }>({});
  const [initialRosterMarks, setInitialRosterMarks] = useState<{ [studentId: number]: { status: 0 | 1 | 2; remarks?: string } }>({});
  const [lectureInfo, setLectureInfo] = useState<Partial<AttendanceLecture> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [correctionsHistory, setCorrectionsHistory] = useState<AttendanceCorrectionItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [geoErrorBanner, setGeoErrorBanner] = useState<string | null>(null);
  const [togglingCheckin, setTogglingCheckin] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // 1. Fetch Students Roster for Lecture
  const fetchRoster = async () => {
    if (!lectureId) return;
    try {
      setIsLoading(true);
      const rows = await attendanceApi.getRoster(lectureId);
      setRosterRows(rows);

      // Populate initial marks from backend
      const initialMarks: { [studentId: number]: { status: 0 | 1 | 2; remarks?: string } } = {};
      rows.forEach(r => {
        if (r.attendance_status !== undefined && r.attendance_status !== null) {
          initialMarks[r.student_id] = {
            status: r.attendance_status as 0 | 1 | 2,
            remarks: r.remarks || ''
          };
        }
      });
      setRosterMarks(initialMarks);
      setInitialRosterMarks(initialMarks);

      // Extract lecture metadata from first row or navState
      if (rows.length > 0) {
        const first = rows[0];
        setLectureInfo(prev => ({
          ...prev,
          ...(navState?.lecture || {}),
          id: Number(lectureId),
          branch_id: first.branch_id,
          batch_id: first.batch_id,
          subject_id: first.subject_id,
          lecture_date: first.lecture_date,
          start_time: first.start_time,
          end_time: first.end_time,
          attendance_taken: first.attendance_taken,
          attendance_submitted_at: first.attendance_submitted_at,
          attendance_locked_at: first.attendance_locked_at,
          geofence_status: first.geofence_status,
          geofence_distance_meters: first.geofence_distance_meters,
          branch_name: first.branch_name,
          geofence_enabled: first.geofence_enabled,
          geofence_radius_meters: first.geofence_radius_meters,
          student_checkin_open: first.student_checkin_open,
          student_checkin_code: first.student_checkin_code,
          student_checkin_opened_at: first.student_checkin_opened_at
        }));
      } else if (navState?.lecture) {
        setLectureInfo(navState.lecture);
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to load lecture roster.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster();
  }, [lectureId]);

  // Derived statistics - Students
  const totalStudents = rosterRows.length;
  const markedEntries = Object.values(rosterMarks);
  const markedCount = markedEntries.length;
  const presentCount = markedEntries.filter(m => m.status === 1).length;
  const absentCount = markedEntries.filter(m => m.status === 0).length;
  const lateCount = markedEntries.filter(m => m.status === 2).length;
  const unmarkedCount = Math.max(0, totalStudents - markedCount);
  const attendancePercentage = totalStudents > 0 ? Math.round(((presentCount + lateCount * 0.5) / totalStudents) * 100) : 0;

  const isTaken = lectureInfo?.attendance_taken === 1;
  const isLocked = Boolean(isTaken && lectureInfo?.attendance_locked_at);

  const pendingChanges: AttendanceChangeDiff[] = useMemo(() => {
    if (!isLocked) return [];
    const diffs: AttendanceChangeDiff[] = [];
    for (const row of rosterRows) {
      const prev = initialRosterMarks[row.student_id];
      const curr = rosterMarks[row.student_id];
      if (!curr) continue;
      const oldStatus = prev ? prev.status : null;
      const oldRemarks = (prev?.remarks || '').trim();
      const newRemarks = (curr.remarks || '').trim();
      if (oldStatus !== curr.status || oldRemarks !== newRemarks) {
        diffs.push({
          student_id: row.student_id,
          student_name: row.full_name,
          student_code: row.student_code,
          old_status: oldStatus,
          new_status: curr.status,
          old_remarks: oldRemarks,
          new_remarks: newRemarks
        });
      }
    }
    return diffs;
  }, [isLocked, rosterRows, initialRosterMarks, rosterMarks]);

  const handleOpenHistory = async () => {
    if (!lectureId) return;
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const list = await attendanceApi.getCorrections(lectureId);
      setCorrectionsHistory(list);
    } catch (err: any) {
      addToast(err?.response?.data?.message || 'Failed to load correction history.', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Student status marking handler
  const handleMarkStatus = (studentId: number, status: 0 | 1 | 2) => {
    setRosterMarks(prev => {
      const current = prev[studentId];
      if (current && current.status === status) {
        const copy = { ...prev };
        delete copy[studentId];
        return copy;
      }
      return {
        ...prev,
        [studentId]: {
          status,
          remarks: current?.remarks || ''
        }
      };
    });
  };

  const handleRemarkChange = (studentId: number, remarks: string) => {
    setRosterMarks(prev => {
      const current = prev[studentId] || { status: 1, remarks: '' };
      return {
        ...prev,
        [studentId]: {
          ...current,
          remarks
        }
      };
    });
  };

  // Bulk actions - Students
  const handleMarkAll = (status: 0 | 1 | 2) => {
    const updated: { [studentId: number]: { status: 0 | 1 | 2; remarks?: string } } = {};
    rosterRows.forEach(r => {
      updated[r.student_id] = {
        status,
        remarks: rosterMarks[r.student_id]?.remarks || ''
      };
    });
    setRosterMarks(updated);
  };

  const handleClearAll = () => {
    setRosterMarks({});
  };

  // Submit and lock attendance (with geolocation capture & Haversine verification)
  const handleSubmitAndLock = async () => {
    if (!lectureId) return;
    if (isLocked) {
      if (pendingChanges.length === 0) {
        addToast('Modify at least one student status or remark before submitting a correction.', 'info');
        return;
      }
      setIsCorrectionModalOpen(true);
      return;
    }

    const records: AttendanceRecord[] = Object.entries(rosterMarks).map(([sId, data]) => ({
      student_id: Number(sId),
      status: data.status,
      remarks: data.remarks
    }));

    if (records.length === 0) {
      addToast('Please mark attendance for at least one student before submitting.', 'error');
      return;
    }

    setGeoErrorBanner(null);
    setIsSaving(true);
    try {
      const res = await attendanceApi.submitAttendance(lectureId, records);
      const geo = res?.data?.geofence;
      setLectureInfo(prev => prev ? ({
        ...prev,
        attendance_taken: 1,
        attendance_locked_at: new Date().toISOString(),
        status: 'completed',
        geofence_status: geo?.status || prev.geofence_status,
        geofence_distance_meters: geo?.distanceMeters ?? prev.geofence_distance_meters
      }) : null);
      addToast(
        geo?.status === 'INSIDE' && geo?.distanceMeters !== null
          ? `Attendance verified (${Math.round(geo.distanceMeters)}m from branch) and locked!`
          : 'Attendance submitted and locked into database successfully!',
        'success'
      );
      fetchRoster();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to submit attendance.';
      setGeoErrorBanner(msg);
      addToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmCorrection = async (reason: string) => {
    if (!lectureId || pendingChanges.length === 0) return;
    setIsSaving(true);
    try {
      const records: AttendanceRecord[] = pendingChanges.map(c => ({
        student_id: c.student_id,
        status: c.new_status,
        remarks: c.new_remarks
      }));
      await attendanceApi.correctAttendance(lectureId, records, reason);
      addToast(`Corrected ${records.length} record(s) and logged to Audit Trail.`, 'success');
      setIsCorrectionModalOpen(false);
      await fetchRoster();
    } catch (err: any) {
      addToast(err?.response?.data?.message || 'Failed to save attendance correction.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStudentCheckin = async (open: boolean) => {
    if (!lectureId) return;
    setTogglingCheckin(true);
    try {
      const res = await attendanceApi.toggleStudentCheckin(lectureId, open);
      setLectureInfo(prev => prev ? ({
        ...prev,
        student_checkin_open: res.student_checkin_open,
        student_checkin_code: res.student_checkin_code,
        student_checkin_opened_at: res.opened_at
      }) : null);
      addToast(
        res.student_checkin_open
          ? `Student self check-in opened! Class PIN: ${res.student_checkin_code}`
          : 'Student self check-in closed.',
        'success'
      );
    } catch (err: any) {
      addToast(err?.response?.data?.message || 'Failed to update student check-in session.', 'error');
    } finally {
      setTogglingCheckin(false);
    }
  };

  // Filtered roster rows - Students
  const filteredRoster = useMemo(() => {
    return rosterRows.filter(r => {
      const matchSearch =
        r.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.student_code?.toLowerCase().includes(search.toLowerCase()) ||
        (r.mobile && r.mobile.includes(search));

      const mark = rosterMarks[r.student_id];
      let matchStatus = true;
      if (filterStatus === 'present') matchStatus = mark?.status === 1;
      else if (filterStatus === 'absent') matchStatus = mark?.status === 0;
      else if (filterStatus === 'late') matchStatus = mark?.status === 2;
      else if (filterStatus === 'unmarked') matchStatus = mark === undefined;

      return matchSearch && matchStatus;
    });
  }, [rosterRows, search, filterStatus, rosterMarks]);

  // Export CSV
  const handleExportCSV = () => {
    if (rosterRows.length === 0) return;
    const headers = ['Student Name', 'Student Code', 'Mobile', 'Attendance Status', 'Remarks'];
    const rows = rosterRows.map(r => {
      const mark = rosterMarks[r.student_id];
      const statusText = mark?.status === 1 ? 'Present' : mark?.status === 0 ? 'Absent' : mark?.status === 2 ? 'Late' : 'Unmarked';
      return [r.full_name || '', r.student_code || '', r.mobile || '', statusText, mark?.remarks || ''];
    });

    const csvContent = 'data:text/csv;charset=utf-8,'
      + [headers.join(','), ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `lecture_student_attendance_${lectureId}_${lectureInfo?.lecture_date || 'roster'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center flex flex-col items-center justify-center space-y-3">
        <Loader2 size={40} className="text-indigo-600 animate-spin" />
        <h3 className="text-base font-bold text-slate-800">Loading Lecture Attendance Register...</h3>
        <p className="text-xs text-slate-500">Fetching student enrollment and attendance logs</p>
      </div>
    );
  }

  // Format Time
  const start = lectureInfo?.start_time?.slice(0, 5) || '--:--';
  const end = lectureInfo?.end_time?.slice(0, 5) || '--:--';
  const [sh, sm] = start.split(':').map(Number);
  const displayStart = !isNaN(sh) ? `${((sh + 11) % 12) + 1}:${String(sm).padStart(2, '0')} ${sh >= 12 ? 'PM' : 'AM'}` : start;
  const [eh, em] = end.split(':').map(Number);
  const displayEnd = !isNaN(eh) ? `${((eh + 11) % 12) + 1}:${String(em).padStart(2, '0')} ${eh >= 12 ? 'PM' : 'AM'}` : end;

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Attendance', href: '/attendance' },
          { label: `Lecture: ${lectureInfo?.subject_name || navState?.lecture?.subject_name || 'Roster'}` }
        ]}
      />

      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/attendance', { state: navState })}
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer text-slate-700 shrink-0 mt-1"
            title="Back to Attendance Registers"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {lectureInfo?.subject_name || navState?.lecture?.subject_name || 'Lecture Attendance'}
              </h1>
              {isTaken ? (
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs">
                  <CheckCircle2 size={14} className="text-emerald-600" /> TAKEN / LOCKED
                </span>
              ) : (
                <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs">
                  <Clock size={14} className="text-amber-600" /> NOT TAKEN (PENDING)
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs font-medium text-slate-500 mt-2">
              <span><strong>Batch:</strong> {lectureInfo?.batch_name || navState?.lecture?.batch_name || 'Batch'}</span>
              <span>•</span>
              <span><strong>Date:</strong> {lectureInfo?.lecture_date || navState?.date || 'Today'}</span>
              <span>•</span>
              <span><strong>Time:</strong> {displayStart} – {displayEnd}</span>
              {lectureInfo?.teacher_name && (
                <>
                  <span>•</span>
                  <span><strong>Faculty:</strong> {lectureInfo.teacher_name}</span>
                </>
              )}
              {lectureInfo?.classroom_name && (
                <>
                  <span>•</span>
                  <span><strong>Room:</strong> {lectureInfo.classroom_name}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto justify-end">
          {isLocked && (
            <Button
              variant="secondary"
              onClick={handleOpenHistory}
              className="flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              <History size={14} /> Correction History
            </Button>
          )}
          {!isLocked && (
            <Button
              variant="secondary"
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              <Upload size={14} /> Bulk Import
            </Button>
          )}
          <Button variant="secondary" onClick={handleExportCSV} className="flex items-center gap-1.5 text-xs font-bold">
            <Download size={14} /> Export CSV
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmitAndLock}
            disabled={isSaving || (isLocked ? pendingChanges.length === 0 : markedCount === 0)}
            className="flex items-center gap-1.5 text-xs font-bold shadow-sm"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : (isLocked ? <ShieldAlert size={14} /> : <Lock size={14} />)}
            {isLocked
              ? `Submit Correction${pendingChanges.length > 0 ? ` (${pendingChanges.length})` : ''}`
              : 'Submit & Lock Attendance'}
          </Button>
        </div>
      </div>

      {geoErrorBanner && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5">
          <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Geo-Fence Verification Blocked Submission</p>
            <p className="mt-0.5 text-rose-700">{geoErrorBanner}</p>
          </div>
          <button type="button" onClick={() => setGeoErrorBanner(null)} className="text-rose-500 hover:text-rose-700 font-bold">
            Dismiss
          </button>
        </div>
      )}

      {!isLocked && (
        <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs text-indigo-950">
            <MapPin size={16} className="text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                Student Geo-Fenced Self Check-In
                {Number(lectureInfo?.student_checkin_open) === 1 && lectureInfo?.student_checkin_code && (
                  <span className="ml-2 px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-mono text-xs tracking-widest">
                    PIN: {lectureInfo.student_checkin_code}
                  </span>
                )}
              </p>
              <p className="text-indigo-800/80 mt-0.5">
                {Number(lectureInfo?.student_checkin_open) === 1
                  ? 'Share this PIN with students in the classroom so they can verify their GPS location and mark themselves present.'
                  : 'Open a check-in window to generate a 4-digit Class PIN for students to check in with their device location.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {Number(lectureInfo?.student_checkin_open) === 1 ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={fetchRoster}
                  className="text-xs font-bold flex items-center gap-1.5"
                >
                  <RefreshCw size={13} /> Refresh Roster
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleToggleStudentCheckin(false)}
                  disabled={togglingCheckin}
                  className="text-xs font-bold text-rose-700 border-rose-200 hover:bg-rose-50"
                >
                  Close Check-In
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleToggleStudentCheckin(true)}
                disabled={togglingCheckin}
                className="text-xs font-bold text-indigo-700 border-indigo-200 hover:bg-indigo-100"
              >
                {togglingCheckin ? 'Opening...' : 'Open Student Check-In'}
              </Button>
            )}
          </div>
        </div>
      )}

      {isLocked && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Lock size={15} className="text-amber-600 shrink-0" />
            <span>
              <strong>Attendance Locked:</strong> Any status or remark changes will require a mandatory correction reason and will be logged in the Audit Trail.
            </span>
          </div>
          {pendingChanges.length > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold shrink-0">
              {pendingChanges.length} pending edit{pendingChanges.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
      )}

      {/* Summary KPI Cards - Students */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-2xs">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase">
            <Users size={14} className="text-slate-400" /> Total Students
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{totalStudents}</div>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-2xs">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase">
            <RefreshCw size={14} className="text-blue-500" /> Marked / Total
          </div>
          <div className="text-2xl font-extrabold text-blue-600 mt-1">
            {markedCount} <span className="text-xs text-slate-400 font-bold">/ {totalStudents}</span>
          </div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200/80 p-3.5 rounded-xl shadow-2xs">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 uppercase">
            <UserCheck size={14} className="text-emerald-600" /> Present
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">{presentCount}</div>
        </div>

        <div className="bg-red-50/70 border border-red-200/80 p-3.5 rounded-xl shadow-2xs">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-red-800 uppercase">
            <UserX size={14} className="text-red-600" /> Absent
          </div>
          <div className="text-2xl font-extrabold text-red-700 mt-1">{absentCount}</div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200/80 p-3.5 rounded-xl shadow-2xs">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 uppercase">
            <Clock size={14} className="text-amber-600" /> Late
          </div>
          <div className="text-2xl font-extrabold text-amber-700 mt-1">{lateCount}</div>
        </div>

        <div className="bg-indigo-50/70 border border-indigo-200/80 p-3.5 rounded-xl shadow-2xs">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-800 uppercase">
            <CheckCircle2 size={14} className="text-indigo-600" /> Attendance Rate
          </div>
          <div className="text-2xl font-extrabold text-indigo-700 mt-1">{attendancePercentage}%</div>
        </div>
      </div>

      {/* Student Roster Card */}
      <Card className="shadow-sm border border-slate-200 overflow-hidden">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 w-full">
            <div>
              <CardTitle>Enrolled Students Roster ({filteredRoster.length})</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5 font-normal">
                Mark attendance parameters for each enrolled student in this lecture session.
              </p>
            </div>

            {/* Quick Bulk Marking Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 mr-1">Quick Mark:</span>
              <button
                type="button"
                onClick={() => handleMarkAll(1)}
                className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
              >
                All Present
              </button>
              <button
                type="button"
                onClick={() => handleMarkAll(0)}
                className="px-2.5 py-1 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
              >
                All Absent
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-2.5 py-1 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Clear Marks
              </button>
            </div>
          </div>
        </CardHeader>

        {/* Filter / Search Bar */}
        <div className="p-4 bg-slate-50/70 border-b border-slate-200/80 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search student name, code, or mobile..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 bg-white shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter:</span>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-white outline-none focus:border-indigo-500 shadow-2xs"
            >
              <option value="all">All Students ({rosterRows.length})</option>
              <option value="present">Present Only ({presentCount})</option>
              <option value="absent">Absent Only ({absentCount})</option>
              <option value="late">Late Only ({lateCount})</option>
              <option value="unmarked">Unmarked Only ({unmarkedCount})</option>
            </select>
          </div>
        </div>

        {/* Student Table */}
        {filteredRoster.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center">
            <div className="bg-slate-100 p-3.5 rounded-full mb-2.5">
              <Users size={32} className="text-slate-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No students found</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-0.5">
              {rosterRows.length === 0
                ? 'No students are currently enrolled in this batch.'
                : 'No students matched the active search and filter conditions.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <th className="px-4 py-3.5 w-12 text-center">#</th>
                  <th className="px-4 py-3.5 min-w-[220px]">Student Name &amp; Code</th>
                  <th className="px-4 py-3.5 min-w-[140px]">Mobile Contact</th>
                  <th className="px-4 py-3.5 min-w-[260px] text-center">Attendance Status</th>
                  <th className="px-4 py-3.5 min-w-[220px]">Remarks / Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRoster.map((student, idx) => {
                  const mark = rosterMarks[student.student_id];
                  const currentStatus = mark?.status;

                  return (
                    <tr
                      key={student.student_id}
                      className={`hover:bg-slate-50/80 transition-colors ${currentStatus === 0
                          ? 'bg-red-50/20'
                          : currentStatus === 1
                            ? 'bg-emerald-50/20'
                            : currentStatus === 2
                              ? 'bg-amber-50/20'
                              : ''
                        }`}
                    >
                      <td className="px-4 py-3.5 text-xs font-bold text-slate-400 text-center">
                        {idx + 1}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900 text-sm">{student.full_name}</div>
                        <div className="font-mono text-xs font-semibold text-indigo-600 uppercase mt-0.5">
                          {student.student_code}
                        </div>
                        {student.student_checkin_at && (
                          <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <MapPin size={10} />
                            Self Check-In
                            {student.student_checkin_geofence_status === 'INSIDE' && student.student_checkin_distance_meters != null
                              ? ` • ${Math.round(Number(student.student_checkin_distance_meters))}m`
                              : ''}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-xs font-medium text-slate-600 whitespace-nowrap">
                        {student.mobile ? (
                          <span className="font-mono">{student.mobile}</span>
                        ) : (
                          <span className="text-slate-400 italic">N/A</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleMarkStatus(student.student_id, 1)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow-2xs ${currentStatus === 1
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                              }`}
                          >
                            <CheckCircle2 size={14} /> Present
                          </button>

                          <button
                            type="button"
                            onClick={() => handleMarkStatus(student.student_id, 0)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow-2xs ${currentStatus === 0
                                ? 'bg-red-600 text-white border-red-600 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200'
                              }`}
                          >
                            <XCircle size={14} /> Absent
                          </button>

                          <button
                            type="button"
                            onClick={() => handleMarkStatus(student.student_id, 2)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow-2xs ${currentStatus === 2
                                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200'
                              }`}
                          >
                            <Clock size={14} /> Late
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <input
                          type="text"
                          placeholder="Optional remarks (e.g. sick leave, informed)..."
                          value={mark?.remarks || ''}
                          onChange={e => handleRemarkChange(student.student_id, e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-indigo-500 bg-white placeholder:text-slate-300 shadow-2xs"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Bottom Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-xs font-medium text-slate-500">
            Marked: <strong className="text-slate-800 font-bold">{markedCount} of {totalStudents} students</strong>
            {unmarkedCount > 0 && (
              <span className="text-amber-600 ml-1.5 font-semibold">({unmarkedCount} unmarked)</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              onClick={handleSubmitAndLock}
              disabled={isSaving || (isLocked ? pendingChanges.length === 0 : markedCount === 0)}
              className="text-xs font-bold shadow-sm"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin mr-1" /> : (isLocked ? <ShieldAlert size={14} className="mr-1" /> : <Lock size={14} className="mr-1" />)}
              {isLocked
                ? `Review & Submit Correction${pendingChanges.length > 0 ? ` (${pendingChanges.length})` : ''}`
                : 'Submit & Lock Attendance'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Bulk Import Attendance Modal (UI Only) */}
      <BulkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Bulk Import Attendance Marks (UI Only)"
        description="Upload CSV spreadsheet to preview student attendance marks for this lecture session (demonstration mode)."
        sampleHeaders={['Student Code', 'Student Name', 'Status (Present/Absent/Late)', 'Remarks']}
        sampleRows={[
          ['STU-001', 'Aarav Sharma', 'Present', 'On time'],
          ['STU-002', 'Divya Rao', 'Absent', 'Medical leave'],
          ['STU-003', 'Karan Patel', 'Late', '10m delay']
        ]}
        onImport={(importedRows) => {
          const updatedMarks = { ...rosterMarks };
          let matchCount = 0;
          importedRows.forEach(row => {
            const code = (row['Student Code'] || row['student_code'] || '').trim().toLowerCase();
            const name = (row['Student Name'] || row['student_name'] || '').trim().toLowerCase();
            const statusStr = (row['Status (Present/Absent/Late)'] || row['Status'] || row['status'] || '').trim().toLowerCase();
            const remarks = row['Remarks'] || row['remarks'] || '';

            const matchedStudent = rosterRows.find(r =>
              (code && r.student_code?.toLowerCase() === code) ||
              (name && r.full_name?.toLowerCase() === name)
            );

            if (matchedStudent) {
              let parsedStatus: 0 | 1 | 2 = 1;
              if (statusStr.includes('absent') || statusStr === '0' || statusStr === 'a') parsedStatus = 0;
              else if (statusStr.includes('late') || statusStr === '2' || statusStr === 'l') parsedStatus = 2;
              else parsedStatus = 1;

              updatedMarks[matchedStudent.student_id] = {
                status: parsedStatus,
                remarks
              };
              matchCount++;
            }
          });

          setRosterMarks(updatedMarks);
          addToast(`Imported attendance marks for ${matchCount} students into preview (UI Only). Click Submit & Lock to save.`, 'success');
        }}
      />

      <AttendanceCorrectionModal
        isOpen={isCorrectionModalOpen}
        onClose={() => setIsCorrectionModalOpen(false)}
        changes={pendingChanges}
        isSubmitting={isSaving}
        onConfirm={handleConfirmCorrection}
      />

      <AttendanceCorrectionHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        corrections={correctionsHistory}
        isLoading={loadingHistory}
      />
    </div>
  );
};
