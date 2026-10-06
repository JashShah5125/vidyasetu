import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Pagination } from '../ui/Pagination';
import {
  Calendar as CalendarIcon, MapPin, Search, CheckCircle2,
  XCircle, Clock, ChevronLeft, ChevronRight, AlertCircle,
  FileText, Users, UserCheck, AlertTriangle,
  RotateCcw, Save, Layers, Phone, BookOpen,
  Download, Upload, FileSpreadsheet, FileUp, HelpCircle,
  RefreshCw, TrendingUp, Filter, Check, Eye
} from 'lucide-react';
import {
  teacherScheduleApi,
  type TeacherScheduleLecture,
  type TeacherAttendanceHistoryItem,
  type TeacherAttendanceHistoryResponse,
  type BatchTurnoutSummaryItem,
  type LowAttendanceAlertItem
} from '../../services/teacherScheduleApi';
import {
  attendanceApi,
  type AttendanceRosterRow,
  type AttendanceRecord
} from '../../services/attendanceApi';

const parseLocalDate = (dateStr?: string | null): Date => {
  if (!dateStr || typeof dateStr !== 'string') {
    return new Date();
  }
  let cleanStr = dateStr.trim();
  if (cleanStr.includes('T')) {
    cleanStr = cleanStr.split('T')[0];
  }
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts.map(Number);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return new Date(year, month - 1, day);
    }
  }
  const fallback = new Date(cleanStr);
  return isNaN(fallback.getTime()) ? new Date() : fallback;
};

