import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import {
  Calendar as CalendarIcon, MapPin, Clock, CheckCircle2, ChevronLeft, ChevronRight,
  Download, MessageSquare, AlertCircle, RefreshCw,
  Layers, Award, CheckCircle, Eye, Trash2, Plus, Info, Save, ShieldAlert, Check, X,
  CalendarPlus, Send
} from 'lucide-react';
import { TimetableGrid } from '../../features/scheduler/components/TimetableGrid';
import type { Lecture } from '../../features/scheduler/types/scheduler';
import {
  teacherScheduleApi,
  type TeacherScheduleLecture,
  type TeacherScheduleOptions,
  type AcademicEvent,
  type ScheduleChangeItem,
  type WeeklyAvailabilityDay,
  type UnavailableDateException,
  type TeacherLeaveRequestItem
} from '../../services/teacherScheduleApi';
import { lectureRequestApi } from '../../services/lectureRequestApi';
import { RequestChangeModal } from './RequestChangeModal';
import type { ScheduleChange } from '../../types';

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

const getMondayOfWeek = (d: Date): Date => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};

const timeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
};

const formatDisplayTime = (timeStr?: string | null): string => {
  if (!timeStr) return '--:--';
  const clean = timeStr.slice(0, 5);
  const parts = clean.split(':');
  if (parts.length < 2) return timeStr;
  let h = parseInt(parts[0], 10);
  const m = parts[1];
  if (isNaN(h)) return timeStr;
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${period}`;
};

const formatHourLabel = (hour: number): string => {
  const period = hour >= 12 && hour < 24 ? 'PM' : 'AM';
  const displayH = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayH}:00 ${period}`;
};

