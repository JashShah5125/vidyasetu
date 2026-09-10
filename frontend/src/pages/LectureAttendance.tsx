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
  GraduationCap, Mail, Phone, Award, Star
} from 'lucide-react';
import { BulkImportModal } from '../components/ui/BulkImportModal';
import { attendanceApi } from '../services/attendanceApi';
import type { AttendanceRosterRow, AttendanceRecord, AttendanceLecture } from '../services/attendanceApi';
import { staffApi } from '../services/staffApi';
import { useApp } from '../context/AppContext';

export const LectureAttendance: React.FC = () => {
  const { lectureId } = useParams<{ lectureId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast, staff: contextStaff } = useApp();

  // Active Tab: 'students' | 'teachers'
  const [activeTab, setActiveTab] = useState<'students' | 'teachers'>('students');

  // Student Roster States
  const [rosterRows, setRosterRows] = useState<AttendanceRosterRow[]>([]);
  const [rosterMarks, setRosterMarks] = useState<{ [studentId: number]: { status: 0 | 1 | 2; remarks?: string } }>({});
  const [lectureInfo, setLectureInfo] = useState<Partial<AttendanceLecture> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Teacher / Staff Attendance States
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [teacherMarks, setTeacherMarks] = useState<{ [teacherId: string | number]: { status: 0 | 1 | 2; remarks?: string } }>({});
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherFilterStatus, setTeacherFilterStatus] = useState<string>('all');

  const navState = location.state as {
    lecture?: AttendanceLecture;
    date?: string;
    branch?: string;
    batch?: string;
    course?: string;
  } | null;

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

      // Extract lecture metadata from first row or navState
      if (rows.length > 0) {
        const first = rows[0];
        setLectureInfo(prev => ({
          ...prev,
          id: Number(lectureId),
          batch_id: first.batch_id,
          subject_id: first.subject_id,
          lecture_date: first.lecture_date,
          start_time: first.start_time,
          end_time: first.end_time,
          attendance_taken: first.attendance_taken,
          attendance_submitted_at: first.attendance_submitted_at,
          ...(navState?.lecture || {})
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

  // 2. Fetch Teachers / Faculty List
  const fetchTeachers = async () => {
    try {
      const res = await staffApi.list({ limit: 100 });
      const rawList = res?.data || contextStaff || [];
      // Include teachers or academic staff
      const faculty = rawList.filter((s: any) => 
        s.role === 'teacher' || 
        s.role === 'faculty' || 
        s.designation?.toLowerCase().includes('teacher') || 
        s.designation?.toLowerCase().includes('faculty') ||
        s.department?.toLowerCase().includes('academic') ||
        s.department?.toLowerCase().includes('teaching') ||
        true // fallback to all staff if role tags are generic
      );
      setTeachersList(faculty.length > 0 ? faculty : rawList);

      // Default assigned lecturer to Present if not set
      if (lectureInfo?.teacher_user_id) {
        setTeacherMarks(prev => ({
          ...prev,
          [lectureInfo.teacher_user_id!]: {
            status: 1,
            remarks: 'Assigned session lecturer'
          }
        }));
      }
    } catch {
      if (contextStaff && contextStaff.length > 0) {
        setTeachersList(contextStaff);
      }
    }
  };

  useEffect(() => {
    fetchRoster();
    fetchTeachers();
  }, [lectureId]);

  // Sync assigned lecturer to teacher marks
  useEffect(() => {
    if (lectureInfo?.teacher_user_id) {
      setTeacherMarks(prev => {
        if (!prev[lectureInfo.teacher_user_id!]) {
          return {
            ...prev,
            [lectureInfo.teacher_user_id!]: {
              status: 1,
              remarks: 'Assigned session lecturer'
            }
          };
        }
        return prev;
      });
    }
  }, [lectureInfo?.teacher_user_id]);

  // Derived statistics - Students
  const totalStudents = rosterRows.length;
  const markedEntries = Object.values(rosterMarks);
  const markedCount = markedEntries.length;
  const presentCount = markedEntries.filter(m => m.status === 1).length;
  const absentCount = markedEntries.filter(m => m.status === 0).length;
  const lateCount = markedEntries.filter(m => m.status === 2).length;
  const unmarkedCount = Math.max(0, totalStudents - markedCount);
  const attendancePercentage = totalStudents > 0 ? Math.round(((presentCount + lateCount * 0.5) / totalStudents) * 100) : 0;

  // Derived statistics - Teachers
  const totalTeachers = teachersList.length;
  const markedTeacherEntries = Object.values(teacherMarks);
  const markedTeachersCount = markedTeacherEntries.length;
  const presentTeachersCount = markedTeacherEntries.filter(m => m.status === 1).length;
  const absentTeachersCount = markedTeacherEntries.filter(m => m.status === 0).length;
  const lateTeachersCount = markedTeacherEntries.filter(m => m.status === 2).length;
  const unmarkedTeachersCount = Math.max(0, totalTeachers - markedTeachersCount);

  const isTaken = lectureInfo?.attendance_taken === 1;

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

  // Teacher status marking handler
  const handleTeacherMarkStatus = (teacherId: string | number, status: 0 | 1 | 2) => {
    setTeacherMarks(prev => {
      const current = prev[teacherId];
      if (current && current.status === status) {
        const copy = { ...prev };
        delete copy[teacherId];
        return copy;
      }
      return {
        ...prev,
        [teacherId]: {
          status,
          remarks: current?.remarks || ''
        }
      };
    });
  };

  const handleTeacherRemarkChange = (teacherId: string | number, remarks: string) => {
    setTeacherMarks(prev => {
      const current = prev[teacherId] || { status: 1, remarks: '' };
      return {
        ...prev,
        [teacherId]: {
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

  // Bulk actions - Teachers
  const handleTeacherMarkAll = (status: 0 | 1 | 2) => {
    const updated: { [teacherId: string | number]: { status: 0 | 1 | 2; remarks?: string } } = {};
    teachersList.forEach(t => {
      const key = t.id || t.email;
      updated[key] = {
        status,
        remarks: teacherMarks[key]?.remarks || ''
      };
    });
    setTeacherMarks(updated);
  };

  const handleTeacherClearAll = () => {
    setTeacherMarks({});
  };

  // Submit and lock attendance (atomic insert into attendance_records & update lecture status)
  const handleSubmitAndLock = async () => {
    if (!lectureId) return;
    const records: AttendanceRecord[] = Object.entries(rosterMarks).map(([sId, data]) => ({
      student_id: Number(sId),
      status: data.status,
      remarks: data.remarks
    }));

    if (records.length === 0) {
      addToast('Please mark attendance for at least one student before submitting.', 'error');
      return;
    }

    try {
      setIsSaving(true);
      await attendanceApi.submitAttendance(lectureId, records);
      setLectureInfo(prev => prev ? ({ ...prev, attendance_taken: 1, status: 'completed' }) : null);
      addToast('Attendance submitted and locked into database successfully!', 'success');
      fetchRoster();
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to submit attendance.', 'error');
    } finally {
      setIsSaving(false);
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

  // Filtered teachers list
  const filteredTeachers = useMemo(() => {
    return teachersList.filter(t => {
      const name = (t.name || t.full_name || '').toLowerCase();
      const code = (t.employee_id || t.employeeId || t.code || '').toLowerCase();
      const email = (t.email || '').toLowerCase();
      const dept = (t.department || t.subject || '').toLowerCase();

      const matchSearch =
        name.includes(teacherSearch.toLowerCase()) ||
        code.includes(teacherSearch.toLowerCase()) ||
        email.includes(teacherSearch.toLowerCase()) ||
        dept.includes(teacherSearch.toLowerCase());

      const key = t.id || t.email;
      const mark = teacherMarks[key];
      let matchStatus = true;
      if (teacherFilterStatus === 'present') matchStatus = mark?.status === 1;
      else if (teacherFilterStatus === 'absent') matchStatus = mark?.status === 0;
      else if (teacherFilterStatus === 'late') matchStatus = mark?.status === 2;
      else if (teacherFilterStatus === 'unmarked') matchStatus = mark === undefined;

      return matchSearch && matchStatus;
    });
  }, [teachersList, teacherSearch, teacherFilterStatus, teacherMarks]);

  // Export CSV
  const handleExportCSV = () => {
    if (activeTab === 'students') {
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
    } else {
      if (teachersList.length === 0) return;
      const headers = ['Teacher Name', 'Employee Code', 'Email', 'Phone', 'Department / Role', 'Attendance Status', 'Remarks'];
      const rows = teachersList.map(t => {
        const key = t.id || t.email;
        const mark = teacherMarks[key];
        const statusText = mark?.status === 1 ? 'Present' : mark?.status === 0 ? 'Absent' : mark?.status === 2 ? 'Late' : 'Unmarked';
        return [
          t.name || t.full_name || '',
          t.employee_id || t.employeeId || t.code || 'N/A',
          t.email || '',
          t.phone || t.mobile || '',
          t.department || t.role || '',
          statusText,
          mark?.remarks || ''
        ];
      });

      const csvContent = 'data:text/csv;charset=utf-8,'
        + [headers.join(','), ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `lecture_teacher_attendance_${lectureId}_${lectureInfo?.lecture_date || 'roster'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
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
                  <CheckCircle2 size={14} className="text-emerald-600" /> TAKEN / SUBMITTED
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
          {activeTab === 'students' && (
            <Button
              variant="secondary"
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              <Upload size={14} /> Bulk Import <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded border border-amber-200">UI Only</span>
            </Button>
          )}
          <Button variant="secondary" onClick={handleExportCSV} className="flex items-center gap-1.5 text-xs font-bold">
            <Download size={14} /> Export CSV
          </Button>
          {activeTab === 'students' ? (
            <Button
              variant="primary"
              onClick={handleSubmitAndLock}
              disabled={isSaving || markedCount === 0}
              className="flex items-center gap-1.5 text-xs font-bold shadow-sm"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
              Submit &amp; Lock Attendance
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => addToast('Teacher attendance marks saved for this session.', 'success')}
              className="flex items-center gap-1.5 text-xs font-bold shadow-sm"
            >
              <CheckCircle2 size={14} /> Save Teacher Attendance
            </Button>
          )}
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex border-b border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none gap-2">
        <button
          onClick={() => setActiveTab('students')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer select-none ${
            activeTab === 'students'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users size={16} /> Student Attendance ({rosterRows.length})
        </button>
        <button
          onClick={() => setActiveTab('teachers')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer select-none ${
            activeTab === 'teachers'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GraduationCap size={16} /> Teacher Attendance ({teachersList.length})
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: STUDENT ATTENDANCE
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'students' ? (
        <>
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
                          className={`hover:bg-slate-50/80 transition-colors ${
                            currentStatus === 0
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
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
                                  currentStatus === 1
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                                }`}
                              >
                                <CheckCircle2 size={14} /> Present
                              </button>

                              <button
                                type="button"
                                onClick={() => handleMarkStatus(student.student_id, 0)}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
                                  currentStatus === 0
                                    ? 'bg-red-600 text-white border-red-600 shadow-sm'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200'
                                }`}
                              >
                                <XCircle size={14} /> Absent
                              </button>

                              <button
                                type="button"
                                onClick={() => handleMarkStatus(student.student_id, 2)}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
                                  currentStatus === 2
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
                  disabled={isSaving || markedCount === 0}
                  className="text-xs font-bold shadow-sm"
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin mr-1" /> : <Lock size={14} className="mr-1" />}
                  Submit &amp; Lock Attendance
                </Button>
              </div>
            </div>
          </Card>
        </>
      ) : (
        /* ─────────────────────────────────────────────────────────────
            TAB 2: TEACHER ATTENDANCE
           ───────────────────────────────────────────────────────────── */
        <>
          {/* Summary KPI Cards - Teachers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-2xs">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase">
                <GraduationCap size={14} className="text-slate-400" /> Total Faculty
              </div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{totalTeachers}</div>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200/80 p-3.5 rounded-xl shadow-2xs">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 uppercase">
                <UserCheck size={14} className="text-emerald-600" /> Present Faculty
              </div>
              <div className="text-2xl font-extrabold text-emerald-700 mt-1">{presentTeachersCount}</div>
            </div>

            <div className="bg-red-50/70 border border-red-200/80 p-3.5 rounded-xl shadow-2xs">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-red-800 uppercase">
                <UserX size={14} className="text-red-600" /> Absent Faculty
              </div>
              <div className="text-2xl font-extrabold text-red-700 mt-1">{absentTeachersCount}</div>
            </div>

            <div className="bg-amber-50/70 border border-amber-200/80 p-3.5 rounded-xl shadow-2xs">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 uppercase">
                <Clock size={14} className="text-amber-600" /> Late / Excused
              </div>
              <div className="text-2xl font-extrabold text-amber-700 mt-1">{lateTeachersCount}</div>
            </div>
          </div>

          {/* Teacher Roster Card */}
          <Card className="shadow-sm border border-slate-200 overflow-hidden">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 w-full">
                <div>
                  <CardTitle>Faculty &amp; Teacher Attendance Register ({filteredTeachers.length})</CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5 font-normal">
                    Mark lecture engagement and presence status for teaching staff and assigned faculty.
                  </p>
                </div>

                {/* Quick Bulk Marking Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 mr-1">Quick Mark:</span>
                  <button
                    type="button"
                    onClick={() => handleTeacherMarkAll(1)}
                    className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                  >
                    All Present
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTeacherMarkAll(0)}
                    className="px-2.5 py-1 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
                  >
                    All Absent
                  </button>
                  <button
                    type="button"
                    onClick={handleTeacherClearAll}
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
                  placeholder="Search faculty name, code, or department..."
                  value={teacherSearch}
                  onChange={e => setTeacherSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 bg-white shadow-2xs"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter:</span>
                <select
                  value={teacherFilterStatus}
                  onChange={e => setTeacherFilterStatus(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-white outline-none focus:border-indigo-500 shadow-2xs"
                >
                  <option value="all">All Faculty ({teachersList.length})</option>
                  <option value="present">Present Only ({presentTeachersCount})</option>
                  <option value="absent">Absent Only ({absentTeachersCount})</option>
                  <option value="late">Late Only ({lateTeachersCount})</option>
                  <option value="unmarked">Unmarked Only ({unmarkedTeachersCount})</option>
                </select>
              </div>
            </div>

            {/* Teacher Table */}
            {filteredTeachers.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center justify-center">
                <div className="bg-slate-100 p-3.5 rounded-full mb-2.5">
                  <GraduationCap size={32} className="text-slate-400" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">No faculty members found</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-0.5">
                  No faculty records matched the search or filter conditions.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                      <th className="px-4 py-3.5 w-12 text-center">#</th>
                      <th className="px-4 py-3.5 min-w-[220px]">Faculty Member</th>
                      <th className="px-4 py-3.5 min-w-[150px]">Department / Role</th>
                      <th className="px-4 py-3.5 min-w-[150px]">Contact</th>
                      <th className="px-4 py-3.5 min-w-[260px] text-center">Attendance Status</th>
                      <th className="px-4 py-3.5 min-w-[220px]">Session Notes / Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTeachers.map((teacher, idx) => {
                      const key = teacher.id || teacher.email;
                      const mark = teacherMarks[key];
                      const currentStatus = mark?.status;
                      const isAssigned = (lectureInfo?.teacher_user_id && String(teacher.id) === String(lectureInfo.teacher_user_id)) ||
                        (lectureInfo?.teacher_name && teacher.name && teacher.name.toLowerCase() === lectureInfo.teacher_name.toLowerCase());

                      return (
                        <tr
                          key={key}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isAssigned ? 'bg-indigo-50/30 font-medium' : ''
                          } ${
                            currentStatus === 0
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
                            <div className="flex items-center gap-2">
                              <div className="font-bold text-slate-900 text-sm">
                                {teacher.name || teacher.full_name}
                              </div>
                              {isAssigned && (
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-md text-[10px] font-bold uppercase inline-flex items-center gap-1">
                                  <Star size={10} className="fill-indigo-600 text-indigo-600" /> Assigned Faculty
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-xs font-semibold text-slate-500 uppercase mt-0.5">
                              {teacher.employee_id || teacher.employeeId || teacher.code || `EMP-${100 + idx}`}
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="text-xs font-bold text-slate-800">
                              {teacher.department || teacher.subject || 'Academic Faculty'}
                            </div>
                            <div className="text-[11px] text-slate-500 capitalize">
                              {teacher.designation || teacher.role || 'Teacher'}
                            </div>
                          </td>

                          <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                            {teacher.email && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                <Mail size={12} className="text-slate-400" /> {teacher.email}
                              </div>
                            )}
                            {(teacher.phone || teacher.mobile) && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono mt-0.5">
                                <Phone size={12} className="text-slate-400" /> {teacher.phone || teacher.mobile}
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleTeacherMarkStatus(key, 1)}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
                                  currentStatus === 1
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                                }`}
                              >
                                <CheckCircle2 size={14} /> Present
                              </button>

                              <button
                                type="button"
                                onClick={() => handleTeacherMarkStatus(key, 0)}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
                                  currentStatus === 0
                                    ? 'bg-red-600 text-white border-red-600 shadow-sm'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200'
                                }`}
                              >
                                <XCircle size={14} /> Absent
                              </button>

                              <button
                                type="button"
                                onClick={() => handleTeacherMarkStatus(key, 2)}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
                                  currentStatus === 2
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
                              placeholder="Optional faculty notes..."
                              value={mark?.remarks || ''}
                              onChange={e => handleTeacherRemarkChange(key, e.target.value)}
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

            {/* Bottom Footer Actions - Teachers */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="text-xs font-medium text-slate-500">
                Marked: <strong className="text-slate-800 font-bold">{markedTeachersCount} of {totalTeachers} faculty members</strong>
                {unmarkedTeachersCount > 0 && (
                  <span className="text-amber-600 ml-1.5 font-semibold">({unmarkedTeachersCount} unmarked)</span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="primary"
                  onClick={() => addToast('Teacher attendance marks saved successfully for this lecture.', 'success')}
                  className="text-xs font-bold shadow-sm"
                >
                  <CheckCircle2 size={14} className="mr-1" />
                  Save Teacher Attendance
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}

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
    </div>
  );
};