const formatLocalDate = (d?: Date | null): string => {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatDisplayDate = (d?: Date | null): string => {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return 'N/A';
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const navState = location.state as {
    activeLecture?: any;
    lecture?: any;
    lectureId?: string | number;
    branch?: string;
    course?: string;
    batch?: string;
    date?: string;
  } | null;

  // Active Sub-Tab
  const [activeTab, setActiveTab] = useState<'lectures' | 'history' | 'summary' | 'low_attendance'>('lectures');

  // Date Navigation State
  const initialTargetDate = navState?.date || navState?.activeLecture?.date || navState?.activeLecture?.lectureDate || (navState as any)?.lecture?.date || (navState as any)?.lecture?.lectureDate;
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (initialTargetDate) {
      return parseLocalDate(initialTargetDate);
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

  // Attendance History Tab State
  const [historyData, setHistoryData] = useState<TeacherAttendanceHistoryResponse | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyBatchFilter, setHistoryBatchFilter] = useState('all');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'submitted' | 'pending'>('all');

  // Batch Summary State
  const [batchSummaries, setBatchSummaries] = useState<BatchTurnoutSummaryItem[]>([]);
  const [loadingBatchSummaries, setLoadingBatchSummaries] = useState(false);

  // Low Attendance State
  const [lowAttendanceAlerts, setLowAttendanceAlerts] = useState<LowAttendanceAlertItem[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  const fetchAttendanceHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await teacherScheduleApi.getHistory({
        batchId: historyBatchFilter !== 'all' ? historyBatchFilter : undefined,
        status: historyStatusFilter !== 'all' ? historyStatusFilter : undefined
      });
      setHistoryData(res);
    } catch (err: any) {
      console.error('Failed to load attendance history:', err);
      addToast('Failed to load attendance history.', 'error');
    } finally {
      setLoadingHistory(false);
    }
  }, [historyBatchFilter, historyStatusFilter, addToast]);

  const fetchBatchSummaries = useCallback(async () => {
    setLoadingBatchSummaries(true);
    try {
      const res = await teacherScheduleApi.getBatchTurnoutSummary();
      setBatchSummaries(res || []);
    } catch (err: any) {
      console.error('Failed to load batch summaries:', err);
    } finally {
      setLoadingBatchSummaries(false);
    }
  }, []);

  const fetchLowAttendanceAlerts = useCallback(async () => {
    setLoadingAlerts(true);
    try {
      const res = await teacherScheduleApi.getLowAttendanceAlerts();
      setLowAttendanceAlerts(res || []);
    } catch (err: any) {
      console.error('Failed to load low attendance alerts:', err);
    } finally {
      setLoadingAlerts(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchAttendanceHistory();
    } else if (activeTab === 'summary') {
      fetchBatchSummaries();
    } else if (activeTab === 'low_attendance') {
      fetchLowAttendanceAlerts();
    }
  }, [activeTab, fetchAttendanceHistory, fetchBatchSummaries, fetchLowAttendanceAlerts]);

  // Unique batches for history filter
  const availableBatches = useMemo(() => {
    const map = new Map<string | number, string>();
    lectures.forEach(l => {
      if (l.batch?.id && l.batch?.name) map.set(l.batch.id, l.batch.name);
    });
    if (historyData?.lectures) {
      historyData.lectures.forEach(l => {
        if (l.batch?.id && l.batch?.name) map.set(l.batch.id, l.batch.name);
      });
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [lectures, historyData]);

  // Filtered history lectures
  const filteredHistoryLectures = useMemo(() => {
    if (!historyData?.lectures) return [];
    return historyData.lectures.filter((item) => {
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const mBatch = item.batch?.name?.toLowerCase().includes(q) || item.batch?.code?.toLowerCase().includes(q);
        const mSubject = item.subject?.name?.toLowerCase().includes(q);
        const mRoom = item.classroom?.name?.toLowerCase().includes(q);
        const mTopic = item.topic?.toLowerCase().includes(q);
        if (!mBatch && !mSubject && !mRoom && !mTopic) return false;
      }
      return true;
    });
  }, [historyData, historySearch]);

  // Attendance History Pagination State
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);

  useEffect(() => {
    setHistoryPage(1);
  }, [historySearch, historyBatchFilter, historyStatusFilter]);

  const totalHistoryItems = filteredHistoryLectures.length;
  const totalHistoryPages = Math.ceil(totalHistoryItems / historyPageSize) || 1;

  const paginatedHistoryLectures = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize;
    return filteredHistoryLectures.slice(start, start + historyPageSize);
  }, [filteredHistoryLectures, historyPage, historyPageSize]);

  // Low Attendance Alerts Pagination State
  const [alertsPage, setAlertsPage] = useState(1);
  const [alertsPageSize, setAlertsPageSize] = useState(10);

  const totalAlertsItems = lowAttendanceAlerts.length;
  const totalAlertsPages = Math.ceil(totalAlertsItems / alertsPageSize) || 1;

  const paginatedAlerts = useMemo(() => {
    const start = (alertsPage - 1) * alertsPageSize;
    return lowAttendanceAlerts.slice(start, start + alertsPageSize);
  }, [lowAttendanceAlerts, alertsPage, alertsPageSize]);

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
        link.setAttribute('download', `attendance_template_${cleanBatchName}_${activeLecture.lectureDate || activeLecture.date || dateStr}.csv`);
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
          link.setAttribute('download', `attendance_template_${cleanBatchName}_${activeLecture.lectureDate || activeLecture.date || dateStr}.csv`);
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
      // Optimistically update today's lectures list
      const nowIso = new Date().toISOString();
      const presentCount = recordsToSave.filter(r => r.status === 1).length;
      const lateCount = recordsToSave.filter(r => r.status === 2).length;
      const absentCount = recordsToSave.filter(r => r.status === 0).length;
      const totalMarked = recordsToSave.length;
      const turnoutRate = totalMarked > 0 ? Math.round(((presentCount + lateCount) / totalMarked) * 100) : 0;
      const wasAlreadyTaken = Boolean(activeLecture.attendanceTaken || activeLecture.attendance?.taken);

      setLectures((prev) =>
        prev.map((l) => {
          if (String(l.id) === String(activeLecture.id)) {
            return {
              ...l,
              attendanceTaken: true,
              attendance: {
                ...l.attendance,
                required: l.attendance?.required ?? true,
                taken: true,
                submittedAt: nowIso
              }
            };
          }
          return l;
        })
      );

      // Optimistically update attendance history list
      setHistoryData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          submittedLectures: (prev.submittedLectures || 0) + (wasAlreadyTaken ? 0 : 1),
          pendingLectures: Math.max(0, (prev.pendingLectures || 0) - (wasAlreadyTaken ? 0 : 1)),
          lectures: prev.lectures.map((item) => {
            if (String(item.id) === String(activeLecture.id)) {
              return {
                ...item,
                attendanceTaken: true,
                attendance: {
                  ...item.attendance,
                  taken: true,
                  submittedAt: nowIso
                },
                turnoutRate,
                presentCount,
                lateCount,
                absentCount,
                totalMarked
              };
            }
            return item;
          })
        };
      });

      setRosterMarks(updated);
      setHasUnsavedChanges(false);
      setIsBulkModalOpen(false);
      addToast('Attendance records uploaded and saved directly to the database!', 'success');
      
      // Refresh all views from server
      fetchTodayLectures();
      fetchAttendanceHistory();
      fetchBatchSummaries();
      fetchLowAttendanceAlerts();
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

  const lastHandledNavKeyRef = useRef<string | null>(null);

  const handleOpenRoster = useCallback(async (lectureOrId: TeacherScheduleLecture | number | string) => {
    let lecture: TeacherScheduleLecture | null = typeof lectureOrId === 'object' && lectureOrId !== null ? lectureOrId : null;
    const lectureId: string | number = lecture ? lecture.id : (lectureOrId as string | number);

    const lectureDateStr = (lecture as any)?.lectureDate || (lecture as any)?.date || dateStr;
    if (lectureDateStr > todayStr) {
      addToast('Cannot mark attendance for upcoming future dates.', 'error');
      return;
    }

    if (lecture) {
      setActiveLecture(lecture);
    }
    setRosterRows([]);
    setRosterMarks({});
    setRosterSearch('');
    setRosterStatusFilter('all');
    setHasUnsavedChanges(false);
    setLoadingRoster(true);

    try {
      const rows = await attendanceApi.getRoster(lectureId);
      setRosterRows(rows);

      if (!lecture && rows.length > 0) {
        const first = rows[0] as any;
        lecture = {
          id: lectureId,
          startTime: first.start_time || '09:00',
          endTime: first.end_time || '10:30',
          type: 'LECTURE',
          lectureType: first.lecture_type || 'REGULAR',
          activityType: first.activity_type || 'THEORY',
          slotLabel: first.slot_label,
          subject: {
            id: first.subject_id,
            name: first.subject_name || 'Subject'
          },
          batch: {
            id: first.batch_id,
            name: first.batch_name || `Batch #${first.batch_id}`
          },
          level: {
            id: first.level_id || 0,
            name: first.level_name || 'Class'
          },
          classroom: {
            id: first.classroom_id || 0,
            name: first.room_name || first.classroom_name || 'Room TBA'
          },
          branch: {
            id: first.branch_id || 0,
            name: first.branch_name || ''
          },
          status: 'SCHEDULED',
          attendance: {
            required: true,
            taken: Boolean(first.attendance_taken || first.attendance_submitted_at)
          },
          date: first.lecture_date,
          lectureDate: first.lecture_date
        } as any;
        setActiveLecture(lecture);
      }

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
  }, [dateStr, todayStr, addToast]);

  // Auto-open roster if navigated with activeLecture, lecture, or lectureId
  useEffect(() => {
    // Avoid re-processing the exact same navigation key
    if (lastHandledNavKeyRef.current === location.key) {
      return;
    }

    const targetLecture = navState?.activeLecture || (navState as any)?.lecture;
    if (targetLecture && targetLecture.id) {
      lastHandledNavKeyRef.current = location.key;
      const targetDateStr = targetLecture.date || targetLecture.lectureDate;
      if (targetDateStr) {
        setSelectedDate(parseLocalDate(targetDateStr));
      }
      handleOpenRoster(targetLecture);
      // Clean up navigation state in history so closing the roster never re-opens it
      navigate(location.pathname + location.search, { replace: true, state: null });
      return;
    }

    const queryLecId = searchParams.get('lectureId') || navState?.lectureId;
    if (queryLecId && !activeLecture) {
      const match = lectures.find(l => String(l.id) === String(queryLecId));
      if (match) {
        lastHandledNavKeyRef.current = location.key;
        handleOpenRoster(match);
      } else if (!loadingLectures) {
        lastHandledNavKeyRef.current = location.key;
        handleOpenRoster(queryLecId);
      }
    }
  }, [location.key, navState, searchParams, lectures, loadingLectures, activeLecture, handleOpenRoster, navigate, location.pathname, location.search]);

  const handleCloseRoster = () => {
    if (hasUnsavedChanges) {
      addToast('Unsaved attendance changes were discarded.', 'warning');
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
      addToast(`${unmarkedDiff} unmarked student${unmarkedDiff > 1 ? 's' : ''} recorded as Absent (0).`, 'info');
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

      // 1. Optimistically update today's lectures list
      const nowIso = new Date().toISOString();
      const presentCount = records.filter(r => r.status === 1).length;
      const lateCount = records.filter(r => r.status === 2).length;
      const absentCount = records.filter(r => r.status === 0).length;
      const totalMarked = records.length;
      const effectiveDenom = totalMarked;
      const turnoutRate = effectiveDenom > 0 ? Math.round(((presentCount + lateCount) / effectiveDenom) * 100) : 0;
      const wasAlreadyTaken = Boolean(activeLecture.attendanceTaken || activeLecture.attendance?.taken);

      setLectures((prev) =>
        prev.map((l) => {
          if (String(l.id) === String(activeLecture.id)) {
            return {
              ...l,
              attendanceTaken: true,
              attendance: {
                ...l.attendance,
                required: l.attendance?.required ?? true,
                taken: true,
                submittedAt: nowIso
              }
            };
          }
          return l;
        })
      );

      // 2. Optimistically update attendance history list
      setHistoryData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          submittedLectures: (prev.submittedLectures || 0) + (wasAlreadyTaken ? 0 : 1),
          pendingLectures: Math.max(0, (prev.pendingLectures || 0) - (wasAlreadyTaken ? 0 : 1)),
          lectures: prev.lectures.map((item) => {
            if (String(item.id) === String(activeLecture.id)) {
              return {
                ...item,
                attendanceTaken: true,
                attendance: {
                  ...item.attendance,
                  taken: true,
                  submittedAt: nowIso
                },
                turnoutRate,
                presentCount,
                lateCount,
                absentCount,
                totalMarked
              };
            }
            return item;
          })
        };
      });

      addToast('Attendance submitted and saved successfully!', 'success');
      setHasUnsavedChanges(false);
      setActiveLecture(null);
      navigate(location.pathname, { replace: true, state: null });

      // 3. Refresh all views from server
      fetchTodayLectures();
      fetchAttendanceHistory();
      fetchBatchSummaries();
      fetchLowAttendanceAlerts();
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

            {/* Pagination Controls */}
            {filteredHistoryLectures.length > 0 && (
              <Pagination
                currentPage={historyPage}
                totalPages={totalHistoryPages}
                totalItems={totalHistoryItems}
                pageSize={historyPageSize}
                onPageChange={setHistoryPage}
                onPageSizeChange={setHistoryPageSize}
              />
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: ATTENDANCE HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* History KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 border border-slate-200 bg-white shadow-2xs rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Lectures</span>
                <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <BookOpen size={18} />
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {historyData?.totalLectures ?? '—'}
              </div>
              <div className="text-xs text-slate-400 font-medium mt-1">Conducted across all batches</div>
            </Card>

            <Card className="p-5 border border-slate-200 bg-white shadow-2xs rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Submitted</span>
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <CheckCircle2 size={18} />
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-700 mt-2">
                {historyData?.submittedLectures ?? '—'}
              </div>
              <div className="text-xs text-slate-400 font-medium mt-1">Verified attendance registers</div>
            </Card>

            <Card className="p-5 border border-slate-200 bg-white shadow-2xs rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Attendance</span>
                <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <AlertCircle size={18} />
                </span>
              </div>
              <div className="text-2xl font-black text-amber-600 mt-2">
                {historyData?.pendingLectures ?? '—'}
              </div>
              <div className="text-xs text-slate-400 font-medium mt-1">Awaiting attendance marking</div>
            </Card>

            <Card className="p-5 border border-slate-200 bg-white shadow-2xs rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Turnout</span>
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <TrendingUp size={18} />
                </span>
              </div>
              <div className="text-2xl font-black text-indigo-700 mt-2">
                {historyData ? `${historyData.avgTurnout}%` : '—'}
              </div>
              <div className="text-xs text-slate-400 font-medium mt-1">Class presence percentage</div>
            </Card>
          </div>

          {/* Filter Bar */}
          <Card className="p-4 border border-slate-200 bg-white shadow-2xs rounded-2xl space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search history by batch, subject, room, or topic..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Batch Filter Dropdown */}
              <div className="flex items-center gap-2">
                <select
                  value={historyBatchFilter}
                  onChange={(e) => setHistoryBatchFilter(e.target.value)}
                  className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                >
                  <option value="all">All Batches</option>
                  {availableBatches.map((b) => (
                    <option key={b.id} value={String(b.id)}>
                      {b.name}
                    </option>
                  ))}
                </select>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={fetchAttendanceHistory}
                  className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 cursor-pointer rounded-xl"
                  title="Refresh history"
                >
                  <RefreshCw size={15} className={loadingHistory ? 'animate-spin' : ''} />
                </Button>
              </div>
            </div>

            {/* Status Pills Filter */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
                <Filter size={12} /> Status:
              </span>
              {[
                { id: 'all', label: 'All Records', count: historyData?.totalLectures },
                { id: 'submitted', label: 'Submitted', count: historyData?.submittedLectures },
                { id: 'pending', label: 'Pending', count: historyData?.pendingLectures }
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setHistoryStatusFilter(pill.id as any)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    historyStatusFilter === pill.id
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                  }`}
                >
                  <span>{pill.label}</span>
                  {pill.count !== undefined && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      historyStatusFilter === pill.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {pill.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </Card>

          {/* History Records Table */}
          <Card className="border border-slate-200 rounded-2xl shadow-2xs bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3.5">Date & Slot</th>
                    <th className="px-4 py-3.5">Batch Details</th>
                    <th className="px-4 py-3.5">Subject & Classroom</th>
                    <th className="px-4 py-3.5 text-center">Turnout Rate</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {loadingHistory ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center text-slate-500">
                        <div className="animate-spin inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mb-3" />
                        <div className="font-semibold text-slate-700">Loading attendance history...</div>
                      </td>
                    </tr>
                  ) : filteredHistoryLectures.length > 0 ? (
                    paginatedHistoryLectures.map((item) => {
                      const isSubmitted = item.attendanceTaken;
                      const rawDate = item.date || item.lectureDate;
                      const dateObj = rawDate ? parseLocalDate(rawDate) : null;
                      const turnoutPct = item.turnoutRate ?? 0;
                      const isHighTurnout = turnoutPct >= 75;
                      const isMidTurnout = turnoutPct >= 50 && turnoutPct < 75;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Date & Slot */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="font-bold text-slate-900 text-sm">
                              {dateObj ? formatDisplayDate(dateObj) : 'No Date Set'}
                            </div>
                            <div className="text-xs font-semibold text-slate-400 mt-0.5 flex items-center gap-1">
                              <Clock size={11} />
                              {formatTime(item.startTime)} – {formatTime(item.endTime)}
                            </div>
                          </td>

                          {/* Batch Details */}
                          <td className="px-4 py-4">
                            <div className="font-bold text-blue-700 text-sm leading-snug">
                              {item.batch?.name || `Batch #${item.id}`}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5 font-medium">
                              {item.level?.name || 'Classroom Batch'} {item.batch?.code && `• ${item.batch.code}`}
                            </div>
                          </td>

                          {/* Subject & Classroom */}
                          <td className="px-4 py-4">
                            <div className="font-bold text-slate-800 text-sm">
                              {item.subject?.name || 'Subject'}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                              <MapPin size={11} className="text-slate-400" />
                              {item.classroom?.name || 'Room TBA'}
                              {item.topic && (
                                <span className="text-slate-400 ml-1 truncate max-w-[150px]" title={item.topic}>
                                  • {item.topic}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Turnout Rate */}
                          <td className="px-4 py-4 text-center whitespace-nowrap">
                            {isSubmitted ? (
                              <div className="inline-flex flex-col items-center">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                                  isHighTurnout
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : isMidTurnout
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}>
                                  {turnoutPct}% Turnout
                                </span>
                                <span className="text-[11px] font-semibold text-slate-400 mt-1">
                                  {item.presentCount + item.lateCount} / {item.totalEnrolled || item.totalMarked} Present
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs font-semibold text-slate-400 italic">
                                Not recorded
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-4 text-center whitespace-nowrap">
                            {isSubmitted ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 size={12} /> Submitted
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                                <AlertCircle size={12} /> Pending
                              </span>
                            )}
                          </td>

                          {/* Action Button */}
                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            <Button
                              variant={isSubmitted ? "secondary" : "primary"}
                              size="sm"
                              onClick={() => handleOpenRoster(item as any)}
                              className={`text-xs font-bold py-1.5 px-3 cursor-pointer inline-flex items-center gap-1.5 shadow-2xs ${
                                isSubmitted ? 'hover:bg-slate-100 text-blue-700' : ''
                              }`}
                            >
                              <Eye size={13} />
                              {isSubmitted ? 'View / Edit Roster' : 'Mark Attendance'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center text-slate-400">
                        <FileText className="mx-auto text-slate-300 mb-3" size={36} />
                        <div className="font-semibold text-slate-700 text-base">No attendance history records found</div>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          {historySearch || historyBatchFilter !== 'all' || historyStatusFilter !== 'all'
                            ? 'Try clearing your filters or search query.'
                            : 'Submitted lecture attendance registers will be archived and listed here.'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredHistoryLectures.length > 0 && (
              <Pagination
                currentPage={historyPage}
                totalPages={totalHistoryPages}
                totalItems={totalHistoryItems}
                pageSize={historyPageSize}
                onPageChange={setHistoryPage}
                onPageSizeChange={setHistoryPageSize}
              />
            )}
          </Card>
        </div>
      )}

      {/* TAB 3: BATCH TURNOUT SUMMARY */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Batch Turnout Performance</h2>
              <p className="text-xs text-slate-500 mt-0.5">Aggregated student turnout metrics across your assigned batches</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchBatchSummaries}
              className="text-xs font-semibold cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw size={13} className={loadingBatchSummaries ? 'animate-spin' : ''} /> Refresh
            </Button>
          </div>

          {loadingBatchSummaries ? (
            <div className="py-24 text-center">
              <div className="animate-spin inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mb-3" />
              <div className="font-semibold text-slate-600">Calculating batch attendance metrics...</div>
            </div>
          ) : batchSummaries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {batchSummaries.map((b) => {
                const rate = b.turnoutRate;
                const isGood = rate >= 75;
                const isMid = rate >= 50 && rate < 75;

                return (
                  <Card key={b.batchId} className="p-5 border border-slate-200 rounded-2xl bg-white shadow-2xs hover:border-blue-200 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-slate-900 text-base leading-snug">{b.batchName}</h3>
                          <span className="text-xs font-mono font-semibold text-slate-400 mt-0.5 inline-block">
                            {b.batchCode || `BATCH-${b.batchId}`}
                          </span>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${
                          isGood
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isMid
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {rate}%
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-100 rounded-full h-2 mt-4 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isGood ? 'bg-emerald-500' : isMid ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, rate))}%` }}
                        />
                      </div>

                      {/* Stats grid */}
                      <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100 text-xs">
                        <div>
                          <div className="text-slate-400 font-medium">Conducted Classes</div>
                          <div className="font-bold text-slate-800 text-sm mt-0.5">{b.conductedLectures} / {b.totalLectures}</div>
                        </div>
                        <div>
                          <div className="text-slate-400 font-medium">Active Students</div>
                          <div className="font-bold text-slate-800 text-sm mt-0.5">{b.enrolledStudents} students</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full text-xs font-semibold cursor-pointer hover:bg-slate-100 text-blue-700"
                        onClick={() => {
                          setHistoryBatchFilter(String(b.batchId));
                          setActiveTab('history');
                        }}
                      >
                        View Batch History →
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-12 text-center border border-slate-200 rounded-2xl bg-white">
              <Layers className="mx-auto text-slate-300 mb-3" size={40} />
              <h3 className="font-bold text-slate-800 text-base">No Batch Summaries Available</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Batch attendance averages will appear as you take student attendance for your classes.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* TAB 4: LOW ATTENDANCE ALERTS */}
      {activeTab === 'low_attendance' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="text-amber-500" size={20} />
                Low Attendance Defaulters (&lt; 75%)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Students below minimum academic attendance requiring teacher follow-up</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchLowAttendanceAlerts}
              className="text-xs font-semibold cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw size={13} className={loadingAlerts ? 'animate-spin' : ''} /> Refresh
            </Button>
          </div>

          {loadingAlerts ? (
            <div className="py-24 text-center">
              <div className="animate-spin inline-block w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mb-3" />
              <div className="font-semibold text-slate-600">Scanning attendance defaulters...</div>
            </div>
          ) : lowAttendanceAlerts.length > 0 ? (
            <Card className="border border-slate-200 rounded-2xl shadow-2xs bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-5 py-3.5">Student</th>
                      <th className="px-4 py-3.5">Roll Code</th>
                      <th className="px-4 py-3.5">Batch</th>
                      <th className="px-4 py-3.5">Contact</th>
                      <th className="px-4 py-3.5 text-center">Attendance %</th>
                      <th className="px-5 py-3.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {paginatedAlerts.map((st) => {
                      const isCritical = st.attendancePct < 50;
                      const initials = st.fullName
                        ? st.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                        : 'ST';

                      return (
                        <tr key={st.studentId} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                                {initials}
                              </div>
                              <div className="font-bold text-slate-900 leading-snug">
                                {st.fullName}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <span className="font-mono text-xs font-semibold px-2 py-1 bg-slate-100 rounded text-slate-700 border border-slate-200/60">
                              {st.studentCode}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <span className="text-xs font-bold text-blue-700">
                              {st.batchName}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            {st.mobile ? (
                              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                                <Phone size={12} className="text-slate-400" /> {st.mobile}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>

                          <td className="px-4 py-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border ${
                              isCritical
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {st.attendancePct.toFixed(1)}% ({st.attendedLectures}/{st.totalLectures})
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                              isCritical ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {isCritical ? 'Critical Defaulter' : 'Warning Alert'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {lowAttendanceAlerts.length > 0 && (
                <Pagination
                  currentPage={alertsPage}
                  totalPages={totalAlertsPages}
                  totalItems={totalAlertsItems}
                  pageSize={alertsPageSize}
                  onPageChange={setAlertsPage}
                  onPageSizeChange={setAlertsPageSize}
                />
              )}
            </Card>
          ) : (
            <Card className="p-12 text-center border border-slate-200 rounded-2xl bg-white">
              <CheckCircle2 className="mx-auto text-emerald-500 mb-3" size={40} />
              <h3 className="font-bold text-slate-800 text-base">No Defaulters Found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Great job! All students in your assigned batches currently have attendance rates of 75% or higher.
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