export const TeacherSchedule: React.FC = () => {
  const { currentUser, addToast } = useApp();
  const navigate = useNavigate();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'events' | 'changes' | 'availability'>('today');

  // Availability State
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [savingWeekly, setSavingWeekly] = useState(false);
  const [addingException, setAddingException] = useState(false);
  const [weeklyAvailability, setWeeklyAvailability] = useState<WeeklyAvailabilityDay[]>([
    { dayOfWeek: 1, dayName: 'Monday', isAvailable: true, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 2, dayName: 'Tuesday', isAvailable: true, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 3, dayName: 'Wednesday', isAvailable: true, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 4, dayName: 'Thursday', isAvailable: true, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 5, dayName: 'Friday', isAvailable: true, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 6, dayName: 'Saturday', isAvailable: true, startTime: '09:00', endTime: '14:00' },
    { dayOfWeek: 7, dayName: 'Sunday', isAvailable: false, startTime: '09:00', endTime: '17:00' }
  ]);
  const [dateExceptions, setDateExceptions] = useState<UnavailableDateException[]>([]);

  // Filter out system leave-generated blocks from manual blocked time slots list
  const manualDateExceptions = useMemo(() => {
    return dateExceptions.filter(exc => !exc.reason?.startsWith('[Leave:'));
  }, [dateExceptions]);

  // Leave Requests State
  const [leaveRequests, setLeaveRequests] = useState<TeacherLeaveRequestItem[]>([]);
  const [loadingLeaveRequests, setLoadingLeaveRequests] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [availabilityActionTab, setAvailabilityActionTab] = useState<'leave' | 'slot'>('leave');

  // Leave Form State
  const [leaveStartDate, setLeaveStartDate] = useState(() => formatLocalDate(new Date()));
  const [leaveEndDate, setLeaveEndDate] = useState(() => formatLocalDate(new Date()));
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveDayType, setLeaveDayType] = useState<'full' | 'first_half' | 'second_half'>('full');

  // New Exception Form State
  const [newExcDate, setNewExcDate] = useState(() => formatLocalDate(new Date()));
  const [newExcStartTime, setNewExcStartTime] = useState('09:00');
  const [newExcEndTime, setNewExcEndTime] = useState('18:00');
  const [newExcAllDay, setNewExcAllDay] = useState(false);
  const [newExcReason, setNewExcReason] = useState('Personal Leave');

  const fetchAvailability = useCallback(async () => {
    setAvailabilityLoading(true);
    try {
      const res = await teacherScheduleApi.getAvailability();
      if (res?.weekly?.length) {
        setWeeklyAvailability(res.weekly);
      }
      if (res?.exceptions) {
        setDateExceptions(res.exceptions);
      }
    } catch (err) {
      console.error('Failed to load teacher availability:', err);
    } finally {
      setAvailabilityLoading(false);
    }
  }, []);

  const fetchLeaveRequests = useCallback(async () => {
    setLoadingLeaveRequests(true);
    try {
      const res = await teacherScheduleApi.getLeaveRequests();
      setLeaveRequests(res || []);
    } catch (err) {
      console.error('Failed to load leave requests:', err);
    } finally {
      setLoadingLeaveRequests(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'availability') {
      fetchAvailability();
      fetchLeaveRequests();
    }
  }, [activeTab, fetchAvailability, fetchLeaveRequests]);

  const handleCreateLeaveRequest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!leaveStartDate || !leaveEndDate) {
      addToast('Please select start and end dates', 'error');
      return;
    }
    if (leaveStartDate > leaveEndDate) {
      addToast('Start date cannot be after end date', 'error');
      return;
    }
    if (!leaveReason.trim()) {
      addToast('Please provide a reason for the leave', 'error');
      return;
    }

    setSubmittingLeave(true);
    try {
      const formattedReason = leaveDayType !== 'full'
        ? `[${leaveDayType === 'first_half' ? 'First Half' : 'Second Half'}] ${leaveReason.trim()}`
        : leaveReason.trim();

      await teacherScheduleApi.createLeaveRequest({
        startDate: leaveStartDate,
        endDate: leaveEndDate,
        leaveType,
        reason: formattedReason
      });

      addToast('Leave request submitted successfully!', 'success');
      setIsLeaveModalOpen(false);
      setLeaveReason('');
      fetchLeaveRequests();
      fetchAvailability();
    } catch (err: any) {
      addToast(err?.message || 'Failed to submit leave request', 'error');
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleCancelLeaveRequest = async (id: number | string) => {
    try {
      await teacherScheduleApi.cancelLeaveRequest(id);
      addToast('Leave request cancelled', 'success');
      setLeaveRequests(prev => prev.filter(l => l.id !== id));
      fetchAvailability();
    } catch (err: any) {
      addToast(err?.message || 'Failed to cancel leave request', 'error');
    }
  };

  const handleSaveWeeklyHours = async () => {
    setSavingWeekly(true);
    try {
      const res = await teacherScheduleApi.saveWeeklyAvailability(weeklyAvailability);
      if (res?.weekly) setWeeklyAvailability(res.weekly);
      addToast('Weekly teaching hours updated successfully!', 'success');
    } catch (err: any) {
      addToast(err?.message || 'Failed to save weekly hours.', 'error');
    } finally {
      setSavingWeekly(false);
    }
  };

  const handleAddException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExcDate) {
      addToast('Please select a date', 'error');
      return;
    }
    setAddingException(true);
    try {
      await teacherScheduleApi.addUnavailableException({
        specificDate: newExcDate,
        startTime: newExcAllDay ? '00:00' : newExcStartTime,
        endTime: newExcAllDay ? '23:59' : newExcEndTime,
        reason: newExcReason || 'Unavailable'
      });
      addToast('Unavailable date block added successfully!', 'success');
      fetchAvailability();
      setNewExcReason('Personal Leave');
    } catch (err: any) {
      addToast(err?.message || 'Failed to add date exception', 'error');
    } finally {
      setAddingException(false);
    }
  };

  const handleDeleteException = async (id: number | string) => {
    try {
      await teacherScheduleApi.deleteAvailability(id);
      addToast('Unavailable block removed', 'success');
      setDateExceptions(prev => prev.filter(e => e.id !== id));
    } catch (err: any) {
      addToast(err?.message || 'Failed to remove slot', 'error');
    }
  };

  // Loading States
  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);

  // Scoped Options from Backend API
  const [options, setOptions] = useState<TeacherScheduleOptions | null>(null);

  // Filter States
  const [filterYear, setFilterYear] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [filterCourse, setFilterCourse] = useState('All');
  const [filterProgram, setFilterProgram] = useState('All');
  const [filterLevel, setFilterLevel] = useState('All');
  const [filterBatch, setFilterBatch] = useState('All');

  // Date States
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedWeekMonday, setSelectedWeekMonday] = useState<Date>(() => getMondayOfWeek(new Date()));
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Live clock tick
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Data States
  const [todayLectures, setTodayLectures] = useState<TeacherScheduleLecture[]>([]);
  const [weekLectures, setWeekLectures] = useState<TeacherScheduleLecture[]>([]);
  const [academicEvents, setAcademicEvents] = useState<AcademicEvent[]>([]);
  const [scheduleChanges, setScheduleChanges] = useState<ScheduleChangeItem[]>([]);

  // Modals
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestPrefillLecture, setRequestPrefillLecture] = useState<any>(null);
  const [selectedGridLecture, setSelectedGridLecture] = useState<TeacherScheduleLecture | null>(null);
  const [selectedRequestDetail, setSelectedRequestDetail] = useState<any | null>(null);
  const [loadingRequestDetail, setLoadingRequestDetail] = useState(false);

  const handleViewRequestDetail = async (chg: ScheduleChangeItem) => {
    setLoadingRequestDetail(true);
    setSelectedRequestDetail(chg);
    try {
      const numId = parseInt(String(chg.id).replace(/\D/g, ''), 10);
      if (numId) {
        const fullDetail = await lectureRequestApi.getRequestById(numId);
        if (fullDetail) {
          setSelectedRequestDetail(fullDetail);
        }
      }
    } catch (err) {
      console.warn('Could not load full request details, using basic info:', err);
    } finally {
      setLoadingRequestDetail(false);
    }
  };

  // Fetch filter options on mount
  const fetchOptions = useCallback(async () => {
    setOptionsLoading(true);
    try {
      const data = await teacherScheduleApi.getOptions();
      setOptions(data);
      if (data.branches?.length === 1) {
        setFilterBranch(String(data.branches[0].id));
      }
    } catch (err) {
      console.warn('Could not load teacher schedule options:', err);
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  // Derived Cascading Dropdowns
  const availableCourses = useMemo(() => {
    if (!options?.courses) return [];
    return options.courses.map(c => c.name);
  }, [options]);

  const selectedCourseObj = useMemo(() => {
    if (!options?.courses || filterCourse === 'All') return null;
    return options.courses.find(c => c.name === filterCourse) || null;
  }, [options, filterCourse]);

  const availablePrograms = useMemo(() => {
    if (!options?.programs) return [];
    if (!selectedCourseObj) return Array.from(new Set(options.programs.map(p => p.name)));
    return options.programs.filter(p => p.course_id === selectedCourseObj.id).map(p => p.name);
  }, [options, selectedCourseObj]);

  const selectedProgramObj = useMemo(() => {
    if (!options?.programs || filterProgram === 'All') return null;
    return options.programs.find(p => p.name === filterProgram) || null;
  }, [options, filterProgram]);

  const availableLevels = useMemo(() => {
    if (!options?.levels) return [];
    if (!selectedProgramObj) return Array.from(new Set(options.levels.map(l => l.name)));
    return options.levels.filter(l => l.program_id === selectedProgramObj.id).map(l => l.name);
  }, [options, selectedProgramObj]);

  const availableBatches = useMemo(() => {
    if (!options?.batches) return [];
    return options.batches;
  }, [options]);

  // Load Schedule Data depending on active tab
  const loadTabSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const selectedBatchId = filterBatch !== 'All' ? filterBatch : undefined;
      const selectedBranchId = filterBranch !== 'All' ? filterBranch : undefined;

      if (activeTab === 'today') {
        const dateStr = formatLocalDate(selectedDate);
        const res = await teacherScheduleApi.getToday(dateStr, {
          batchId: selectedBatchId,
          branchId: selectedBranchId
        });
        setTodayLectures(res.lectures || []);
      } else if (activeTab === 'week') {
        const startStr = formatLocalDate(selectedWeekMonday);
        const endD = new Date(selectedWeekMonday);
        endD.setDate(endD.getDate() + 6);
        const endStr = formatLocalDate(endD);

        const res = await teacherScheduleApi.getWeek(startStr, endStr, {
          batchId: selectedBatchId,
          branchId: selectedBranchId,
          courseId: filterCourse !== 'All' ? filterCourse : undefined,
          levelId: filterLevel !== 'All' ? filterLevel : undefined
        });
        setWeekLectures(res.lectures || []);
      } else if (activeTab === 'events') {
        const res = await teacherScheduleApi.getAcademicEvents(selectedBranchId);
        setAcademicEvents(res || []);
      } else if (activeTab === 'changes') {
        const res = await teacherScheduleApi.getChanges();
        setScheduleChanges(res || []);
      }
    } catch (err) {
      console.error('Failed to load teacher schedule data:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedDate, selectedWeekMonday, filterBatch, filterBranch, filterCourse, filterLevel]);

  useEffect(() => {
    loadTabSchedule();
  }, [loadTabSchedule]);

  // ── TODAY TAB: INTELLIGENT HUD COMPUTATIONS ──
  const isDateToday = useMemo(() => {
    return formatLocalDate(selectedDate) === formatLocalDate(new Date());
  }, [selectedDate]);

  const sortedTodayLectures = useMemo(() => {
    return [...todayLectures].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }, [todayLectures]);

  const nowMinutes = useMemo(() => {
    return currentTime.getHours() * 60 + currentTime.getMinutes();
  }, [currentTime]);

  const activeLectureStatus = useMemo(() => {
    if (!isDateToday) {
      return { live: null, upNext: null };
    }

    const live = sortedTodayLectures.find(l => {
      const s = timeToMinutes(l.startTime);
      const e = timeToMinutes(l.endTime);
      return nowMinutes >= s && nowMinutes < e;
    }) || null;

    const upNext = sortedTodayLectures.find(l => {
      const s = timeToMinutes(l.startTime);
      return s > nowMinutes;
    }) || null;

    return { live, upNext };
  }, [isDateToday, sortedTodayLectures, nowMinutes]);

  const getLectureLiveState = useCallback((lecture: TeacherScheduleLecture) => {
    const s = timeToMinutes(lecture.startTime);
    const e = timeToMinutes(lecture.endTime);

    if (!isDateToday) {
      const isPast = selectedDate < new Date(new Date().setHours(0, 0, 0, 0));
      return isPast ? 'COMPLETED' : 'LATER';
    }

    if (nowMinutes >= e) return 'COMPLETED';
    if (nowMinutes >= s && nowMinutes < e) return 'LIVE';
    if (activeLectureStatus.upNext?.id === lecture.id) return 'UP_NEXT';
    return 'LATER';
  }, [isDateToday, selectedDate, nowMinutes, activeLectureStatus]);

  const timelineBounds = useMemo(() => {
    if (sortedTodayLectures.length === 0) {
      return { startMin: 420, endMin: 1080, totalDuration: 660, hours: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] };
    }

    const firstClassStart = Math.min(...sortedTodayLectures.map(l => timeToMinutes(l.startTime)));
    const lastClassEnd = Math.max(...sortedTodayLectures.map(l => timeToMinutes(l.endTime)));

    const startHour = Math.max(6, Math.min(8, Math.floor(firstClassStart / 60) - 1));
    const endHour = Math.min(22, Math.max(17, Math.ceil(lastClassEnd / 60) + 1));

    const startMin = startHour * 60;
    const endMin = endHour * 60;
    const totalDuration = endMin - startMin;

    const hours = [];
    for (let h = startHour; h <= endHour; h++) {
      hours.push(h);
    }

    return { startMin, endMin, totalDuration, hours };
  }, [sortedTodayLectures]);

  // Map Week Lectures into Lecture format for TimetableGrid
  const gridLectures: Lecture[] = useMemo(() => {
    return weekLectures.map(l => {
      const isOverride = l.type === 'SUBSTITUTION';
      let mappedLectureType: any = l.lectureType || 'Regular';
      if (l.type === 'LAB') mappedLectureType = 'Lab';
      else if (l.type === 'ACTIVITY') mappedLectureType = 'Activity';
      else if (l.type === 'BREAK') mappedLectureType = 'Break';

      return {
        id: String(l.id),
        branchId: String(l.branch?.id || ''),
        academicYearId: '1',
        batchId: String(l.batch?.id || ''),
        batchName: l.batch?.name || '',
        batchCode: l.batch?.code || '',
        subjectId: String(l.subject?.id || ''),
        subjectName: l.subject?.name || '',
        subjectCode: l.subject?.code || '',
        teacherId: String(currentUser?.id || ''),
        teacherName: currentUser?.name || 'Faculty',
        roomId: String(l.classroom?.id || ''),
        roomName: l.classroom?.name || '',
        roomNumber: l.classroom?.roomNumber || '',
        date: l.date || '',
        startTime: l.startTime,
        endTime: l.endTime,
        activityType: (l.type === 'BREAK' ? 'Break' : 'Lecture') as any,
        lectureType: mappedLectureType,
        slotLabel: l.slotLabel,
        topic: l.topic,
        publishStatus: 'PUBLISHED',
        status: (l.status as any) || 'SCHEDULED',
        isOverride: isOverride,
        createdAt: '',
        updatedAt: ''
      };
    });
  }, [weekLectures, currentUser]);

  // Export Timetable to CSV
  const handleExportCSV = () => {
    if (weekLectures.length === 0) {
      addToast('No lectures scheduled for this week to export.', 'info');
      return;
    }
    const headers = ['Date', 'Day', 'Start Time', 'End Time', 'Subject', 'Topic', 'Batch', 'Level', 'Room', 'Branch', 'Type'];
    const rows = weekLectures.map(l => [
      l.date || '',
      l.day || '',
      l.startTime,
      l.endTime,
      `"${l.subject.name}"`,
      `"${l.topic || ''}"`,
      `"${l.batch.name}"`,
      `"${l.level.name}"`,
      `"${l.classroom.name}"`,
      `"${l.branch.name}"`,
      l.type
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Teacher_Timetable_Week_${formatLocalDate(selectedWeekMonday)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Timetable exported successfully.', 'success');
  };

  // Helper Badge Renderers
  const getTypeBadge = (type: TeacherScheduleLecture['type']) => {
    switch (type) {
      case 'LAB':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            LAB
          </span>
        );
      case 'BREAK':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            BREAK
          </span>
        );
      case 'SUBSTITUTION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            SUBSTITUTION
          </span>
        );
      case 'ACTIVITY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
            ACTIVITY
          </span>
        );
      case 'LECTURE':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            LECTURE
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── 1. PAGE HEADER (Big & Bold Title) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 shadow-2xs">
            <CalendarIcon className="w-7 h-7 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Academic Schedule</h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Daily operational agenda, weekly timetable, and roll-call attendance</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchOptions().then(() => loadTabSchedule())}
            className="text-xs font-semibold text-slate-700 hover:text-blue-600 hover:border-blue-200 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin text-blue-600' : ''}`} /> Refresh Schedule
          </Button>
        </div>
      </div>

      {/* ── 2. TAB ROW ── */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex space-x-1 sm:space-x-2">
          <button
            onClick={() => setActiveTab('today')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'today'
                ? 'border-blue-600 text-blue-700 bg-blue-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Clock className="w-4 h-4" /> TODAY
          </button>
          <button
            onClick={() => setActiveTab('week')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'week'
                ? 'border-blue-600 text-blue-700 bg-blue-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <CalendarIcon className="w-4 h-4" /> WEEK
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'events'
                ? 'border-blue-600 text-blue-700 bg-blue-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Award className="w-4 h-4" /> ACADEMIC EVENTS
          </button>
          <button
            onClick={() => setActiveTab('changes')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'changes'
                ? 'border-blue-600 text-blue-700 bg-blue-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <MessageSquare className="w-4 h-4" /> CHANGES
            {scheduleChanges.filter(c => c.status === 'Pending Approval').length > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full ml-0.5">
                {scheduleChanges.filter(c => c.status === 'Pending Approval').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('availability')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'availability'
                ? 'border-blue-600 text-blue-700 bg-blue-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <CalendarIcon className="w-4 h-4 text-emerald-600" /> MY AVAILABILITY
            {manualDateExceptions.length > 0 && (
              <span className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full ml-0.5">
                {manualDateExceptions.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'week' && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            className="text-xs font-semibold text-slate-700 hover:text-blue-600 mb-1"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-blue-600" /> Export Timetable
          </Button>
        )}
      </div>

      {/* ── 3. TAB 1: TODAY VIEW (Dynamic Split-HUD + Horizontal Flight Path) ── */}
      {activeTab === 'today' && (
        <div className="space-y-6 animate-fade-in">
          {/* Centered Date Controller */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const prev = new Date(selectedDate);
                prev.setDate(prev.getDate() - 1);
                setSelectedDate(prev);
              }}
              className="text-slate-600 hover:bg-slate-100 font-semibold"
            >
              <ChevronLeft className="w-4 h-4 mr-1 text-slate-500" /> Previous Day
            </Button>

            <div className="flex items-center gap-3">
              <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
                {formatDisplayDate(selectedDate)}
              </span>
              {formatLocalDate(selectedDate) !== formatLocalDate(new Date()) && (
                <button
                  onClick={() => {
                    setSelectedDate(new Date());
                  }}
                  className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md hover:bg-blue-100 transition-colors shadow-2xs"
                >
                  Jump to Today
                </button>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const next = new Date(selectedDate);
                next.setDate(next.getDate() + 1);
                setSelectedDate(next);
              }}
              className="text-slate-600 hover:bg-slate-100 font-semibold"
            >
              Next Day <ChevronRight className="w-4 h-4 ml-1 text-slate-500" />
            </Button>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-xs">
              <div className="inline-block animate-spin rounded-full h-9 w-9 border-b-2 border-blue-600 mb-3" />
              <p className="text-sm font-medium text-slate-500">Loading today's schedule agenda...</p>
            </div>
          ) : todayLectures.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center space-y-3">
              <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto border border-slate-100 shadow-2xs">
                <CalendarIcon className="w-7 h-7 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No Lectures Scheduled for Today</h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                You have no teaching lectures scheduled for {formatDisplayDate(selectedDate)}. Check the weekly view for the full schedule.
              </p>
            </div>
          ) : (
            <>
              {/* ── ZONE 1 (TOP): YOUR DAY AT A GLANCE (Ultra-Premium Horizontal Flight Path) ── */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
                {/* Flight Path Top Header Bar */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shadow-2xs">
                      <Layers className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                          YOUR DAY AT A GLANCE
                        </h3>
                        <span className="bg-blue-50 text-blue-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-blue-200/60 uppercase tracking-wider">
                          {sortedTodayLectures.length} {sortedTodayLectures.length === 1 ? 'Class' : 'Classes'} Today
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">Interactive timeline & flight path — click any period to view details & actions</p>
                    </div>
                  </div>

                  {/* Legend Bar & Stats */}
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-xs font-semibold text-slate-600 bg-slate-50/90 px-3.5 py-1.5 rounded-xl border border-slate-200/80">
                    <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" /> Live Now
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1.5 text-blue-700">
                      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Up Next
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" /> Completed
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1.5 text-amber-700">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Substitution
                    </span>
                  </div>
                </div>

                {/* Timeline Rail Container */}
                <div className="overflow-x-auto pb-4 pt-1">
                  <div
                    className="px-10"
                    style={{ minWidth: `${Math.max(1260, (timelineBounds.hours.length - 1) * 140 + 80)}px` }}
                  >
                    <div className="relative">
                      {/* 1. Time Axis Header Row */}
                      <div className="relative h-8 border-b border-slate-200/90 flex items-center select-none">
                        {timelineBounds.hours.map(hour => {
                          const percent = ((hour * 60 - timelineBounds.startMin) / timelineBounds.totalDuration) * 100;
                          return (
                            <div
                              key={hour}
                              className="absolute -translate-x-1/2 flex flex-col items-center select-none z-10"
                              style={{ left: `${percent}%` }}
                            >
                              <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                                {formatHourLabel(hour)}
                              </span>
                              <span className="w-0.5 h-2 bg-slate-300 mt-0.5" />
                            </div>
                          );
                        })}
                      </div>

                      {/* 2. Timeline Grid & Flight Path Lane */}
                      <div className="relative min-h-[170px] my-3 rounded-2xl bg-gradient-to-b from-slate-50/90 to-slate-100/60 border border-slate-200/90 p-3 pt-4 overflow-hidden shadow-inner">
                        {/* Background Vertical Hour Grid Lines */}
                        {timelineBounds.hours.map(hour => {
                          const percent = ((hour * 60 - timelineBounds.startMin) / timelineBounds.totalDuration) * 100;
                          return (
                            <div
                              key={`grid-${hour}`}
                              className="absolute top-0 bottom-0 border-r border-slate-200/60 pointer-events-none"
                              style={{ left: `${percent}%` }}
                            />
                          );
                        })}

                        {/* Real-time "NOW" Vertical Indicator Line */}
                        {isDateToday && nowMinutes >= timelineBounds.startMin && nowMinutes <= timelineBounds.endMin && (
                          <div
                            className="absolute top-0 bottom-0 z-20 pointer-events-none flex flex-col items-center"
                            style={{
                              left: `${((nowMinutes - timelineBounds.startMin) / timelineBounds.totalDuration) * 100}%`
                            }}
                          >
                            <span className="bg-rose-600 text-white font-black text-[9px] px-2 py-0.5 rounded-full shadow-md mt-1 tracking-wider uppercase ring-2 ring-white">
                              NOW
                            </span>
                            <div className="w-0.5 flex-1 bg-gradient-to-b from-rose-500 to-rose-600 shadow-sm mt-0.5" />
                          </div>
                        )}

                        {/* Free Period Gaps (Empty spaces between classes) */}
                        {sortedTodayLectures.map((lec, idx) => {
                          if (idx === sortedTodayLectures.length - 1) return null;
                          const nextLec = sortedTodayLectures[idx + 1];
                          const gapStart = timeToMinutes(lec.endTime);
                          const gapEnd = timeToMinutes(nextLec.startTime);
                          const gapDuration = gapEnd - gapStart;

                          if (gapDuration < 20) return null;

                          const leftPct = ((gapStart - timelineBounds.startMin) / timelineBounds.totalDuration) * 100;
                          const widthPct = (gapDuration / timelineBounds.totalDuration) * 100;

                          return (
                            <div
                              key={`gap-${idx}`}
                              className="absolute top-3 bottom-3 rounded-xl border border-dashed border-slate-300 bg-white/60 backdrop-blur-2xs flex items-center justify-center text-center p-2 transition-all hover:bg-white/80 shadow-2xs"
                              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                            >
                              <span className="text-[10px] font-extrabold text-slate-400 tracking-tight select-none">
                                Free Gap • {gapDuration}m
                              </span>
                            </div>
                          );
                        })}

                        {/* Class Blocks */}
                        {sortedTodayLectures.map(lecture => {
                          const state = getLectureLiveState(lecture);
                          const sMin = timeToMinutes(lecture.startTime);
                          const eMin = timeToMinutes(lecture.endTime);
                          const duration = eMin - sMin;

                          const leftPct = ((sMin - timelineBounds.startMin) / timelineBounds.totalDuration) * 100;
                          const widthPct = (duration / timelineBounds.totalDuration) * 100;
                          const isSub = lecture.type === 'SUBSTITUTION';
                          const isLab = lecture.type === 'LAB';

                          return (
                            <div
                              key={lecture.id}
                              onClick={() => setSelectedGridLecture(lecture)}
                              className={`absolute top-2.5 bottom-2.5 rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-colors z-10 select-none shadow-xs hover:border-slate-300 ${
                                state === 'COMPLETED'
                                  ? 'bg-slate-50/95 border border-slate-200/90 text-slate-700'
                                  : state === 'LIVE'
                                  ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/70 border-2 border-emerald-500 text-emerald-950 shadow-emerald-500/15'
                                  : state === 'UP_NEXT'
                                  ? 'bg-gradient-to-br from-blue-50 to-blue-100/70 border-2 border-blue-500 text-blue-950 shadow-blue-500/15'
                                  : isSub
                                  ? 'bg-gradient-to-br from-amber-50 to-amber-100/70 border-2 border-amber-400 text-amber-950'
                                  : isLab
                                  ? 'bg-gradient-to-br from-blue-50/80 to-white border border-blue-200 text-slate-800'
                                  : 'bg-white border border-slate-200/90 text-slate-800'
                              }`}
                              style={{
                                left: `${leftPct}%`,
                                width: `${widthPct}%`
                              }}
                            >
                              {/* Top Metric Header: Status Pill & Dot */}
                              <div className="flex items-center justify-between gap-1">
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                  state === 'LIVE'
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : state === 'UP_NEXT'
                                    ? 'bg-blue-600 text-white shadow-2xs'
                                    : state === 'COMPLETED'
                                    ? 'bg-slate-200 text-slate-700'
                                    : isSub
                                    ? 'bg-amber-200 text-amber-900'
                                    : 'bg-slate-200/80 text-slate-700'
                                }`}>
                                  {state === 'LIVE' ? 'LIVE NOW' : state === 'UP_NEXT' ? 'UP NEXT' : state === 'COMPLETED' ? 'COMPLETED' : isSub ? 'PROXY' : 'LATER'}
                                </span>

                                {isSub && (
                                  <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">
                                    Sub
                                  </span>
                                )}
                              </div>

                              {/* 4 Core Metrics: Subject, Batch, Room, Timing */}
                              <div className="my-1">
                                {/* 1. Subject */}
                                <div className="font-extrabold text-xs sm:text-sm text-slate-900 truncate leading-snug" title={lecture.subject.name}>
                                  {lecture.subject.name}
                                </div>
                                {/* 2. Batch */}
                                <div className="text-[11px] font-bold text-blue-700 truncate leading-tight mt-0.5" title={lecture.batch.name}>
                                  {lecture.batch.name}
                                </div>
                                {/* 3. Room */}
                                <div className="text-[10px] text-slate-500 truncate flex items-center gap-1 mt-0.5" title={lecture.classroom.name}>
                                  <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                  <span className="truncate">{lecture.classroom.name}</span>
                                </div>
                              </div>

                              {/* 4. Timing */}
                              <div className="text-[10px] sm:text-[10.5px] font-bold text-slate-800 bg-slate-100/90 px-2 py-1 rounded-md border border-slate-200/80 mt-1 flex items-center justify-between gap-1.5 w-full min-w-0 overflow-hidden">
                                <span className="flex items-center gap-1.5 whitespace-nowrap min-w-0 truncate">
                                  <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                                  <span className="truncate">{formatDisplayTime(lecture.startTime)} – {formatDisplayTime(lecture.endTime)}</span>
                                </span>
                                {state === 'COMPLETED' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                                {state === 'LIVE' && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── 4. TAB 2: WEEK VIEW (Detailed 7-Day Timetable Grid Reusing Admin Components) ── */}
      {activeTab === 'week' && (
        <div className="space-y-4 animate-fade-in">
          {/* Week Filter Bar: Academic Year, Branch, Course, Program, Level, Batch */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Timetable Filters</span>
              {(filterCourse !== 'All' || filterProgram !== 'All' || filterLevel !== 'All' || filterBatch !== 'All') && (
                <button
                  onClick={() => {
                    setFilterCourse('All');
                    setFilterProgram('All');
                    setFilterLevel('All');
                    setFilterBatch('All');
                  }}
                  className="text-xs text-blue-600 hover:underline font-semibold"
                >
                  Reset Filters
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <div>
                <Select
                  label="Academic Year"
                  value={filterYear}
                  onChange={e => setFilterYear(e.target.value)}
                  options={[{ value: 'All', label: 'All Years' }, ...(options?.academicYears || []).map(y => ({ value: String(y.id), label: y.name }))]}
                />
              </div>
              <div>
                <Select
                  label="Branch"
                  value={filterBranch}
                  onChange={e => {
                    setFilterBranch(e.target.value);
                    setFilterCourse('All');
                    setFilterProgram('All');
                    setFilterLevel('All');
                    setFilterBatch('All');
                  }}
                  options={[
                    ...(options?.branches && options.branches.length > 1 ? [{ value: 'All', label: 'All Branches' }] : []),
                    ...(options?.branches || []).map(b => ({ value: String(b.id), label: b.name }))
                  ]}
                  disabled={options?.branches?.length === 1}
                />
              </div>
              <div>
                <Select
                  label="Course"
                  value={filterCourse}
                  onChange={e => {
                    setFilterCourse(e.target.value);
                    setFilterProgram('All');
                    setFilterLevel('All');
                    setFilterBatch('All');
                  }}
                  options={[{ value: 'All', label: 'All Courses' }, ...availableCourses.map(c => ({ value: c, label: c }))]}
                />
              </div>
              <div>
                <Select
                  label="Program"
                  value={filterProgram}
                  onChange={e => {
                    setFilterProgram(e.target.value);
                    setFilterLevel('All');
                    setFilterBatch('All');
                  }}
                  options={[{ value: 'All', label: 'All Programs' }, ...availablePrograms.map(p => ({ value: p, label: p }))]}
                  disabled={filterCourse === 'All' && availablePrograms.length === 0}
                />
              </div>
              <div>
                <Select
                  label="Level"
                  value={filterLevel}
                  onChange={e => {
                    setFilterLevel(e.target.value);
                    setFilterBatch('All');
                  }}
                  options={[{ value: 'All', label: 'All Levels' }, ...availableLevels.map(l => ({ value: l, label: l }))]}
                  disabled={filterProgram === 'All' && availableLevels.length === 0}
                />
              </div>
              <div>
                <Select
                  label="Batch"
                  value={filterBatch}
                  onChange={e => setFilterBatch(e.target.value)}
                  options={[
                    { value: 'All', label: 'All My Batches' },
                    ...availableBatches.map(b => ({ value: String(b.id), label: b.name }))
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Current Week Schedule Header Bar with Date Navigator & Export */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-3">
            <div className="flex items-center gap-3">
              <h3 className="text-base sm:text-lg font-bold text-slate-800 uppercase tracking-wide">Current Week Schedule</h3>
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-2 py-1 hover:bg-white"
                  onClick={() => {
                    const d = new Date(selectedWeekMonday);
                    d.setDate(d.getDate() - 7);
                    setSelectedWeekMonday(d);
                  }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs sm:text-sm font-semibold text-slate-700 min-w-[130px] text-center">
                  {selectedWeekMonday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {(() => {
                    const end = new Date(selectedWeekMonday);
                    end.setDate(end.getDate() + 6);
                    return end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  })()}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-2 py-1 hover:bg-white"
                  onClick={() => {
                    const d = new Date(selectedWeekMonday);
                    d.setDate(d.getDate() + 7);
                    setSelectedWeekMonday(d);
                  }}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportCSV}
                className="cursor-pointer text-xs font-semibold"
              >
                <Download className="w-4 h-4 mr-1.5 text-blue-600" /> Export
              </Button>
            </div>
          </div>

          {/* Shared Admin TimetableGrid */}
          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3" />
              <p className="text-sm font-medium text-slate-500">Loading weekly timetable...</p>
            </div>
          ) : (
            <TimetableGrid
              lectures={gridLectures}
              viewMode="week"
              onEditLecture={(l) => {
                const orig = weekLectures.find(w => String(w.id) === String(l.id));
                if (orig) {
                  setSelectedGridLecture(orig);
                } else if (l.id) {
                  setSelectedGridLecture({
                    id: l.id,
                    startTime: l.startTime,
                    endTime: l.endTime,
                    type: l.isOverride ? 'SUBSTITUTION' : (l.lectureType === 'Lab' ? 'LAB' : 'LECTURE'),
                    lectureType: l.lectureType || 'Regular',
                    activityType: l.activityType || 'Lecture',
                    subject: { id: Number(l.subjectId || 0), name: l.subjectName || '' },
                    batch: { id: Number(l.batchId || 0), name: l.batchName || '' },
                    level: { id: 0, name: '' },
                    classroom: { id: Number(l.roomId || 0), name: l.roomName || '' },
                    branch: { id: Number(l.branchId || 0), name: '' },
                    status: l.status,
                    date: l.date
                  });
                } else {
                  setRequestPrefillLecture({
                    date: l.date || formatLocalDate(selectedWeekMonday),
                    startTime: '09:00',
                    endTime: '10:30'
                  });
                  setIsRequestModalOpen(true);
                }
              }}
              selectedWeekStart={formatLocalDate(selectedWeekMonday)}
              readOnly={false}
            />
          )}
        </div>
      )}

      {/* ── 5. TAB 3: ACADEMIC EVENTS VIEW ── */}
      {activeTab === 'events' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Academic Calendar Events & Holidays</h3>
              <p className="text-xs text-slate-500">Institute-wide examinations, parent meetings, and official holidays</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {academicEvents.map(evt => (
                <div key={evt.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 hover:shadow-xs transition-all">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      evt.type === 'EXAM' ? 'bg-red-100 text-red-700' : evt.type === 'HOLIDAY' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {evt.type}
                    </span>
                    <span className="text-xs font-medium text-slate-500">{evt.startDate}</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">{evt.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{evt.description}</p>
                  <div className="text-[11px] text-slate-500 pt-1 font-medium flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{evt.venue}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 7. TAB 5: CHANGES VIEW ── */}
      {activeTab === 'changes' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Schedule Change & Proxy Requests</h3>
              <p className="text-xs text-slate-500">Track status of slot reschedules, cancellations, and proxy requests</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setRequestPrefillLecture(null);
                setIsRequestModalOpen(true);
              }}
              className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
            >
              + Request Schedule Change
            </Button>
          </div>

          {scheduleChanges.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No schedule change requests logged.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {scheduleChanges.map((chg, idx) => (
                <div key={chg.id || idx} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 p-2.5 rounded-xl transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {chg.id}
                      </span>
                      <span className="text-xs font-semibold text-slate-700">{chg.date} {chg.time ? `(${chg.time})` : ''}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        chg.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : (chg.status === 'Rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800')
                      }`}>
                        {chg.status}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      {chg.type}: {chg.subject} — {chg.batchName}
                    </div>
                    <p className="text-xs text-slate-500">Reason: {chg.reason}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleViewRequestDetail(chg)}
                      className="text-xs font-semibold text-slate-700 hover:text-blue-600 hover:border-blue-200 shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" /> View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 5. TAB 5: MY AVAILABILITY & WORKING HOURS ── */}
      {activeTab === 'availability' && (
        <div className="space-y-6 animate-fade-in">
          {/* TOP ROW: Weekly Standard Hours & Action Form side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* CARD 1: Weekly Standard Hours */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 flex flex-col justify-between h-full space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900">Weekly Standard Hours</h4>
                  <p className="text-xs text-slate-500 font-medium">Recurring teaching hours applied across your weekly timetable</p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveWeeklyHours}
                  disabled={savingWeekly}
                  className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" /> {savingWeekly ? 'Saving...' : 'Save Hours'}
                </Button>
              </div>

              {availabilityLoading ? (
                <div className="py-12 flex-1 flex justify-center items-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="divide-y divide-slate-100 flex-1 flex flex-col justify-between">
                  {weeklyAvailability.map((slot, idx) => (
                    <div key={slot.dayOfWeek} className="py-2.5 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/70 rounded-xl transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...weeklyAvailability];
                            updated[idx] = { ...updated[idx], isAvailable: !updated[idx].isAvailable };
                            setWeeklyAvailability(updated);
                          }}
                          className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 cursor-pointer ${
                            slot.isAvailable ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                          }`}
                        >
                          <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                        </button>
                        <span className="text-xs font-bold text-slate-800 w-20">
                          {slot.dayName}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          slot.isAvailable ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {slot.isAvailable ? 'Available' : 'Day Off'}
                        </span>
                      </div>

                      {slot.isAvailable ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <input
                            type="time"
                            value={slot.startTime}
                            onChange={(e) => {
                              const updated = [...weeklyAvailability];
                              updated[idx] = { ...updated[idx], startTime: e.target.value };
                              setWeeklyAvailability(updated);
                            }}
                            className="text-xs font-semibold px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <span className="text-xs text-slate-400 font-bold">to</span>
                          <input
                            type="time"
                            value={slot.endTime}
                            onChange={(e) => {
                              const updated = [...weeklyAvailability];
                              updated[idx] = { ...updated[idx], endTime: e.target.value };
                              setWeeklyAvailability(updated);
                            }}
                            className="text-xs font-semibold px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No lectures can be scheduled</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CARD 2: Leave Request & Unavailable Hours Form */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 flex flex-col justify-between h-full space-y-4">
              {/* Segmented Control: Request Leave vs Block Hours */}
              <div className="flex p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAvailabilityActionTab('leave')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    availabilityActionTab === 'leave'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CalendarPlus className="w-3.5 h-3.5 text-blue-600" />
                  Request Leave
                </button>
                <button
                  type="button"
                  onClick={() => setAvailabilityActionTab('slot')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    availabilityActionTab === 'slot'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  Block Hours
                </button>
              </div>

              {availabilityActionTab === 'leave' ? (
                /* ── TAB 1: FORMAL LEAVE REQUEST ── */
                <form onSubmit={handleCreateLeaveRequest} className="flex-1 flex flex-col justify-between text-xs space-y-3.5">
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Leave Type</label>
                      <select
                        value={leaveType}
                        onChange={(e) => setLeaveType(e.target.value)}
                        className="w-full h-9 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all cursor-pointer"
                      >
                        <option value="Casual Leave">Casual Leave</option>
                        <option value="Sick Leave">Sick / Medical Leave</option>
                        <option value="Personal Leave">Personal Leave</option>
                        <option value="Earned Leave">Earned Leave</option>
                        <option value="Emergency Leave">Emergency Leave</option>
                        <option value="Academic Duty (OD)">Academic Duty / On Duty</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Start Date</label>
                        <Input
                          type="date"
                          value={leaveStartDate}
                          onChange={(e) => {
                            setLeaveStartDate(e.target.value);
                            if (e.target.value > leaveEndDate) {
                              setLeaveEndDate(e.target.value);
                            }
                          }}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">End Date</label>
                        <Input
                          type="date"
                          value={leaveEndDate}
                          min={leaveStartDate}
                          onChange={(e) => setLeaveEndDate(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {/* Day Type (Full Day / Half Day) */}
                    <div>
                      <label className="block text-slate-600 font-bold mb-1.5">Duration Type</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'full', label: 'Full Day' },
                          { id: 'first_half', label: 'First Half' },
                          { id: 'second_half', label: 'Second Half' }
                        ].map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => setLeaveDayType(d.id as any)}
                            className={`py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                              leaveDayType === d.id
                                ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-2xs'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Reason for Leave</label>
                      <textarea
                        rows={3}
                        placeholder="State reason for absence (e.g. family event, medical, personal)..."
                        value={leaveReason}
                        onChange={(e) => setLeaveReason(e.target.value)}
                        required
                        className="w-full text-xs font-medium p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all resize-none"
                      />
                    </div>
                  </div>

                  <div className="pt-2 mt-auto">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={submittingLeave}
                      className="w-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5 mr-1" /> {submittingLeave ? 'Submitting Leave...' : 'Submit Leave Request'}
                    </Button>
                  </div>
                </form>
              ) : (
                /* ── TAB 2: ONE-OFF HOURLY BLOCKED SLOT ── */
                <form onSubmit={handleAddException} className="flex-1 flex flex-col justify-between text-xs space-y-3.5">
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Date</label>
                      <Input
                        type="date"
                        value={newExcDate}
                        onChange={(e) => setNewExcDate(e.target.value)}
                        required
                      />
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={newExcAllDay}
                          onChange={(e) => setNewExcAllDay(e.target.checked)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>All Day Leave</span>
                      </label>
                    </div>

                    {!newExcAllDay && (
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-slate-600 font-bold mb-1">Start Time</label>
                          <Input
                            type="time"
                            value={newExcStartTime}
                            onChange={(e) => setNewExcStartTime(e.target.value)}
                            required={!newExcAllDay}
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 font-bold mb-1">End Time</label>
                          <Input
                            type="time"
                            value={newExcEndTime}
                            onChange={(e) => setNewExcEndTime(e.target.value)}
                            required={!newExcAllDay}
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Reason (Optional)</label>
                      <Input
                        placeholder="e.g. Personal Appointment, Seminar"
                        value={newExcReason}
                        onChange={(e) => setNewExcReason(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="pt-2 mt-auto">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={addingException}
                      className="w-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> {addingException ? 'Saving...' : 'Add Blocked Slot'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* BOTTOM ROW: Full-Width Horizontal My Leave Requests & Blocked Slots */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-extrabold text-sm sm:text-base text-slate-900 uppercase tracking-wider">
                  My Leave Requests &amp; Blocks
                </h4>
                <p className="text-xs text-slate-500 font-medium">History of your submitted leaves and custom date blocks</p>
              </div>
              <span className="text-xs text-slate-500 font-semibold bg-slate-50 border border-slate-200 px-3 py-1 rounded-full">
                {leaveRequests.length} requests • {manualDateExceptions.length} blocks
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Column 1: Leave Requests Section */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CalendarPlus className="w-3.5 h-3.5 text-blue-600" />
                    <span>Leave Requests</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">{leaveRequests.length} total</span>
                </div>

                {loadingLeaveRequests ? (
                  <div className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600" />
                  </div>
                ) : leaveRequests.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                    <p className="text-xs text-slate-400 italic">No leave requests submitted yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {leaveRequests.map((lr) => (
                      <div key={lr.id} className="p-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-xl flex items-start justify-between gap-3 transition-colors">
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900">
                              {lr.startDate === lr.endDate ? lr.startDate : `${lr.startDate} → ${lr.endDate}`}
                            </span>
                            <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {lr.leaveType}
                            </span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                              lr.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : lr.status === 'rejected'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {lr.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600">{lr.reason}</p>
                        </div>

                        {lr.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleCancelLeaveRequest(lr.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Cancel Leave Request"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Column 2: Blocked Hours Exceptions Section */}
              <div className="space-y-3 lg:border-l lg:border-slate-100 lg:pl-6">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Upcoming Blocked Time Slots</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">{manualDateExceptions.length} total</span>
                </div>

                {manualDateExceptions.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                    <p className="text-xs text-slate-400 italic">No hourly date blocks active.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {manualDateExceptions.map((exc) => (
                      <div key={exc.id} className="p-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3 transition-colors">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900">{exc.specificDate}</span>
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                              {exc.startTime === '00:00' && exc.endTime === '23:59' ? 'All Day' : `${exc.startTime} – ${exc.endTime}`}
                            </span>
                          </div>
                          {exc.reason && (
                            <p className="text-xs text-slate-600">{exc.reason}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteException(exc.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Remove Block"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LEAVE APPLICATION MODAL ── */}
      {isLeaveModalOpen && (
        <Modal
          isOpen={isLeaveModalOpen}
          onClose={() => setIsLeaveModalOpen(false)}
          title="Apply for Faculty Leave"
          size="lg"
        >
          <form onSubmit={handleCreateLeaveRequest} className="space-y-4 text-xs">
            <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-100 flex items-start gap-2.5">
              <CalendarPlus className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-[11px] text-blue-900 leading-relaxed">
                Submitting a leave request automatically flags your schedule as unavailable in the timetable scheduling engine, preventing accidental lecture allocations.
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Leave Type</label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                className="w-full h-9 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all cursor-pointer"
              >
                <option value="Casual Leave">Casual Leave</option>
                <option value="Sick Leave">Sick / Medical Leave</option>
                <option value="Personal Leave">Personal Leave</option>
                <option value="Earned Leave">Earned Leave</option>
                <option value="Emergency Leave">Emergency Leave</option>
                <option value="Academic Duty (OD)">Academic Duty / On Duty</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Start Date</label>
                <Input
                  type="date"
                  value={leaveStartDate}
                  onChange={(e) => {
                    setLeaveStartDate(e.target.value);
                    if (e.target.value > leaveEndDate) {
                      setLeaveEndDate(e.target.value);
                    }
                  }}
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">End Date</label>
                <Input
                  type="date"
                  value={leaveEndDate}
                  min={leaveStartDate}
                  onChange={(e) => setLeaveEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-600 font-bold mb-1.5">Duration Type</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'full', label: 'Full Day' },
                  { id: 'first_half', label: 'First Half' },
                  { id: 'second_half', label: 'Second Half' }
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setLeaveDayType(d.id as any)}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      leaveDayType === d.id
                        ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-600 font-bold mb-1">Reason for Leave</label>
              <textarea
                rows={3}
                placeholder="Please describe reason for leave request..."
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                required
                className="w-full text-xs font-medium p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsLeaveModalOpen(false)}
                className="text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={submittingLeave}
                className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 mr-1" /> {submittingLeave ? 'Submitting...' : 'Submit Leave Request'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── 8. TEACHER REQUEST DETAIL MODAL ── */}
      {selectedRequestDetail && (
        <Modal
          isOpen={!!selectedRequestDetail}
          onClose={() => setSelectedRequestDetail(null)}
          title={`Schedule Request Details — ${selectedRequestDetail.id ? (String(selectedRequestDetail.id).startsWith('REQ-') ? selectedRequestDetail.id : `#${selectedRequestDetail.id}`) : ''}`}
          size="2xl"
        >
          <div className="space-y-4">
            {/* Status & Type Banner */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {selectedRequestDetail.request_type || selectedRequestDetail.type || 'RESCHEDULE'}
                </span>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                selectedRequestDetail.status === 'Approved' || selectedRequestDetail.status === 'approved' || selectedRequestDetail.status === 'applied'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : selectedRequestDetail.status === 'Rejected' || selectedRequestDetail.status === 'rejected'
                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                {selectedRequestDetail.status}
              </span>
            </div>

            {/* Academic Info */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 block font-bold uppercase text-[10px]">Subject</span>
                <span className="font-bold text-slate-900 text-sm">{selectedRequestDetail.subject_name || selectedRequestDetail.subject || 'Subject'}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 block font-bold uppercase text-[10px]">Batch</span>
                <span className="font-bold text-blue-700 text-sm">{selectedRequestDetail.batch_name || selectedRequestDetail.batchName || 'Batch'}</span>
              </div>
            </div>

            {/* Timing / Slot Comparison if available */}
            {(selectedRequestDetail.requested_date || selectedRequestDetail.current_date || selectedRequestDetail.date) && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <span className="text-slate-400 font-bold uppercase text-[10px] block">Schedule Slot Details</span>
                {selectedRequestDetail.current_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Original Slot:</span>
                    <span className="font-bold text-slate-700">
                      {selectedRequestDetail.current_date} ({selectedRequestDetail.current_start_time?.slice(0, 5)} - {selectedRequestDetail.current_end_time?.slice(0, 5)})
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span className="text-blue-600 font-bold">Requested Slot:</span>
                  <span className="font-bold text-slate-900">
                    {selectedRequestDetail.requested_date || selectedRequestDetail.date} ({selectedRequestDetail.requested_start_time?.slice(0, 5) || selectedRequestDetail.time?.split('-')[0]?.trim()} - {selectedRequestDetail.requested_end_time?.slice(0, 5) || selectedRequestDetail.time?.split('-')[1]?.trim()})
                  </span>
                </div>
                {selectedRequestDetail.requested_classroom_name && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <span className="text-slate-500 font-medium">Requested Room:</span>
                    <span className="font-bold text-slate-800">{selectedRequestDetail.requested_classroom_name}</span>
                  </div>
                )}
              </div>
            )}

            {/* Reason */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Your Reason</span>
              <p className="text-slate-700 font-medium">{selectedRequestDetail.reason || 'No specific reason provided.'}</p>
            </div>

            {/* Admin Decision Note */}
            {selectedRequestDetail.decision_note && (
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1">
                <span className="text-amber-800 font-bold uppercase text-[10px]">Administration Note</span>
                <p className="text-slate-800 font-medium">{selectedRequestDetail.decision_note}</p>
                {selectedRequestDetail.decided_by_name && (
                  <p className="text-[10px] text-amber-700 pt-0.5">Decided by: {selectedRequestDetail.decided_by_name}</p>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedRequestDetail(null)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── 8. WEEK GRID LECTURE DETAIL MODAL ── */}
      {selectedGridLecture && (
        <Modal
          isOpen={!!selectedGridLecture}
          onClose={() => setSelectedGridLecture(null)}
          title="Scheduled Lecture Details"
          size="xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs text-slate-400 block uppercase font-bold">Subject</span>
                <h3 className="text-lg font-bold text-slate-900">{selectedGridLecture.subject.name}</h3>
              </div>
              <div>{getTypeBadge(selectedGridLecture.type)}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-slate-400 block font-semibold">Time</span>
                <span className="font-bold text-slate-800">{formatDisplayTime(selectedGridLecture.startTime)} – {formatDisplayTime(selectedGridLecture.endTime)}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-slate-400 block font-semibold">Batch</span>
                <span className="font-bold text-blue-700">{selectedGridLecture.batch.name}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-slate-400 block font-semibold">Level</span>
                <span className="font-bold text-slate-800">{selectedGridLecture.level.name}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-slate-400 block font-semibold">Classroom</span>
                <span className="font-bold text-slate-800">{selectedGridLecture.classroom.name}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const lec = selectedGridLecture;
                  setSelectedGridLecture(null);
                  setRequestPrefillLecture(lec);
                  setIsRequestModalOpen(true);
                }}
                className="text-xs"
              >
                Request Change
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const lec = selectedGridLecture;
                  setSelectedGridLecture(null);
                  navigate('/attendance', {
                    state: {
                      activeLecture: {
                        ...lec,
                        date: lec.date || (lec as any).lectureDate,
                        lectureDate: (lec as any).lectureDate || lec.date
                      },
                      branch: lec.branch?.name,
                      batch: lec.batch?.name,
                      date: lec.date || (lec as any).lectureDate
                    }
                  });
                }}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Mark Attendance
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── 10. REQUEST CHANGE MODAL ── */}
      {isRequestModalOpen && (
        <RequestChangeModal
          isOpen={isRequestModalOpen}
          onClose={() => {
            setIsRequestModalOpen(false);
            setRequestPrefillLecture(null);
          }}
          onSubmit={async (payload) => {
            try {
              await lectureRequestApi.createRequest(payload);

              // Refresh changes list from DB
              const updated = await teacherScheduleApi.getChanges();
              setScheduleChanges(updated || []);
              addToast('Schedule change request submitted. Pending administration review.', 'success');
            } catch (err: any) {
              console.error('Failed to submit change request:', err);
              addToast(err?.response?.data?.message || 'Failed to submit change request', 'error');
            } finally {
              setIsRequestModalOpen(false);
              setRequestPrefillLecture(null);
            }
          }}
          batches={options?.batches || []}
          subjects={options?.subjects || []}
          classrooms={options?.classrooms || []}
          teachers={options?.teachers || []}
          branches={options?.branches || []}
          lectures={todayLectures as any}
          currentTeacher={currentUser}
          prefillLecture={requestPrefillLecture}
        />
      )}
    </div>
  );
};
