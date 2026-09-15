import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import {
  Calendar as CalendarIcon, MapPin, Search, CheckCircle2,
  XCircle, Clock, ChevronLeft, ChevronRight, AlertCircle,
  FileText, Users, UserCheck, AlertTriangle,
  RotateCcw, Save, Layers, Phone, BookOpen,
  Download, Upload, FileSpreadsheet, FileUp, HelpCircle
} from 'lucide-react';
import {
  teacherScheduleApi,
  type TeacherScheduleLecture
} from '../../services/teacherScheduleApi';
import {
  attendanceApi,
  type AttendanceRosterRow,
  type AttendanceRecord
} from '../../services/attendanceApi';

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

const formatLocalDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatDisplayDate = (d: Date): string => {
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const formatTime = (timeStr?: string | null): string => {
  if (!timeStr) return '--:--';
  const clean = timeStr.slice(0, 5);
  const [h, m] = clean.split(':').map(Number);
  if (isNaN(h)) return clean;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
};

const calculateDuration = (startTime?: string | null, endTime?: string | null): string => {
  if (!startTime || !endTime) return '';
  const [sh, sm] = startTime.slice(0, 5).split(':').map(Number);
  const [eh, em] = endTime.slice(0, 5).split(':').map(Number);
  if (isNaN(sh) || isNaN(eh)) return '';
  const diffMins = (eh * 60 + em) - (sh * 60 + sm);
  if (diffMins <= 0) return '';
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
};

export const TeacherAttendance: React.FC = () => {
  const { addToast } = useApp();
  const location = useLocation();
  const navState = location.state as { activeLecture?: any; branch?: string; course?: string; batch?: string; date?: string } | null;

  // Active Sub-Tab
  const [activeTab, setActiveTab] = useState<'lectures' | 'history' | 'summary' | 'low_attendance'>('lectures');

  // Date Navigation State
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (navState?.date || navState?.activeLecture?.date) {
      const dStr = navState.date || navState.activeLecture?.date;
      return parseLocalDate(dStr!);
    }
    return new Date();
  });
  const dateStr = formatLocalDate(selectedDate);
  const todayStr = formatLocalDate(new Date());
  const isFutureDate = dateStr > todayStr;
  const isToday = dateStr === todayStr;

  // Teacher Assigned Lectures
  const [lectures, setLectures] = useState<TeacherScheduleLecture[]>([]);
  const [loadingLectures, setLoadingLectures] = useState(false);

  // Roster / Attendance Marking State
  const [activeLecture, setActiveLecture] = useState<TeacherScheduleLecture | null>(null);
  const [rosterRows, setRosterRows] = useState<AttendanceRosterRow[]>([]);
  const [rosterMarks, setRosterMarks] = useState<{ [studentId: number]: { status: 0 | 1 | 2; remarks?: string } }>({});
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterStatusFilter, setRosterStatusFilter] = useState<'all' | 'present' | 'late' | 'absent' | 'unmarked'>('all');

  // Fetch Teacher's Assigned Lectures for the Selected Date
  const fetchTodayLectures = useCallback(async () => {
    setLoadingLectures(true);
    try {
      const res = await teacherScheduleApi.getToday(dateStr);
      setLectures(res.lectures || []);
    } catch (err: any) {
      console.error('Failed to load teacher lectures:', err);
      addToast(err.response?.data?.message || 'Failed to load assigned lectures.', 'error');
    } finally {
      setLoadingLectures(false);
    }
  }, [dateStr, addToast]);

  useEffect(() => {
    fetchTodayLectures();
  }, [fetchTodayLectures]);

  // Daily KPI Stats
  const dailyKPI = useMemo(() => {
    const total = lectures.length;
    const submitted = lectures.filter(l => l.attendance?.taken || l.attendanceTaken).length;
    const pending = lectures.filter(l => !(l.attendance?.taken || l.attendanceTaken) && l.status !== 'CANCELLED').length;
    const turnoutRate = total > 0 ? Math.round((submitted / total) * 100) : 0;

    return { total, submitted, pending, turnoutRate };
  }, [lectures]);

  // Bulk Upload Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [parsedRecords, setParsedRecords] = useState<Array<{ student_id: number; student_code: string; full_name: string; status: 0 | 1 | 2; remarks?: string }>>([]);
  const [unmatchedRows, setUnmatchedRows] = useState<Array<{ rowNumber: number; student_id?: string; student_code?: string; remarks?: string }>>([]);
  const [uploadSummary, setUploadSummary] = useState<{ total: number; present: number; late: number; absent: number } | null>(null);

  // Download Pre-filled Sample CSV
  const handleDownloadSampleCsv = async () => {
    if (!activeLecture) return;
    try {
      // If we already have roster rows, generate and download directly in browser or fetch from template endpoint
      try {
        const blob = await attendanceApi.downloadTemplate(activeLecture.id);
        const url = window.URL.createObjectURL(new Blob([blob]));
        const link = document.createElement('a');
        link.href = url;
        const cleanBatchName = (activeLecture.batch?.name || `batch_${activeLecture.batch?.id || 'lecture'}`).replace(/[^a-zA-Z0-9_-]/g, '_');
        link.setAttribute('download', `attendance_template_${cleanBatchName}_${activeLecture.lectureDate || dateStr}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        addToast('Sample CSV template downloaded successfully!', 'success');
        return;
      } catch (templateApiErr) {
        // Fallback: Generate CSV client-side from rosterRows
        if (rosterRows.length > 0) {
          const headers = ['student_id', 'student_code', 'student_name', 'status', 'remarks'];
          const rows = rosterRows.map(r => [
            r.student_id,
            `"${(r.student_code || '').replace(/"/g, '""')}"`,
            `"${(r.full_name || '').replace(/"/g, '""')}"`,
            r.attendance_status !== undefined && r.attendance_status !== null
              ? (r.attendance_status === 1 ? 'Present' : r.attendance_status === 2 ? 'Late' : 'Absent')
              : 'Present',
            `"${(r.remarks || '').replace(/"/g, '""')}"`
          ].join(','));
          const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          const cleanBatchName = (activeLecture.batch?.name || `batch_${activeLecture.batch?.id || 'lecture'}`).replace(/[^a-zA-Z0-9_-]/g, '_');
          link.setAttribute('download', `attendance_template_${cleanBatchName}_${activeLecture.lectureDate || dateStr}.csv`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
          addToast('Sample CSV template generated and downloaded!', 'success');
        } else {
          throw templateApiErr;
        }
      }
    } catch (err: any) {
      console.error('Failed to download sample CSV:', err);
      addToast(err.response?.data?.message || 'Failed to download sample CSV template.', 'error');
    }
  };

  // Parse and process CSV File
  const handleProcessCsvFile = async (file: File) => {
    if (!file) return;
    setUploadFile(file);
    setIsUploading(true);

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        addToast('CSV file appears to be empty or has no data rows.', 'error');
        setIsUploading(false);
        return;
      }

      // Parse CSV Header
      const headerLine = lines[0].toLowerCase();
      const headers = headerLine.split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
      
      const idIdx = headers.findIndex(h => h === 'student_id' || h === 'studentid' || h === 'id');
      const codeIdx = headers.findIndex(h => h === 'student_code' || h === 'studentcode' || h === 'code' || h === 'roll_no');
      const statusIdx = headers.findIndex(h => h === 'status' || h === 'attendance_status' || h === 'attendance');
      const remarksIdx = headers.findIndex(h => h === 'remarks' || h === 'remark' || h === 'note' || h === 'comments');

      const matched: Array<{ student_id: number; student_code: string; full_name: string; status: 0 | 1 | 2; remarks?: string }> = [];
      const unmatched: Array<{ rowNumber: number; student_id?: string; student_code?: string; remarks?: string }> = [];

      let presentCount = 0;
      let lateCount = 0;
      let absentCount = 0;

      // Map roster rows by ID and by Code for rapid lookup
      const rosterById = new Map<number, AttendanceRosterRow>();
      const rosterByCode = new Map<string, AttendanceRosterRow>();
      rosterRows.forEach(r => {
        rosterById.set(Number(r.student_id), r);
        if (r.student_code) rosterByCode.set(String(r.student_code).trim().toLowerCase(), r);
      });

      for (let i = 1; i < lines.length; i++) {
        // Simple comma split handling quotes
        const row = lines[i].split(',').map(col => col.trim().replace(/^["']|["']$/g, ''));
        const rawId = idIdx >= 0 ? row[idIdx] : '';
        const rawCode = codeIdx >= 0 ? row[codeIdx] : '';
        const rawStatus = statusIdx >= 0 ? row[statusIdx]?.toLowerCase() : 'present';
        const rawRemarks = remarksIdx >= 0 ? row[remarksIdx] : '';

        // Match student in batch roster
        let targetStudent: AttendanceRosterRow | undefined;
        if (rawId && rosterById.has(Number(rawId))) {
          targetStudent = rosterById.get(Number(rawId));
        } else if (rawCode && rosterByCode.has(rawCode.toLowerCase())) {
          targetStudent = rosterByCode.get(rawCode.toLowerCase());
        }

        if (!targetStudent) {
          unmatched.push({ rowNumber: i + 1, student_id: rawId, student_code: rawCode, remarks: rawRemarks });
          continue;
        }

        // Parse status (1/present/p, 2/late/l, 0/absent/a)
        let parsedStatus: 0 | 1 | 2 = 1;
        if (rawStatus === '0' || rawStatus === 'absent' || rawStatus === 'a' || rawStatus === 'no') {
          parsedStatus = 0;
          absentCount++;
        } else if (rawStatus === '2' || rawStatus === 'late' || rawStatus === 'l') {
          parsedStatus = 2;
          lateCount++;
        } else {
          parsedStatus = 1;
          presentCount++;
        }

        matched.push({
          student_id: targetStudent.student_id,
          student_code: targetStudent.student_code,
          full_name: targetStudent.full_name,
          status: parsedStatus,
          remarks: rawRemarks || undefined
        });
      }

      setParsedRecords(matched);
      setUnmatchedRows(unmatched);
      setUploadSummary({
        total: matched.length,
        present: presentCount,
        late: lateCount,
        absent: absentCount
      });

      if (matched.length === 0) {
        addToast('No students in this CSV could be matched to this lecture batch roster.', 'error');
      } else {
        addToast(`Successfully parsed ${matched.length} student records from CSV!`, 'success');
      }
    } catch (err: any) {
      console.error('Error processing CSV:', err);
      addToast('Failed to parse the CSV file. Please verify format.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Apply parsed CSV records to the interactive table
  const handleApplyBulkUpload = () => {
    if (!parsedRecords.length) return;
    const updated = { ...rosterMarks };
    parsedRecords.forEach(r => {
      updated[r.student_id] = {
        status: r.status,
        remarks: r.remarks || updated[r.student_id]?.remarks || ''
      };
    });
    setRosterMarks(updated);
    setHasUnsavedChanges(true);
    setIsBulkModalOpen(false);
    addToast(`Applied ${parsedRecords.length} attendance marks to the roster. Click "Save Attendance" when ready.`, 'success');
  };

  // Save directly to the server
  const handleSaveBulkDirectly = async () => {
    if (!activeLecture || !parsedRecords.length) return;
    setIsUploading(true);
    try {
      const recordsToSave: AttendanceRecord[] = parsedRecords.map(r => ({
        student_id: r.student_id,
        status: r.status,
        remarks: r.remarks
      }));

      await attendanceApi.saveAttendance(activeLecture.id, recordsToSave);
      await attendanceApi.submitAttendance(activeLecture.id, recordsToSave);

      // Update local marks
      const updated = { ...rosterMarks };
      parsedRecords.forEach(r => {
        updated[r.student_id] = {
          status: r.status,
          remarks: r.remarks || ''
        };
      });
      setRosterMarks(updated);
      setHasUnsavedChanges(false);
      setIsBulkModalOpen(false);
      addToast('Attendance records uploaded and saved directly to the database!', 'success');
      fetchTodayLectures();
    } catch (err: any) {
      console.error('Failed to save bulk attendance:', err);
      addToast(err.response?.data?.message || 'Failed to save bulk attendance to database.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // ATTENDANCE ROSTER LOGIC
  // ---------------------------------------------------------------------------

  const handleOpenRoster = async (lecture: TeacherScheduleLecture) => {
    if (isFutureDate) {
      addToast('Cannot mark attendance for upcoming future dates.', 'error');
      return;
    }
    setActiveLecture(lecture);
    setRosterRows([]);
    setRosterMarks({});
    setRosterSearch('');
    setRosterStatusFilter('all');
    setHasUnsavedChanges(false);
    setLoadingRoster(true);

    try {
      const rows = await attendanceApi.getRoster(lecture.id);
      setRosterRows(rows);

      // Pre-fill initial marks from backend records
      const initial: { [studentId: number]: { status: 0 | 1 | 2; remarks?: string } } = {};
      rows.forEach((r) => {
        if (r.attendance_status !== undefined && r.attendance_status !== null) {
          initial[r.student_id] = {
            status: r.attendance_status as 0 | 1 | 2,
            remarks: r.remarks || ''
          };
        }
      });
      setRosterMarks(initial);
    } catch (err: any) {
      console.error('Failed to load roster:', err);
      addToast(err.response?.data?.message || 'Failed to load student roster for lecture.', 'error');
    } finally {
      setLoadingRoster(false);
    }
  };

  const handleCloseRoster = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm('You have unsaved attendance changes. Are you sure you want to discard them?')) {
        return;
      }
    }
    setActiveLecture(null);
    setRosterRows([]);
    setRosterMarks({});
    setHasUnsavedChanges(false);
  };

  const handleMarkStudent = (studentId: number, status: 0 | 1 | 2) => {
    setRosterMarks(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleRemarkChange = (studentId: number, remarks: string) => {
    setRosterMarks(prev => ({
      ...prev,
      [studentId]: {
        status: prev[studentId]?.status ?? 1,
        remarks
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleMarkAll = (status: 0 | 1 | 2) => {
    const updated: { [studentId: number]: { status: 0 | 1 | 2; remarks?: string } } = {};
    rosterRows.forEach((r) => {
      updated[r.student_id] = {
        status,
        remarks: rosterMarks[r.student_id]?.remarks || ''
      };
    });
    setRosterMarks(updated);
    setHasUnsavedChanges(true);
  };

  const handleSaveAttendance = async () => {
    if (!activeLecture) return;
    
    // Check unmarked count
    const totalStudents = rosterRows.length;
    const markedCount = Object.keys(rosterMarks).length;
    if (markedCount < totalStudents) {
      const unmarkedDiff = totalStudents - markedCount;
      if (!window.confirm(`${unmarkedDiff} students have not been explicitly marked. Unmarked students will be recorded as Absent (0). Do you wish to continue?`)) {
        return;
      }
    }

    setIsSaving(true);
    try {
      const records: AttendanceRecord[] = rosterRows.map((r) => {
        const mark = rosterMarks[r.student_id];
        return {
          student_id: r.student_id,
          status: mark?.status !== undefined ? mark.status : 0,
          remarks: mark?.remarks || undefined
        };
      });

      // Save records & mark lecture as completed
      await attendanceApi.saveAttendance(activeLecture.id, records);
      await attendanceApi.submitAttendance(activeLecture.id, records);

      addToast('Attendance submitted and saved successfully!', 'success');
      setHasUnsavedChanges(false);
      setActiveLecture(null);
      // Refresh lectures to update status badge
      fetchTodayLectures();
    } catch (err: any) {
      console.error('Failed to save attendance:', err);
      addToast(err.response?.data?.message || 'Failed to save attendance. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered Student Roster Rows
  const filteredRoster = useMemo(() => {
    return rosterRows.filter((r) => {
      // Search
      if (rosterSearch.trim()) {
        const q = rosterSearch.toLowerCase();
        const matchesName = r.full_name?.toLowerCase().includes(q);
        const matchesCode = r.student_code?.toLowerCase().includes(q);
        const matchesMobile = r.mobile?.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesMobile) return false;
      }

      // Status Tab
      const currentStatus = rosterMarks[r.student_id]?.status;
      if (rosterStatusFilter === 'present' && currentStatus !== 1) return false;
      if (rosterStatusFilter === 'late' && currentStatus !== 2) return false;
      if (rosterStatusFilter === 'absent' && currentStatus !== 0) return false;
      if (rosterStatusFilter === 'unmarked' && currentStatus !== undefined) return false;

      return true;
    });
  }, [rosterRows, rosterMarks, rosterSearch, rosterStatusFilter]);

  // Live Roster KPIs
  const rosterKPIs = useMemo(() => {
    const total = rosterRows.length;
    let present = 0;
    let late = 0;
    let absent = 0;
    let unmarked = 0;

    rosterRows.forEach((r) => {
      const mark = rosterMarks[r.student_id]?.status;
      if (mark === 1) present++;
      else if (mark === 2) late++;
      else if (mark === 0) absent++;
      else unmarked++;
    });

    const attRate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { total, present, late, absent, unmarked, attRate };
  }, [rosterRows, rosterMarks]);

  // ===========================================================================
  // VIEW 2: FULL-PAGE STUDENT ROSTER & ATTENDANCE SHEET
  // ===========================================================================
  if (activeLecture) {
    const isSubmitted = activeLecture.attendance?.taken || activeLecture.attendanceTaken;

    return (
      <div className="space-y-6 pb-20 animate-fade-in">
        {/* Header & Navigation */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleCloseRoster}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-wider cursor-pointer"
              >
                <ChevronLeft size={16} /> Back to Assigned Lectures
              </button>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {activeLecture.batch?.name || `Batch ${activeLecture.batch?.id}`}
                </h1>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {activeLecture.subject?.name || 'Subject'}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  isSubmitted
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                }`}>
                  {isSubmitted ? 'Attendance Submitted' : 'Attendance Pending'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
                <span className="flex items-center gap-1">
                  <CalendarIcon size={14} className="text-slate-400" />
                  {formatDisplayDate(selectedDate)}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock size={14} className="text-slate-400" />
                  {formatTime(activeLecture.startTime)} – {formatTime(activeLecture.endTime)} ({calculateDuration(activeLecture.startTime, activeLecture.endTime)})
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin size={14} className="text-slate-400" />
                  {activeLecture.classroom?.name || activeLecture.classroom?.roomNumber || 'Assigned Classroom'}
                </span>
                {activeLecture.slotLabel && (
                  <>
                    <span>•</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                      {activeLecture.slotLabel}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Live KPI Cards */}
            <div className="flex flex-wrap gap-2 sm:gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
              <div className="text-center px-3 py-1 bg-white rounded-lg border border-slate-100 min-w-[72px]">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enrolled</div>
                <div className="text-lg font-bold text-slate-800">{rosterKPIs.total}</div>
              </div>
              <div className="text-center px-3 py-1 bg-emerald-50/60 rounded-lg border border-emerald-100 min-w-[72px]">
                <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Present</div>
                <div className="text-lg font-bold text-emerald-600">{rosterKPIs.present}</div>
              </div>
              <div className="text-center px-3 py-1 bg-amber-50/60 rounded-lg border border-amber-100 min-w-[72px]">
                <div className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Late</div>
                <div className="text-lg font-bold text-amber-600">{rosterKPIs.late}</div>
              </div>
              <div className="text-center px-3 py-1 bg-rose-50/60 rounded-lg border border-rose-100 min-w-[72px]">
                <div className="text-[10px] font-bold text-rose-700 uppercase tracking-widest">Absent</div>
                <div className="text-lg font-bold text-rose-600">{rosterKPIs.absent}</div>
              </div>
              <div className="text-center px-3 py-1 bg-blue-50/60 rounded-lg border border-blue-100 min-w-[72px]">
                <div className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">Turnout</div>
                <div className="text-lg font-bold text-blue-700">{rosterKPIs.attRate}%</div>
              </div>
            </div>
          </div>

          {/* Bulk Action Toolbar & Search */}
          <div className="pt-4 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search students by name, code or mobile..."
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Bulk Action & CSV Import/Export Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
                Bulk:
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleMarkAll(1)}
                className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 font-bold"
              >
                <CheckCircle2 size={14} className="text-emerald-600" />
                Mark All Present
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleMarkAll(2)}
                className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 font-bold"
              >
                <Clock size={14} className="text-amber-600" />
                Mark All Late
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleMarkAll(0)}
                className="bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 font-bold"
              >
                <XCircle size={14} className="text-rose-600" />
                Mark All Absent
              </Button>

              <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

              {/* Sample CSV Download */}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleDownloadSampleCsv}
                className="bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 font-bold"
                title="Download pre-filled CSV template for this batch"
              >
                <Download size={14} className="text-blue-600" />
                Sample CSV
              </Button>

              {/* Bulk Upload CSV */}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsBulkModalOpen(true);
                  setParsedRecords([]);
                  setUnmatchedRows([]);
                  setUploadSummary(null);
                  setUploadFile(null);
                }}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 font-bold"
              >
                <Upload size={14} className="text-blue-600" />
                Bulk Upload CSV
              </Button>
            </div>
          </div>

          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100">
            {[
              { key: 'all', label: 'All Students', count: rosterKPIs.total },
              { key: 'present', label: 'Present', count: rosterKPIs.present, color: 'text-emerald-700 bg-emerald-50' },
              { key: 'late', label: 'Late', count: rosterKPIs.late, color: 'text-amber-700 bg-amber-50' },
              { key: 'absent', label: 'Absent', count: rosterKPIs.absent, color: 'text-rose-700 bg-rose-50' },
              { key: 'unmarked', label: 'Unmarked', count: rosterKPIs.unmarked, color: 'text-slate-600 bg-slate-100' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setRosterStatusFilter(tab.key as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  rosterStatusFilter === tab.key
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                  rosterStatusFilter === tab.key ? 'bg-slate-800 text-white' : tab.color || 'bg-white text-slate-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Student Roster Table */}
        <Card className="overflow-hidden border border-slate-200 rounded-2xl shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider">
                  <th className="px-6 py-3.5 w-16">#</th>
                  <th className="px-6 py-3.5">Student Details</th>
                  <th className="px-6 py-3.5">Student Code</th>
                  <th className="px-6 py-3.5 text-center min-w-[280px]">Attendance Status</th>
                  <th className="px-6 py-3.5 min-w-[240px]">Remarks / Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loadingRoster ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                      <div className="animate-spin inline-block w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full mb-3" />
                      <div className="font-semibold text-slate-700">Loading student roster for batch...</div>
                    </td>
                  </tr>
                ) : filteredRoster.length > 0 ? (
                  filteredRoster.map((student, idx) => {
                    const currentMark = rosterMarks[student.student_id];
                    const status = currentMark?.status;
                    const remarks = currentMark?.remarks || '';

                    // Initials for avatar
                    const initials = student.full_name
                      ? student.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                      : 'ST';

                    return (
                      <tr key={student.student_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-slate-400 font-semibold">
                          {idx + 1}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm shrink-0">
                              {initials}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 leading-snug">
                                {student.full_name}
                              </div>
                              {student.mobile && (
                                <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                  <Phone size={11} /> {student.mobile}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs font-semibold px-2 py-1 bg-slate-100 rounded text-slate-700 border border-slate-200/60">
                            {student.student_code || `ST-${student.student_id}`}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/70 w-fit mx-auto shadow-inner">
                            {/* Present Button */}
                            <button
                              type="button"
                              onClick={() => handleMarkStudent(student.student_id, 1)}
                              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                status === 1
                                  ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30'
                                  : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/80'
                              }`}
                            >
                              <CheckCircle2 size={14} className={status === 1 ? 'text-white' : 'text-emerald-600'} />
                              Present
                            </button>

                            {/* Late Button */}
                            <button
                              type="button"
                              onClick={() => handleMarkStudent(student.student_id, 2)}
                              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                status === 2
                                  ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/30'
                                  : 'text-slate-600 hover:text-amber-700 hover:bg-amber-50/80'
                              }`}
                            >
                              <Clock size={14} className={status === 2 ? 'text-white' : 'text-amber-600'} />
                              Late
                            </button>

                            {/* Absent Button */}
                            <button
                              type="button"
                              onClick={() => handleMarkStudent(student.student_id, 0)}
                              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                status === 0
                                  ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-600/30'
                                  : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50/80'
                              }`}
                            >
                              <XCircle size={14} className={status === 0 ? 'text-white' : 'text-rose-600'} />
                              Absent
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            placeholder="Optional note / reason..."
                            value={remarks}
                            onChange={(e) => handleRemarkChange(student.student_id, e.target.value)}
                            className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400"
                          />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                      <Search className="mx-auto text-slate-300 mb-3" size={32} />
                      <div className="font-semibold text-slate-700">No students match your filter or search.</div>
                      <p className="text-xs text-slate-400 mt-1">Try resetting the search query or status filter.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Bulk Upload CSV Modal */}
        <Modal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          title="Bulk Upload Attendance (CSV)"
          size="2xl"
        >
          <div className="space-y-5">
            {/* Guide & Sample Template Download Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-bold text-blue-900">
                  <FileSpreadsheet size={16} className="text-blue-600" />
                  Pre-filled Batch CSV Template
                </div>
                <p className="text-xs text-blue-700">
                  Download the template with all enrolled students pre-filled, mark statuses offline, and upload back.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleDownloadSampleCsv}
                className="bg-white hover:bg-blue-50 text-blue-700 border-blue-200 font-bold shrink-0 shadow-2xs"
              >
                <Download size={14} className="text-blue-600" />
                Download Sample CSV
              </Button>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleProcessCsvFile(e.dataTransfer.files[0]);
                }
              }}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/20 rounded-2xl p-6 text-center transition-all cursor-pointer relative group"
            >
              <input
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleProcessCsvFile(e.target.files[0]);
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform border border-blue-100 shadow-2xs">
                <FileUp size={24} />
              </div>
              <div className="text-sm font-bold text-slate-800">
                {uploadFile ? uploadFile.name : 'Click to browse or drag & drop CSV file'}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Accepted: .csv files containing Student ID / Code, Status (Present / Late / Absent), and Remarks
              </p>
            </div>

            {/* Uploaded File Statistics & Summary */}
            {uploadSummary && (
              <div className="space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    CSV Parsing Results & Summary
                  </h4>
                  <span className="text-xs font-semibold text-slate-500">
                    {uploadSummary.total} Students Matched
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Matched</span>
                    <span className="text-base font-bold text-slate-800">{uploadSummary.total}</span>
                  </div>
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">Present</span>
                    <span className="text-base font-bold text-emerald-600">{uploadSummary.present}</span>
                  </div>
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-amber-700 block">Late</span>
                    <span className="text-base font-bold text-amber-600">{uploadSummary.late}</span>
                  </div>
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-rose-700 block">Absent</span>
                    <span className="text-base font-bold text-rose-600">{uploadSummary.absent}</span>
                  </div>
                </div>

                {unmatchedRows.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                    <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600" />
                    <div>
                      <span className="font-bold">{unmatchedRows.length} rows could not be matched:</span>
                      <span className="text-amber-700 ml-1">
                        Row #{unmatchedRows.map(u => u.rowNumber).join(', ')} do not belong to this batch and will be skipped.
                      </span>
                    </div>
                  </div>
                )}

                {/* Preview Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="px-3 py-2">Student</th>
                        <th className="px-3 py-2">Code</th>
                        <th className="px-3 py-2 text-center">Parsed Status</th>
                        <th className="px-3 py-2">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRecords.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50/60">
                          <td className="px-3 py-2 font-bold text-slate-900">{r.full_name}</td>
                          <td className="px-3 py-2 font-mono text-slate-500">{r.student_code}</td>
                          <td className="px-3 py-2 text-center">
                            {r.status === 1 ? (
                              <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Present
                              </span>
                            ) : r.status === 2 ? (
                              <span className="px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Late
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                Absent
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-slate-500 truncate max-w-[140px]">{r.remarks || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsBulkModalOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!parsedRecords.length || isUploading}
                  onClick={handleApplyBulkUpload}
                  className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold"
                >
                  Apply to Attendance Sheet
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={!parsedRecords.length || isUploading}
                  onClick={handleSaveBulkDirectly}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20"
                >
                  {isUploading ? 'Saving...' : 'Save Directly to Database'}
                </Button>
              </div>
            </div>
          </div>
        </Modal>

        {/* Floating Action Footer */}
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 py-3.5 px-6 shadow-lg">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold">
              {hasUnsavedChanges ? (
                <span className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                  <AlertCircle size={14} /> You have unsaved attendance changes
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  <CheckCircle2 size={14} /> All changes saved in database
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCloseRoster}
                className="flex-1 sm:flex-none font-semibold text-slate-600"
              >
                Cancel / Close
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleSaveAttendance}
                disabled={isSaving || loadingRoster || rosterRows.length === 0}
                className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-md shadow-blue-600/20"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Saving Attendance...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save Attendance
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // VIEW 1: MAIN TODAY'S LECTURES & SCHEDULE FEED (Academic Schedule Matched)
  // ===========================================================================
  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-slate-900 tracking-tight">
            Academic Schedule & Attendance
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            View your assigned lectures for the day and take or update student attendance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={fetchTodayLectures} disabled={loadingLectures}>
            <RotateCcw size={14} className={loadingLectures ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Daily KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Today's Lectures</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <CalendarIcon size={16} />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{dailyKPI.total}</span>
            <span className="text-xs font-semibold text-slate-400">Assigned Slots</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Submitted</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{dailyKPI.submitted}</span>
            <span className="text-xs font-semibold text-emerald-700">Completed</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">Pending</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <AlertCircle size={16} />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600">{dailyKPI.pending}</span>
            <span className="text-xs font-semibold text-amber-700">Needs Attendance</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Turnout Rate</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Users size={16} />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-700">{dailyKPI.turnoutRate}%</span>
            <span className="text-xs font-semibold text-slate-400">Completion</span>
          </div>
        </div>
      </div>

      {/* Centered Date Controller - Matching TeacherSchedule.tsx */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const prev = new Date(selectedDate);
            prev.setDate(prev.getDate() - 1);
            setSelectedDate(prev);
          }}
          className="text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 mr-1 text-slate-500" /> Previous Day
        </Button>

        <div className="flex items-center gap-3">
          <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            {formatDisplayDate(selectedDate)}
          </span>
          {!isToday && (
            <button
              onClick={() => {
                setSelectedDate(new Date());
              }}
              className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md hover:bg-blue-100 transition-colors shadow-2xs cursor-pointer"
            >
              Jump to Today
            </button>
          )}
          <div className="relative">
            <input
              type="date"
              value={dateStr}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(parseLocalDate(e.target.value));
                }
              }}
              className="text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-md px-2 py-1 text-slate-700 font-medium cursor-pointer"
            />
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const next = new Date(selectedDate);
            next.setDate(next.getDate() + 1);
            setSelectedDate(next);
          }}
          className="text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
        >
          Next Day <ChevronRight className="w-4 h-4 ml-1 text-slate-500" />
        </Button>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto hide-scrollbar">
        {[
          { id: 'lectures', label: "Daily Schedule & Lectures", count: lectures.length },
          { id: 'history', label: 'Attendance History' },
          { id: 'summary', label: 'Batch Turnout Summary' },
          { id: 'low_attendance', label: 'Low Attendance Alerts' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-none px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600 bg-blue-50/20'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: LECTURES LIST */}
      {activeTab === 'lectures' && (
        <div className="space-y-4">
          <Card className="overflow-hidden border border-slate-200 rounded-2xl shadow-sm">
            <div className="w-full">
              <table className="w-full text-left border-collapse table-auto">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider">
                    <th className="px-4 py-3.5 whitespace-nowrap">Time & Duration</th>
                    <th className="px-4 py-3.5">Batch Details</th>
                    <th className="px-4 py-3.5">Subject & Topic</th>
                    <th className="px-3 py-3.5 whitespace-nowrap">Classroom</th>
                    <th className="px-3 py-3.5 text-center whitespace-nowrap">Type</th>
                    <th className="px-3 py-3.5 text-center whitespace-nowrap">Status</th>
                    <th className="px-4 py-3.5 text-right whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {loadingLectures ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center text-slate-500">
                        <div className="animate-spin inline-block w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full mb-3" />
                        <div className="font-semibold text-slate-700">Loading your assigned lectures...</div>
                      </td>
                    </tr>
                  ) : lectures.length > 0 ? (
                    lectures.map((lecture) => {
                      const isSubmitted = lecture.attendance?.taken || lecture.attendanceTaken;
                      const isCancelled = lecture.status === 'CANCELLED';

                      return (
                        <tr key={lecture.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="font-bold text-slate-900 text-sm leading-snug">
                              {formatTime(lecture.startTime)} – {formatTime(lecture.endTime)}
                            </div>
                            <div className="text-xs font-semibold text-slate-400 mt-0.5 flex items-center gap-1">
                              <Clock size={11} />
                              {calculateDuration(lecture.startTime, lecture.endTime)}
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="font-bold text-blue-700 text-sm leading-snug">
                              {lecture.batch?.name || `Batch ${lecture.batch?.id}`}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {lecture.course?.name || lecture.level?.name || 'Classroom Batch'}
                              {lecture.branch?.name && ` • ${lecture.branch.name}`}
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-800 text-sm">
                              {lecture.subject?.name || 'Academic Subject'}
                            </div>
                            {lecture.topic && (
                              <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]" title={lecture.topic}>
                                Topic: {lecture.topic}
                              </div>
                            )}
                          </td>

                          <td className="px-3 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-slate-700 font-medium text-xs">
                              <MapPin size={13} className="text-slate-400 shrink-0" />
                              <span>{lecture.classroom?.name || lecture.classroom?.roomNumber || 'Room TBA'}</span>
                            </div>
                          </td>

                          <td className="px-3 py-3.5 text-center whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {lecture.lectureType || 'Regular'}
                            </span>
                          </td>

                          <td className="px-3 py-3.5 text-center whitespace-nowrap">
                            {isCancelled ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <XCircle size={12} /> Cancelled
                              </span>
                            ) : isSubmitted ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 size={12} /> Submitted
                              </span>
                            ) : isFutureDate ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                <Clock size={12} /> Upcoming
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                                <AlertCircle size={12} /> Pending
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            {isCancelled ? (
                              <span className="text-xs text-slate-400 font-medium italic">Cancelled</span>
                            ) : isFutureDate ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled
                                className="opacity-60 cursor-not-allowed text-xs py-1 px-2.5"
                              >
                                Scheduled
                              </Button>
                            ) : isSubmitted ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleOpenRoster(lecture)}
                                className="bg-slate-50 hover:bg-slate-100 text-blue-700 border-slate-200 font-bold text-xs py-1.5 px-3 shadow-2xs cursor-pointer inline-flex items-center gap-1"
                              >
                                View / Edit
                              </Button>
                            ) : (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleOpenRoster(lecture)}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-1.5 px-3 shadow-sm shadow-blue-600/20 cursor-pointer inline-flex items-center gap-1"
                              >
                                <UserCheck size={13} /> Mark Attendance
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center text-slate-500">
                        <CalendarIcon className="mx-auto text-slate-300 mb-3" size={36} />
                        <div className="font-bold text-slate-800 text-base">No assigned lectures for this date</div>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          You do not have any scheduled lecture slots on {formatDisplayDate(selectedDate)}.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: HISTORY TAB */}
      {activeTab === 'history' && (
        <Card className="p-8 text-center border border-slate-200 rounded-2xl">
          <FileText className="mx-auto text-slate-300 mb-3" size={40} />
          <h3 className="font-bold text-slate-800 text-lg">Lecture Attendance History</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Review past verified attendance registers across all your assigned batches and academic sessions.
          </p>
        </Card>
      )}

      {/* TAB 3: BATCH TURNOUT SUMMARY */}
      {activeTab === 'summary' && (
        <Card className="p-8 text-center border border-slate-200 rounded-2xl">
          <Layers className="mx-auto text-slate-300 mb-3" size={40} />
          <h3 className="font-bold text-slate-800 text-lg">Batch Turnout & Attendance Averages</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Aggregated statistics and turnout performance percentages for your assigned batches.
          </p>
        </Card>
      )}

      {/* TAB 4: LOW ATTENDANCE ALERTS */}
      {activeTab === 'low_attendance' && (
        <Card className="p-8 text-center border border-slate-200 rounded-2xl">
          <AlertTriangle className="mx-auto text-amber-400 mb-3" size={40} />
          <h3 className="font-bold text-slate-800 text-lg">Low Attendance Defaulter Alerts</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Students in your assigned batches with attendance rates below 75% for parent follow-up.
          </p>
        </Card>
      )}
    </div>
  );
};
