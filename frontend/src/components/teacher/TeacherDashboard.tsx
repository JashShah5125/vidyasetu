import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Calendar, 
  HelpCircle, 
  GraduationCap, 
  ArrowLeft, 
  Clock, 
  MapPin, 
  CheckCircle, 
  RefreshCw, 
  Send, 
  MessageSquare, 
  User, 
  Loader2,
  Award,
  Search,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Filter,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  XCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { teacherScheduleApi } from '../../services/teacherScheduleApi';
import type { TeacherScheduleOptions, TeacherScheduleLecture } from '../../services/teacherScheduleApi';
import { doubtApi } from '../../services/doubtApi';
import type { DoubtItem } from '../../services/doubtApi';
import { teacherHomeworkApi } from '../../services/teacherHomeworkApi';
import type { HomeworkItem } from '../../services/assignmentApi';

const SimpleWorkloadTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    if (!data) return null;
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2 rounded-xl shadow-xl border border-slate-800 text-xs">
        <div className="font-semibold text-slate-300">{data.fullDay}</div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-blue-400 font-extrabold text-sm font-mono">{data.hours} hrs</span>
          <span className="text-slate-400 text-[11px]">({data.lectures} {data.lectures === 1 ? 'class' : 'classes'})</span>
        </div>
      </div>
    );
  }
  return null;
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

export const TeacherDashboard: React.FC = () => {
  const { currentUser, addToast } = useApp();
  const navigate = useNavigate();

  // Loading States
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Scoped Options from Backend
  const [options, setOptions] = useState<TeacherScheduleOptions>({
    branches: [],
    academicYears: [],
    courses: [],
    programs: [],
    levels: [],
    batches: [],
    subjects: [],
    classrooms: []
  });

  // Global Header Filters
  const [filterBranch, setFilterBranch] = useState<string>('All');
  const [filterCourse, setFilterCourse] = useState<string>('All');
  const [filterProgram, setFilterProgram] = useState<string>('All');
  const [filterLevel, setFilterLevel] = useState<string>('All');
  const [filterYear, setFilterYear] = useState<string>('All');
  const [filterBatch, setFilterBatch] = useState<string>('All');

  // Filter Toggle & Date Preset (Daily | Weekly | Monthly)
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);
  const [datePreset, setDatePreset] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Operational Data
  const [todayLectures, setTodayLectures] = useState<TeacherScheduleLecture[]>([]);
  const [weekLectures, setWeekLectures] = useState<TeacherScheduleLecture[]>([]);
  const [monthLectures, setMonthLectures] = useState<TeacherScheduleLecture[]>([]);
  const [doubts, setDoubts] = useState<DoubtItem[]>([]);
  const [selectedDoubtDetail, setSelectedDoubtDetail] = useState<DoubtItem | null>(null);
  const [classAverageScore, setClassAverageScore] = useState<string>('—');

  // UI / Tab & Modal States
  const [scheduleTab, setScheduleTab] = useState<'today' | 'weekly' | 'grade_tests'>('today');
  const [doubtFilter, setDoubtFilter] = useState<'All' | 'Pending' | 'Resolved'>('All');
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [activeDoubtId, setActiveDoubtId] = useState<number | null>(null);
  const [responseText, setResponseText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;
  const [showAllDoubts, setShowAllDoubts] = useState(false);

  // Assessment Grading States (Tests, Homeworks, Assignments)
  const [teacherAssessments, setTeacherAssessments] = useState<HomeworkItem[]>([]);
  const [assessmentTypeFilter, setAssessmentTypeFilter] = useState<'all' | 'exam' | 'homework' | 'assignment'>('all');
  const [showAllAssessments, setShowAllAssessments] = useState(false);

  // 1. Fetch Teacher Scoped Options on Mount
  const loadOptions = useCallback(async () => {
    try {
      setLoadingOptions(true);
      const data = await teacherScheduleApi.getOptions();
      if (data) {
        setOptions({
          branches: data.branches || [],
          academicYears: data.academicYears || [],
          courses: data.courses || [],
          programs: data.programs || [],
          levels: data.levels || [],
          batches: data.batches || [],
          subjects: data.subjects || [],
          classrooms: data.classrooms || []
        });
      }
    } catch (err: any) {
      console.error('[TeacherDashboard] Failed to load teacher options:', err);
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  // 2. Cascade Filter Computations
  const availablePrograms = useMemo(() => {
    if (!options?.programs) return [];
    if (filterCourse === 'All') return options.programs;
    const selectedCourseObj = options.courses?.find(c => String(c.id) === filterCourse || c.name === filterCourse);
    if (!selectedCourseObj) return options.programs;
    return options.programs.filter(p => p.course_id === selectedCourseObj.id);
  }, [filterCourse, options.courses, options.programs]);

  const availableLevels = useMemo(() => {
    if (!options?.levels) return [];
    if (filterProgram === 'All') return options.levels;
    const selectedProgObj = options.programs?.find(p => String(p.id) === filterProgram || p.name === filterProgram);
    if (!selectedProgObj) return options.levels;
    return options.levels.filter(l => l.program_id === selectedProgObj.id);
  }, [filterProgram, options.programs, options.levels]);

  const availableBatches = useMemo(() => {
    if (!options?.batches) return [];
    return options.batches.filter(b => {
      // Branch check
      if (filterBranch !== 'All') {
        const branchMatch = String(b.branch_id) === filterBranch || 
          options.branches?.find(br => String(br.id) === filterBranch)?.id === b.branch_id;
        if (!branchMatch) return false;
      }
      // Level check
      if (filterLevel !== 'All') {
        const levelObj = options.levels?.find(l => String(l.id) === filterLevel || l.name === filterLevel);
        if (levelObj && b.level_id !== levelObj.id) return false;
      }
      return true;
    });
  }, [options.batches, options.branches, options.levels, filterBranch, filterLevel]);

  // Reset dependent filters if no longer valid
  useEffect(() => {
    if (filterBatch !== 'All') {
      const exists = availableBatches.some(b => String(b.id) === filterBatch || b.name === filterBatch);
      if (!exists) setFilterBatch('All');
    }
  }, [availableBatches, filterBatch]);

  // Active Filter Tags Calculation
  const activeFilters = useMemo(() => {
    const list: { label: string; value: string; clear: () => void }[] = [];
    if (filterYear !== 'All') {
      const ay = options.academicYears?.find(a => String(a.id) === filterYear);
      list.push({ label: 'Year', value: ay?.name || filterYear, clear: () => setFilterYear('All') });
    }
    if (filterBranch !== 'All') {
      const br = options.branches?.find(b => String(b.id) === filterBranch);
      list.push({ label: 'Branch', value: br?.name || filterBranch, clear: () => setFilterBranch('All') });
    }
    if (filterCourse !== 'All') {
      const c = options.courses?.find(item => String(item.id) === filterCourse);
      list.push({ label: 'Course', value: c?.name || filterCourse, clear: () => { setFilterCourse('All'); setFilterProgram('All'); setFilterLevel('All'); setFilterBatch('All'); } });
    }
    if (filterProgram !== 'All') {
      const p = options.programs?.find(item => String(item.id) === filterProgram);
      list.push({ label: 'Program', value: p?.name || filterProgram, clear: () => { setFilterProgram('All'); setFilterLevel('All'); setFilterBatch('All'); } });
    }
    if (filterLevel !== 'All') {
      const l = options.levels?.find(item => String(item.id) === filterLevel);
      list.push({ label: 'Level', value: l?.name || filterLevel, clear: () => { setFilterLevel('All'); setFilterBatch('All'); } });
    }
    if (filterBatch !== 'All') {
      const b = options.batches?.find(item => String(item.id) === filterBatch);
      list.push({ label: 'Batch', value: b?.name || filterBatch, clear: () => setFilterBatch('All') });
    }
    return list;
  }, [filterYear, filterBranch, filterCourse, filterProgram, filterLevel, filterBatch, options]);

  const handleResetFilters = () => {
    setFilterYear('All');
    setFilterBranch('All');
    setFilterCourse('All');
    setFilterProgram('All');
    setFilterLevel('All');
    setFilterBatch('All');
  };

  const handleDatePresetChange = (preset: 'daily' | 'weekly' | 'monthly') => {
    setDatePreset(preset);
    if (preset === 'daily') {
      setScheduleTab('today');
    } else if (preset === 'weekly') {
      setScheduleTab('weekly');
    }
  };

  const selectClass =
    'w-full h-8 text-xs font-semibold bg-slate-50 hover:bg-white border border-slate-200 text-slate-800 rounded-xl px-2.5 pr-7 appearance-none cursor-pointer ' +
    'hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 focus:bg-white transition-all shadow-xs';

  // 3. Fetch Teacher Dashboard Data (Today Lectures, Week Schedule, Doubts, Homework Stats)
  const loadDashboardData = useCallback(async () => {
    try {
      setLoadingData(true);

      const batchFilterParam = filterBatch !== 'All' ? filterBatch : undefined;
      const branchFilterParam = filterBranch !== 'All' ? filterBranch : undefined;

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const monthStart = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
      const monthEnd = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const [todayRes, weekRes, monthRes, doubtsRes, homeworksRes, assessmentsRes] = await Promise.allSettled([
        teacherScheduleApi.getToday(undefined, { batchId: batchFilterParam, branchId: branchFilterParam }),
        teacherScheduleApi.getWeek(undefined, undefined, { batchId: batchFilterParam, branchId: branchFilterParam }),
        teacherScheduleApi.getWeek(monthStart, monthEnd, { batchId: batchFilterParam, branchId: branchFilterParam }),
        doubtApi.getTeacherDoubts({ batchId: batchFilterParam }),
        teacherHomeworkApi.getHomeworks({ 
          limit: 20,
          batchId: batchFilterParam, 
          branchId: branchFilterParam 
        }),
        teacherHomeworkApi.getHomeworks({
          assignmentType: 'all',
          limit: 100,
          batchId: batchFilterParam,
          branchId: branchFilterParam
        })
      ]);

      if (todayRes.status === 'fulfilled' && todayRes.value) {
        setTodayLectures(todayRes.value.lectures || []);
      }

      if (weekRes.status === 'fulfilled' && weekRes.value) {
        setWeekLectures(weekRes.value.lectures || []);
      }

      if (monthRes.status === 'fulfilled' && monthRes.value) {
        setMonthLectures(monthRes.value.lectures || []);
      }

      if (doubtsRes.status === 'fulfilled' && doubtsRes.value) {
        setDoubts(doubtsRes.value || []);
      }

      if (assessmentsRes.status === 'fulfilled' && assessmentsRes.value?.data) {
        const items = assessmentsRes.value.data || [];
        setTeacherAssessments(items);
        const withGraded = items.filter((h: any) => 
          Number(h.gradedSubmissionsCount) > 0 && 
          h.classAveragePercentage !== null && 
          h.classAveragePercentage !== undefined
        );
        if (withGraded.length > 0) {
          const avg = withGraded.reduce((acc: number, cur: any) => acc + Number(cur.classAveragePercentage), 0) / withGraded.length;
          setClassAverageScore(`${avg.toFixed(1)}%`);
        } else {
          setClassAverageScore('—');
        }
      } else if (homeworksRes.status === 'fulfilled' && homeworksRes.value?.data) {
        const hws = homeworksRes.value.data;
        const withGraded = hws.filter((h: any) => 
          Number(h.gradedSubmissionsCount) > 0 && 
          h.classAveragePercentage !== null && 
          h.classAveragePercentage !== undefined
        );
        if (withGraded.length > 0) {
          const avg = withGraded.reduce((acc: number, cur: any) => acc + Number(cur.classAveragePercentage), 0) / withGraded.length;
          setClassAverageScore(`${avg.toFixed(1)}%`);
        } else {
          setClassAverageScore('—');
        }
      } else {
        setClassAverageScore('—');
      }
    } catch (err: any) {
      console.error('[TeacherDashboard] Error fetching dashboard data:', err);
    } finally {
      setLoadingData(false);
    }
  }, [filterBatch, filterBranch]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Doubts Filter & Latest Sorting
  const filteredDoubts = useMemo(() => {
    if (!doubts) return [];
    const list = doubts.filter(d => {
      if (doubtFilter === 'Pending') {
        return d.status === 0 || d.status === 1 || d.statusLabel === 'Open' || d.statusLabel === 'In Progress';
      }
      if (doubtFilter === 'Resolved') {
        return d.status === 2 || d.statusLabel === 'Resolved';
      }
      return true;
    });

    // Sort latest first (by lastActivityAt or createdAt or id)
    return [...list].sort((a, b) => {
      const timeA = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : Number(a.id) || 0);
      const timeB = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : Number(b.id) || 0);
      return timeB - timeA;
    });
  }, [doubts, doubtFilter]);

  const pendingDoubtsCount = useMemo(() => {
    if (!doubts) return 0;
    return doubts.filter(d => d.status === 0 || d.status === 1 || d.statusLabel === 'Open' || d.statusLabel === 'In Progress').length;
  }, [doubts]);

  // Workload & Teaching Hours Data
  const resolvedDoubtsCount = useMemo(() => {
    if (!doubts) return 0;
    return doubts.filter(d => d.status === 2 || d.statusLabel === 'Resolved').length;
  }, [doubts]);

  const parseLectureDurationHours = (start?: string, end?: string): number => {
    if (!start || !end) return 1.5;
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    if (isNaN(sH) || isNaN(eH)) return 1.5;
    const diff = (eH * 60 + (eM || 0)) - (sH * 60 + (sM || 0));
    return diff > 0 ? Number((diff / 60).toFixed(1)) : 1.5;
  };

  // Helper: check if a lecture is marked present for the teacher
  const isLecturePresent = (l: any): boolean => {
    return Boolean(
      l.isTeacherPresent || 
      l.teacherAttendanceStatus === 'PRESENT' || 
      l.attendance?.taken || 
      l.attendanceTaken
    );
  };

  const todayScheduledHours = useMemo(() => {
    return Number(todayLectures.reduce((acc, l) => acc + parseLectureDurationHours(l.startTime, l.endTime), 0).toFixed(1));
  }, [todayLectures]);

  const todayAttendedLectures = useMemo(() => {
    return todayLectures.filter(isLecturePresent);
  }, [todayLectures]);

  const todayLecturesHours = useMemo(() => {
    return Number(todayAttendedLectures.reduce((acc, l) => acc + parseLectureDurationHours(l.startTime, l.endTime), 0).toFixed(1));
  }, [todayAttendedLectures]);

  // 1. Daily teaching hours distribution across daytime slots (ONLY attended/present lectures)
  const dailyHoursData = useMemo(() => {
    const timeBlocks = [
      { key: '08:00', label: '8 – 10 AM', full: 'Morning (08:00 – 10:00)', startM: 8 * 60, endM: 10 * 60 },
      { key: '10:00', label: '10 – 12 PM', full: 'Late Morning (10:00 – 12:00)', startM: 10 * 60, endM: 12 * 60 },
      { key: '12:00', label: '12 – 2 PM', full: 'Afternoon (12:00 – 14:00)', startM: 12 * 60, endM: 14 * 60 },
      { key: '14:00', label: '2 – 4 PM', full: 'Mid Afternoon (14:00 – 16:00)', startM: 14 * 60, endM: 16 * 60 },
      { key: '16:00', label: '4 – 6 PM', full: 'Late Afternoon (16:00 – 18:00)', startM: 16 * 60, endM: 18 * 60 },
      { key: '18:00', label: '6 – 8 PM', full: 'Evening (18:00 – 20:00)', startM: 18 * 60, endM: 20 * 60 },
    ];

    return timeBlocks.map(block => {
      const matchingLectures = todayLectures.filter(l => {
        if (!l.startTime) return false;
        if (!isLecturePresent(l)) return false;

        const [h, m] = l.startTime.slice(0, 5).split(':').map(Number);
        const mins = (h || 0) * 60 + (m || 0);
        return mins >= block.startM && mins < block.endM;
      });

      const hours = matchingLectures.reduce(
        (acc, l) => acc + parseLectureDurationHours(l.startTime, l.endTime),
        0
      );

      const subjects = matchingLectures.map(l => l.subject?.name || 'Class').join(', ');

      return {
        day: block.label,
        fullDay: subjects ? `${block.full} • ${subjects}` : block.full,
        hours: Number(hours.toFixed(1)),
        lectures: matchingLectures.length,
      };
    });
  }, [todayLectures]);

  // 2. Weekly teaching hours (Mon - Sat, ONLY attended/present lectures)
  const weeklyHoursData = useMemo(() => {
    const days = [
      { key: 'Mon', label: 'Mon', full: 'Monday' },
      { key: 'Tue', label: 'Tue', full: 'Tuesday' },
      { key: 'Wed', label: 'Wed', full: 'Wednesday' },
      { key: 'Thu', label: 'Thu', full: 'Thursday' },
      { key: 'Fri', label: 'Fri', full: 'Friday' },
      { key: 'Sat', label: 'Sat', full: 'Saturday' }
    ];

    return days.map((d, idx) => {
      const dayLectures = weekLectures.filter(l => {
        if (!isLecturePresent(l)) return false;

        if (l.day === d.key) return true;
        if (l.date) {
          const dStr = l.date.includes('T') ? l.date.split('T')[0] : l.date;
          const [y, m, dNum] = dStr.split('-').map(Number);
          const lDate = new Date(y, m - 1, dNum);
          const dayIndex = lDate.getDay();
          return (dayIndex === idx + 1);
        }
        return false;
      });

      const hours = dayLectures.reduce(
        (acc, l) => acc + parseLectureDurationHours(l.startTime, l.endTime),
        0
      );

      return {
        day: d.label,
        fullDay: d.full,
        hours: Number(hours.toFixed(1)),
        lectures: dayLectures.length,
      };
    });
  }, [weekLectures]);

  const totalWeeklyHours = useMemo(() => {
    return Number(weeklyHoursData.reduce((acc, d) => acc + d.hours, 0).toFixed(1));
  }, [weeklyHoursData]);

  const totalWeeklyLectures = useMemo(() => {
    return weeklyHoursData.reduce((acc, d) => acc + d.lectures, 0);
  }, [weeklyHoursData]);

  const avgDailyHours = useMemo(() => {
    return Number((totalWeeklyHours / 6).toFixed(1));
  }, [totalWeeklyHours]);

  // 3. Monthly teaching hours (Week 1 - Week 5, ONLY attended/present lectures)
  const monthlyHoursData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthNum = now.getMonth() + 1;
    const monthName = now.toLocaleString('en-US', { month: 'short' });
    const lastDay = new Date(currentYear, currentMonthNum, 0).getDate();

    const weeks = [
      { key: 'W1', label: 'Week 1', full: `Week 1 (${monthName} 1 – 7)`, startDay: 1, endDay: 7 },
      { key: 'W2', label: 'Week 2', full: `Week 2 (${monthName} 8 – 14)`, startDay: 8, endDay: 14 },
      { key: 'W3', label: 'Week 3', full: `Week 3 (${monthName} 15 – 21)`, startDay: 15, endDay: 21 },
      { key: 'W4', label: 'Week 4', full: `Week 4 (${monthName} 22 – 28)`, startDay: 22, endDay: 28 },
    ];

    if (lastDay >= 29) {
      weeks.push({
        key: 'W5',
        label: 'Week 5',
        full: `Week 5 (${monthName} 29 – ${lastDay})`,
        startDay: 29,
        endDay: lastDay,
      });
    }

    const sourceLectures = monthLectures.length > 0 ? monthLectures : weekLectures;

    return weeks.map((w) => {
      const matching = sourceLectures.filter(l => {
        if (!l.date) return false;
        if (!isLecturePresent(l)) return false;

        const dStr = l.date.includes('T') ? l.date.split('T')[0] : l.date;
        const [y, m, d] = dStr.split('-').map(Number);
        // Strictly verify the lecture belongs to current year and current month
        if (y !== currentYear || m !== currentMonthNum) {
          return false;
        }
        return d >= w.startDay && d <= w.endDay;
      });

      const hours = matching.reduce((acc, l) => acc + parseLectureDurationHours(l.startTime, l.endTime), 0);

      return {
        day: w.label,
        fullDay: w.full,
        hours: Number(hours.toFixed(1)),
        lectures: matching.length,
      };
    });
  }, [monthLectures, weekLectures]);

  // Dynamic View Model for Hours Worked Graph & KPI depending on datePreset
  const currentWorkloadView = useMemo(() => {
    if (datePreset === 'daily') {
      const total = Number(dailyHoursData.reduce((acc, d) => acc + d.hours, 0).toFixed(1));
      const totalLecs = dailyHoursData.reduce((acc, d) => acc + d.lectures, 0);
      return {
        title: 'Hours Worked Today',
        subtitle: total > 0 ? 'Classroom lecture hours attended and marked present today' : 'Hours reflect once teacher attendance is marked present for completed lectures',
        totalHours: total,
        totalLectures: totalLecs,
        primaryBadge: `Hours Worked: ${total} hrs`,
        secondaryBadge: `Marked Present: ${totalLecs} / ${todayLectures.length} classes`,
        data: dailyHoursData,
      };
    }
    if (datePreset === 'monthly') {
      const total = Number(monthlyHoursData.reduce((acc, d) => acc + d.hours, 0).toFixed(1));
      const totalLecs = monthlyHoursData.reduce((acc, d) => acc + d.lectures, 0);
      const numWeeks = monthlyHoursData.length || 4;
      const avgWeekly = Number((total / numWeeks).toFixed(1));
      return {
        title: 'Hours Worked This Month',
        subtitle: total > 0 ? 'Weekly classroom lecture hours delivered and marked present across current month' : 'Hours reflect once teacher attendance is marked present for completed lectures',
        totalHours: total,
        totalLectures: totalLecs,
        primaryBadge: `Hours Worked: ${total} hrs`,
        secondaryBadge: `Classes Delivered: ${totalLecs}`,
        data: monthlyHoursData,
      };
    }
    // Default: weekly
    return {
      title: 'Hours Worked This Week',
      subtitle: totalWeeklyHours > 0 ? 'Daily classroom lecture hours delivered and marked present (Monday – Saturday)' : 'Hours reflect once teacher attendance is marked present for completed lectures',
      totalHours: totalWeeklyHours,
      totalLectures: totalWeeklyLectures,
      primaryBadge: `Hours Worked: ${totalWeeklyHours} hrs`,
      secondaryBadge: `Classes Delivered: ${totalWeeklyLectures}`,
      data: weeklyHoursData,
    };
  }, [datePreset, dailyHoursData, weeklyHoursData, monthlyHoursData, totalWeeklyHours, totalWeeklyLectures, avgDailyHours, todayLectures.length]);

  const displayedDoubts = useMemo(() => {
    if (showAllDoubts) return filteredDoubts;
    return filteredDoubts.slice(0, 2);
  }, [filteredDoubts, showAllDoubts]);

  useEffect(() => {
    setShowAllDoubts(false);
  }, [doubtFilter, filterBatch, filterBranch]);

  useEffect(() => {
    setShowAllAssessments(false);
  }, [assessmentTypeFilter]);

  // Handle Answering Doubt
  const handleOpenAnswerModal = async (doubtId: number) => {
    setActiveDoubtId(doubtId);
    setResponseText('');
    setShowAnswerModal(true);
    try {
      const fullDetail = await doubtApi.getTeacherDoubt(doubtId);
      if (fullDetail) {
        setSelectedDoubtDetail(fullDetail);
      }
    } catch (e) {
      console.error('Error fetching doubt detail:', e);
    }
  };

  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDoubtId || !responseText.trim()) return;

    try {
      setIsSubmittingReply(true);
      const formData = new FormData();
      formData.append('message', responseText.trim());

      await doubtApi.addTeacherReply(activeDoubtId, formData);
      addToast('Academic response submitted successfully!');
      setShowAnswerModal(false);
      setActiveDoubtId(null);
      setSelectedDoubtDetail(null);
      setResponseText('');

      // Refresh doubts list
      const updatedDoubts = await doubtApi.getTeacherDoubts({ batchId: filterBatch !== 'All' ? filterBatch : undefined });
      setDoubts(updatedDoubts || []);
    } catch (err: any) {
      console.error('Error submitting doubt response:', err);
      addToast(err?.response?.data?.message || 'Failed to submit response.');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Assessment Grading Handlers & Memos (Tests, Homeworks, Assignments)
  const assessmentCounts = useMemo(() => {
    let exams = 0;
    let homeworks = 0;
    let assignments = 0;
    teacherAssessments.forEach(a => {
      const type = (a.assignmentType || '').toLowerCase();
      if (type === 'exam') exams++;
      else if (type === 'homework') homeworks++;
      else if (type === 'assignment') assignments++;
    });
    return {
      all: teacherAssessments.length,
      exam: exams,
      homework: homeworks,
      assignment: assignments
    };
  }, [teacherAssessments]);

  const filteredAssessments = useMemo(() => {
    let list = teacherAssessments;
    if (assessmentTypeFilter !== 'all') {
      list = teacherAssessments.filter(a => (a.assignmentType || '').toLowerCase() === assessmentTypeFilter);
    }
    // Sort latest first (by dueDate or createdAt)
    return [...list].sort((a, b) => {
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return dateB - dateA;
    });
  }, [teacherAssessments, assessmentTypeFilter]);

  const displayedAssessments = useMemo(() => {
    if (showAllAssessments) return filteredAssessments;
    return filteredAssessments.slice(0, 2);
  }, [filteredAssessments, showAllAssessments]);

  const handleGradeRedirect = (assessment: HomeworkItem) => {
    navigate(`/assignments?evaluate=${encodeURIComponent(assessment.id)}`);
  };

  // Full Screen Quick Reply View
  if (showAnswerModal) {
    const targetDoubt = selectedDoubtDetail || doubts.find(d => d.id === activeDoubtId);

    return (
      <div className="space-y-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setShowAnswerModal(false);
              setSelectedDoubtDetail(null);
            }}
            className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">Compose Academic Response</h2>
            <p className="text-sm text-slate-500">Provide a clear explanation or reply to the student's question.</p>
          </div>
        </div>

        {targetDoubt && (
          <div className="p-5 bg-blue-50/60 border border-blue-100 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-blue-800">
              <span>STUDENT: {targetDoubt.student?.name || 'Student'} ({targetDoubt.subject?.name || 'Subject'})</span>
              <span className="bg-blue-100 px-2 py-0.5 rounded text-blue-700">{targetDoubt.batch?.name}</span>
            </div>
            <h4 className="text-sm font-bold text-slate-900">Topic: {targetDoubt.topic}</h4>
            {targetDoubt.replies && targetDoubt.replies.length > 0 ? (
              <div className="text-sm text-slate-700 bg-white p-3 rounded-lg border border-blue-100 mt-2">
                <span className="font-semibold text-slate-900">Question: </span>
                {targetDoubt.replies[0]?.message || targetDoubt.lastMessage || targetDoubt.topic}
              </div>
            ) : (
              <div className="text-sm text-slate-700 bg-white p-3 rounded-lg border border-blue-100 mt-2">
                <span className="font-semibold text-slate-900">Question: </span>
                {targetDoubt.lastMessage || targetDoubt.topic}
              </div>
            )}
          </div>
        )}

        <div className="w-full bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <form onSubmit={handleAnswerSubmit} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Teacher Answer / Solution Details
              </label>
              <textarea 
                required 
                rows={6}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 font-medium transition-all"
                placeholder="Type your explanation, formula derivations, or key steps here..."
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => {
                  setShowAnswerModal(false);
                  setSelectedDoubtDetail(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="primary" 
                disabled={isSubmittingReply}
                className="flex items-center gap-2"
              >
                {isSubmittingReply ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <Send size={16} /> Submit Response
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Top Header Row with Filter Controls ─────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pt-1">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Faculty Academic Portal
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Welcome back, <strong className="font-semibold text-slate-800">{currentUser?.name || 'Faculty Member'}</strong>. Review schedule timelines, attendance, and student queries.
          </p>
        </div>

        {/* ── Top-Right Controls: Filter Toggle + Day/Week/Month Toggle + Refresh ── */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap sm:flex-nowrap">
          {/* Filter Toggle Button */}
          <button
            type="button"
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            className={`group flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border shadow-2xs active:scale-95 ${
              isFilterExpanded || activeFilters.length > 0
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Filter size={13} className={`transition-transform duration-200 group-hover:scale-110 ${isFilterExpanded || activeFilters.length > 0 ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'}`} />
            <span>Filter</span>
            {activeFilters.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-slate-900 text-[10px] font-extrabold flex items-center justify-center ml-0.5 shadow-2xs">
                {activeFilters.length}
              </span>
            )}
            <ChevronDown
              size={12}
              className={`transition-transform duration-200 ${isFilterExpanded ? 'rotate-180 text-white' : 'text-slate-400 group-hover:text-slate-600'}`}
            />
          </button>

          {/* Time Range Filter: Daily | Weekly | Monthly */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => handleDatePresetChange('daily')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 ${
                datePreset === 'daily'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => handleDatePresetChange('weekly')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 ${
                datePreset === 'weekly'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => handleDatePresetChange('monthly')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 ${
                datePreset === 'monthly'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Monthly
            </button>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => loadDashboardData()}
            disabled={loadingData}
            title="Refresh dashboard data"
            className="group flex items-center gap-1.5 h-8 px-2.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={13} className={`transition-transform duration-500 ${loadingData ? 'animate-spin text-slate-400' : 'text-slate-500 group-hover:rotate-180 group-hover:text-slate-700'}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Active Filters Tag Strip (when collapsed) ──────────────────────────── */}
      {!isFilterExpanded && activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 animate-fade-in">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Active:</span>
          {activeFilters.map(af => (
            <span
              key={af.label}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200/70 text-slate-800 border border-slate-200 transition-colors"
            >
              <span className="text-slate-400 font-normal">{af.label}:</span> {af.value}
              <button
                type="button"
                onClick={af.clear}
                className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md p-0.5 transition-colors cursor-pointer ml-0.5"
                title={`Remove ${af.label} filter`}
              >
                <X size={11} />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer ml-1 transition-all"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Expandable Filter Panel (opens directly before KPI cards) ─────────── */}
      {isFilterExpanded && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm animate-fade-in space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                <Filter size={12} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block leading-tight">Filter Academic & Batch Data</span>
                <span className="text-[10px] text-slate-400 block">Select course, program, level, batch or branch to filter all KPI cards and schedules</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {activeFilters.length > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
                >
                  <RotateCcw size={11} />
                  Reset all
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsFilterExpanded(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close filter panel"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Form Dropdowns Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {/* Academic Year */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Academic Year
              </label>
              <div className="relative">
                <select
                  value={filterYear}
                  onChange={e => setFilterYear(e.target.value)}
                  className={selectClass}
                >
                  <option value="All">All Years</option>
                  {(options.academicYears || []).map(ay => (
                    <option key={ay.id} value={String(ay.id)}>{ay.name}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">▼</span>
              </div>
            </div>

            {/* Branch */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Branch
              </label>
              <div className="relative">
                <select
                  value={filterBranch}
                  onChange={e => setFilterBranch(e.target.value)}
                  className={selectClass}
                >
                  <option value="All">All Branches</option>
                  {(options.branches || []).map(b => (
                    <option key={b.id} value={String(b.id)}>{b.name}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">▼</span>
              </div>
            </div>

            {/* Course */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Course
              </label>
              <div className="relative">
                <select
                  value={filterCourse}
                  onChange={e => {
                    setFilterCourse(e.target.value);
                    setFilterProgram('All');
                    setFilterLevel('All');
                    setFilterBatch('All');
                  }}
                  className={selectClass}
                >
                  <option value="All">All Courses</option>
                  {(options.courses || []).map(c => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">▼</span>
              </div>
            </div>

            {/* Program */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Program
              </label>
              <div className="relative">
                <select
                  value={filterProgram}
                  onChange={e => {
                    setFilterProgram(e.target.value);
                    setFilterLevel('All');
                    setFilterBatch('All');
                  }}
                  className={selectClass}
                >
                  <option value="All">All Programs</option>
                  {availablePrograms.map(p => (
                    <option key={p.id} value={String(p.id)}>{p.name}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">▼</span>
              </div>
            </div>

            {/* Level */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Level
              </label>
              <div className="relative">
                <select
                  value={filterLevel}
                  onChange={e => {
                    setFilterLevel(e.target.value);
                    setFilterBatch('All');
                  }}
                  className={selectClass}
                >
                  <option value="All">All Levels</option>
                  {availableLevels.map(l => (
                    <option key={l.id} value={String(l.id)}>{l.name}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">▼</span>
              </div>
            </div>

            {/* Batch */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Target Batch
              </label>
              <div className="relative">
                <select
                  value={filterBatch}
                  onChange={e => setFilterBatch(e.target.value)}
                  className={selectClass}
                >
                  <option value="All">All Batches</option>
                  {availableBatches.map(b => (
                    <option key={b.id} value={String(b.id)}>{b.name}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">▼</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Stats Cards - 4 Core Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Batches */}
        <Card className="p-4 shadow-sm border border-slate-200/90 hover:border-slate-300 transition-all">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Batches</div>
              <div className="text-2xl font-display font-extrabold text-slate-900 mt-1">
                {filterBatch !== 'All' ? 1 : availableBatches.length || options.batches?.length || 0}
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">Assigned Batches</div>
            </div>
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100 shadow-2xs shrink-0">
              <BookOpen size={18} />
            </div>
          </div>
        </Card>

        {/* Lectures Today */}
        <Card className="p-4 shadow-sm border border-slate-200/90 hover:border-slate-300 transition-all">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Lectures Today</div>
              <div className="text-2xl font-display font-extrabold text-slate-900 mt-1">
                {todayLectures.length}
              </div>
              <div className="text-[11px] text-blue-600 font-semibold mt-0.5">
                {todayScheduledHours > 0 ? `${todayScheduledHours}h scheduled load` : 'No classes today'}
              </div>
            </div>
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100 shadow-2xs shrink-0">
              <Calendar size={18} />
            </div>
          </div>
        </Card>

        {/* Dynamic Hours Worked KPI Card */}
        <Card className="p-4 shadow-sm border border-blue-200/90 bg-gradient-to-br from-blue-50/40 via-white to-white hover:border-blue-300 transition-all">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                {datePreset === 'daily'
                  ? "Today's Hours Worked"
                  : datePreset === 'monthly'
                  ? 'Monthly Hours Worked'
                  : 'Weekly Hours Worked'}
              </div>
              <div className="text-2xl font-display font-extrabold text-blue-950 mt-1">
                {currentWorkloadView.totalHours} <span className="text-sm font-semibold text-blue-600">hrs</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                {datePreset === 'daily'
                  ? `${currentWorkloadView.totalLectures} of ${todayLectures.length} classes attended`
                  : `${currentWorkloadView.totalLectures} ${currentWorkloadView.totalLectures === 1 ? 'class' : 'classes'} attended`}
              </div>
            </div>
            <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center border border-blue-200 shadow-2xs shrink-0">
              <Clock size={18} />
            </div>
          </div>
        </Card>

        {/* Pending Doubts */}
        <Card className="p-4 shadow-sm border border-slate-200/90 hover:border-slate-300 transition-all">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Doubts</div>
              <div className="text-2xl font-display font-extrabold text-amber-600 mt-1">
                {pendingDoubtsCount}
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                {resolvedDoubtsCount} doubts resolved
              </div>
            </div>
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100 shadow-2xs shrink-0">
              <HelpCircle size={18} />
            </div>
          </div>
        </Card>
      </div>

      {/* ── TEACHING HOURS DELIVERED (DYNAMIC GRAPH: DAILY / WEEKLY / MONTHLY) ── */}
      <Card className="p-5 shadow-sm border border-slate-200/90">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock size={18} className="text-blue-600" />
              {currentWorkloadView.title}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {currentWorkloadView.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs border border-blue-100">
              {currentWorkloadView.primaryBadge}
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200">
              {currentWorkloadView.secondaryBadge}
            </span>
          </div>
        </div>

        <div className="w-full h-52 mt-4 select-none [&_*]:outline-none [&_*]:focus:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              key={datePreset}
              data={currentWorkloadView.data}
              margin={{ top: 12, right: 12, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                unit="h"
              />
              <Tooltip content={<SimpleWorkloadTooltip />} cursor={{ fill: '#f1f5f9', opacity: 0.6 }} />
              <Bar dataKey="hours" name="Hours Worked" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Main Grid: Doubts Q&A Forum (Left) + Live Schedule (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Doubts Q&A */}
        <div className="lg:col-span-1 flex flex-col h-[680px]">
          <Card className="flex flex-col h-full flex-1 p-5 overflow-hidden shadow-sm">
            <CardHeader className="px-0 pt-0 pb-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex justify-between items-center w-full">
                <CardTitle className="text-lg font-bold text-slate-900">Academic doubts forum Q&amp;A</CardTitle>
                <div className="w-36">
                  <Select
                    value={doubtFilter}
                    onChange={(e) => setDoubtFilter(e.target.value as any)}
                    options={[
                      { value: 'All', label: 'All Status' },
                      { value: 'Pending', label: 'Pending' },
                      { value: 'Resolved', label: 'Resolved' }
                    ]}
                  />
                </div>
              </div>
            </CardHeader>

            <div className="space-y-3.5 flex-1 overflow-y-auto pr-1 mt-4">
              {loadingData ? (
                <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 size={28} className="animate-spin text-blue-600" />
                  <span className="text-xs font-semibold">Loading doubts...</span>
                </div>
              ) : displayedDoubts.length > 0 ? (
                displayedDoubts.map((d) => {
                  const isResolved = d.status === 2 || d.statusLabel === 'Resolved';
                  return (
                    <div key={d.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 hover:border-blue-200 transition-colors">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                        <span className="flex items-center gap-1.5 truncate">
                          <User size={13} className="text-slate-400" />
                          <strong className="text-slate-700">{d.student?.name || 'Student'}</strong> 
                          <span className="text-slate-400">({d.subject?.name || 'Subject'})</span>
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                          isResolved 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                            : 'bg-amber-50 text-amber-600 border-amber-200'
                        }`}>
                          {isResolved ? 'Resolved' : 'Pending'}
                        </span>
                      </div>

                      <div 
                        onClick={() => {
                          navigate(`/doubts?doubtId=${d.id}`, { 
                            state: { selectedDoubtId: d.id, doubtId: d.id } 
                          });
                        }}
                        className="text-sm font-semibold text-slate-900 leading-snug cursor-pointer hover:text-blue-600 transition-colors"
                      >
                        {d.topic}
                      </div>

                      {d.lastMessage && d.lastMessage !== d.topic && (
                        <div className="pl-3 border-l-2 border-slate-300 py-1 space-y-0.5">
                          <div className="text-[10px] font-bold text-slate-400 uppercase">
                            Latest Message • {d.lastActivityAt ? new Date(d.lastActivityAt).toLocaleDateString() : 'Recent'}
                          </div>
                          <p className="text-xs text-slate-600 font-medium line-clamp-2">"{d.lastMessage}"</p>
                        </div>
                      )}

                      <div className="flex justify-end pt-1">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => {
                            navigate(`/doubts?doubtId=${d.id}`, { 
                              state: { selectedDoubtId: d.id, doubtId: d.id } 
                            });
                          }}
                          className="flex items-center gap-1.5 text-xs font-semibold shadow-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                        >
                          <MessageSquare size={13} className="text-blue-600" />
                          <span>{isResolved ? 'View Conversation' : 'Answer Question'}</span>
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-20 text-center flex flex-col items-center justify-center">
                  <HelpCircle className="text-slate-300 mb-2" size={32} />
                  <div className="text-slate-500 font-medium text-sm">No doubts found matching criteria.</div>
                </div>
              )}
            </div>

            {/* View All / Show Less Toggle Bar */}
            {filteredDoubts.length > 2 ? (
              <div className="pt-2.5 pb-1 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-200/80 mt-3 flex-shrink-0">
                <span className="text-xs text-slate-500 font-medium">
                  {showAllDoubts
                    ? `Showing all ${filteredDoubts.length} doubts`
                    : `Showing latest 2 of ${filteredDoubts.length} doubts`}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowAllDoubts(!showAllDoubts)}
                    className="text-xs font-semibold px-3 py-1.5 flex items-center gap-1.5 cursor-pointer hover:bg-slate-200/80 shadow-2xs"
                  >
                    {showAllDoubts ? (
                      <>
                        <ChevronUp size={13} />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown size={13} />
                        View All ({filteredDoubts.length})
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/doubts')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2.5 py-1.5 cursor-pointer"
                  >
                    Manage All →
                  </Button>
                </div>
              </div>
            ) : filteredDoubts.length > 0 ? (
              <div className="pt-2.5 pb-1 flex items-center justify-between gap-2 border-t border-slate-200/80 mt-3 flex-shrink-0">
                <span className="text-xs text-slate-500 font-medium">
                  Showing all {filteredDoubts.length} doubts
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/doubts')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2.5 py-1.5 cursor-pointer"
                >
                  Manage All →
                </Button>
              </div>
            ) : null}
          </Card>
        </div>

        {/* Right Column: Schedule */}
        <div className="lg:col-span-1 flex flex-col h-[680px]">
          <Card className="overflow-hidden h-full flex flex-col flex-1 shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 p-5 flex-shrink-0">
              <h3 className="text-lg font-bold text-slate-900">Schedule</h3>
              <p className="text-sm text-slate-500">Your teaching schedule and academic activities</p>
            </div>

            {/* Sub-tabs */}
            <div className="flex border-b border-slate-100 overflow-x-auto hide-scrollbar bg-white flex-shrink-0">
              <button 
                onClick={() => setScheduleTab('today')}
                className={`flex-none px-6 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
                  scheduleTab === 'today' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Today ({todayLectures.length})
              </button>
              <button 
                onClick={() => setScheduleTab('weekly')}
                className={`flex-none px-6 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
                  scheduleTab === 'weekly' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Weekly Schedule
              </button>
              <button 
                onClick={() => setScheduleTab('grade_tests')}
                className={`flex-none px-6 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                  scheduleTab === 'grade_tests' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <span>Grade Work</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold transition-colors ${
                  scheduleTab === 'grade_tests' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {teacherAssessments.length}
                </span>
              </button>
            </div>
            
            <div className="p-5 bg-white flex-1 overflow-y-auto pr-1.5 space-y-4">
              {loadingData ? (
                <div className="py-24 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 size={28} className="animate-spin text-blue-600" />
                  <span className="text-xs font-semibold">Loading schedule...</span>
                </div>
              ) : scheduleTab === 'today' ? (
                /* TODAY SCHEDULE TAB */
                <div className="space-y-3.5">
                  {todayLectures.length > 0 ? (
                    todayLectures.map((lecture) => {
                      const isAttendanceMarked = Boolean(
                        lecture.attendance?.taken || 
                        lecture.attendanceTaken || 
                        (lecture as any).attendance_taken
                      );
                      const isCancelled = lecture.status?.toUpperCase() === 'CANCELLED';

                      // Determine lecture timeline / status badge
                      const now = new Date();
                      const currentMins = now.getHours() * 60 + now.getMinutes();
                      const parseMins = (t?: string) => {
                        if (!t) return null;
                        const [h, m] = t.slice(0, 5).split(':').map(Number);
                        return (h || 0) * 60 + (m || 0);
                      };
                      const startMins = parseMins(lecture.startTime);
                      const endMins = parseMins(lecture.endTime);

                      let statusBadge = {
                        label: 'Upcoming',
                        style: 'bg-blue-50 text-blue-600 border-blue-100'
                      };

                      if (isCancelled) {
                        statusBadge = {
                          label: 'Cancelled',
                          style: 'bg-rose-50 text-rose-600 border-rose-100'
                        };
                      } else if (isAttendanceMarked) {
                        statusBadge = {
                          label: 'Completed',
                          style: 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        };
                      } else if (startMins !== null && endMins !== null && currentMins >= startMins && currentMins < endMins) {
                        statusBadge = {
                          label: 'Ongoing',
                          style: 'bg-blue-50 text-blue-600 border-blue-100'
                        };
                      } else if (endMins !== null && currentMins >= endMins) {
                        statusBadge = {
                          label: 'Pending',
                          style: 'bg-amber-50 text-amber-700 border-amber-200'
                        };
                      }

                      return (
                        <div 
                          key={lecture.id} 
                          className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-blue-200 transition-colors shadow-sm"
                        >
                          <div>
                            <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                              <Clock size={14} className="text-slate-400" />
                              <span>{formatDisplayTime(lecture.startTime)} – {formatDisplayTime(lecture.endTime)}</span>
                            </div>
                            <div className="text-base font-semibold text-blue-700 mt-1">
                              {lecture.subject?.name || 'Subject'}
                            </div>
                            <div className="text-sm text-slate-600 mt-0.5 font-medium">
                              {lecture.batch?.name || 'Batch'}
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-xs font-semibold">
                              <span className="flex items-center gap-1 text-slate-600 bg-slate-200/60 px-2 py-0.5 rounded-md">
                                <MapPin size={12}/> {lecture.classroom?.name || lecture.classroom?.roomNumber || 'Room TBA'}
                              </span>
                              {isCancelled ? (
                                <span className="flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                                  <XCircle size={12}/> Lecture Cancelled
                                </span>
                              ) : isAttendanceMarked ? (
                                <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                  <CheckCircle size={12}/> Attendance Marked
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                                  <Clock size={12}/> Attendance Pending
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 w-full sm:w-auto">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded border text-center ${statusBadge.style}`}>
                              {statusBadge.label}
                            </span>
                            {isCancelled ? (
                              <Button 
                                variant="secondary" 
                                size="sm" 
                                disabled
                                className="w-full text-xs font-semibold opacity-60 cursor-not-allowed"
                              >
                                Cancelled
                              </Button>
                            ) : isAttendanceMarked ? (
                              <Button 
                                variant="secondary" 
                                size="sm" 
                                onClick={() => {
                                  navigate('/attendance', { 
                                    state: { 
                                      activeLecture: {
                                        ...lecture,
                                        date: lecture.date || (lecture as any).lectureDate || new Date().toISOString().split('T')[0],
                                        lectureDate: (lecture as any).lectureDate || lecture.date || new Date().toISOString().split('T')[0]
                                      },
                                      branch: lecture.branch?.name || currentUser?.branch || 'Mumbai West', 
                                      batch: lecture.batch?.name,
                                      date: lecture.date || (lecture as any).lectureDate || new Date().toISOString().split('T')[0]
                                    } 
                                  });
                                }}
                                className="w-full flex items-center justify-center gap-1 text-xs cursor-pointer hover:bg-slate-100 hover:text-blue-700 font-semibold"
                              >
                                <CheckCircle size={13} className="text-emerald-500"/> View Attendance
                              </Button>
                            ) : (
                              <Button 
                                variant="primary" 
                                size="sm" 
                                className="w-full text-xs font-semibold cursor-pointer"
                                onClick={() => {
                                  navigate('/attendance', { 
                                    state: { 
                                      activeLecture: {
                                        ...lecture,
                                        date: lecture.date || (lecture as any).lectureDate || new Date().toISOString().split('T')[0],
                                        lectureDate: (lecture as any).lectureDate || lecture.date || new Date().toISOString().split('T')[0]
                                      },
                                      branch: lecture.branch?.name || currentUser?.branch || 'Mumbai West', 
                                      batch: lecture.batch?.name,
                                      date: lecture.date || (lecture as any).lectureDate || new Date().toISOString().split('T')[0]
                                    } 
                                  });
                                }}
                              >
                                Mark Attendance
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-20 text-center flex flex-col items-center justify-center">
                      <Calendar className="text-slate-300 mb-3" size={36} />
                      <div className="text-slate-500 font-medium">No lectures scheduled for today.</div>
                      <p className="text-xs text-slate-400 mt-1">Check the Weekly Schedule tab to view upcoming classes.</p>
                    </div>
                  )}
                </div>
              ) : scheduleTab === 'weekly' ? (
                /* WEEKLY SCHEDULE TAB */
                <div className="space-y-4">
                  {(() => {
                    const now = new Date();
                    const dayOfWeek = now.getDay();
                    const diffToMon = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
                    const monday = new Date(now.setDate(diffToMon));
                    
                    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dName, idx) => {
                      const d = new Date(monday);
                      d.setDate(d.getDate() + idx);
                      const dateStr = d.toISOString().split('T')[0];
                      const dayLectures = weekLectures.filter(l => l.date === dateStr || l.day === dName)
                        .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
                      return {
                        name: dName,
                        dateStr,
                        dateNum: d.getDate(),
                        lectures: dayLectures
                      };
                    });

                    const hasAnyLectures = days.some(d => d.lectures.length > 0);

                    if (!hasAnyLectures && weekLectures.length === 0) {
                      return (
                        <div className="py-20 text-center flex flex-col items-center justify-center">
                          <Calendar className="text-slate-300 mb-3" size={36} />
                          <div className="text-slate-500 font-medium">No scheduled lectures found for this week.</div>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {days.map(dayObj => (
                          <div key={dayObj.name} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                            <div className="bg-slate-100 px-3.5 py-2 flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-200">
                              <span className="uppercase tracking-wider">{dayObj.name}</span>
                              <span className="text-[11px] text-slate-500 font-semibold">{dayObj.dateNum}</span>
                            </div>
                            <div className="p-2.5 space-y-2 min-h-[95px] bg-slate-50/50">
                              {dayObj.lectures.length > 0 ? (
                                dayObj.lectures.map((l) => (
                                  <div 
                                    key={l.id} 
                                    onClick={() => {
                                      navigate('/attendance', {
                                        state: {
                                          activeLecture: {
                                            ...l,
                                            date: l.date || dayObj.dateStr,
                                            lectureDate: l.date || dayObj.dateStr
                                          },
                                          branch: l.branch?.name || currentUser?.branch || 'Mumbai West',
                                          batch: l.batch?.name,
                                          date: l.date || dayObj.dateStr
                                        }
                                      });
                                    }}
                                    className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-xs hover:border-blue-400 hover:shadow-sm transition-all cursor-pointer group"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                        <Clock size={11} className="text-slate-400" />
                                        {formatDisplayTime(l.startTime)} – {formatDisplayTime(l.endTime)}
                                      </div>
                                      <span className="text-[10px] font-bold text-blue-600 group-hover:underline flex items-center gap-0.5">
                                        Mark Attendance
                                      </span>
                                    </div>
                                    <div className="text-xs font-semibold text-blue-700 truncate mt-0.5">
                                      {l.subject?.name || 'Subject'}
                                    </div>
                                    <div className="text-[10px] text-slate-500 truncate flex items-center justify-between mt-1">
                                      <span className="font-medium text-slate-600">{l.batch?.name}</span>
                                      <span className="text-slate-400 flex items-center gap-0.5">
                                        <MapPin size={9} /> {l.classroom?.name || l.classroom?.roomNumber || 'Room TBA'}
                                      </span>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="h-full flex items-center justify-center text-[10px] text-slate-400 font-semibold py-4">
                                  No Lectures
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* GRADE WORK TAB (Tests, Homework, Assignments) */
                <div className="space-y-3.5">
                  {/* Assessment Type Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 pb-1">
                    <button
                      type="button"
                      onClick={() => setAssessmentTypeFilter('all')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        assessmentTypeFilter === 'all'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      All ({assessmentCounts.all})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssessmentTypeFilter('exam')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        assessmentTypeFilter === 'exam'
                          ? 'bg-purple-700 text-white shadow-xs'
                          : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/60'
                      }`}
                    >
                      Tests ({assessmentCounts.exam})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssessmentTypeFilter('homework')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        assessmentTypeFilter === 'homework'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60'
                      }`}
                    >
                      Homework ({assessmentCounts.homework})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssessmentTypeFilter('assignment')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        assessmentTypeFilter === 'assignment'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60'
                      }`}
                    >
                      Assignments ({assessmentCounts.assignment})
                    </button>
                  </div>

                  {filteredAssessments.length > 0 ? (
                    <>
                      {displayedAssessments.map((item) => {
                        const total = item.totalCount || 0;
                        const graded = item.gradedSubmissionsCount || 0;
                        const pending = Math.max(0, total - graded);
                        const isAllGraded = total > 0 && graded >= total;
                        const pct = total > 0 ? Math.round((graded / total) * 100) : 0;
                        const aType = (item.assignmentType || '').toLowerCase();
                        const typeLabel = aType === 'exam' ? 'Test / Exam' : aType === 'homework' ? 'Homework' : 'Assignment';
                        const typeBadgeClass = aType === 'exam' 
                          ? 'bg-purple-100 text-purple-800 border-purple-200' 
                          : aType === 'homework' 
                          ? 'bg-amber-100 text-amber-800 border-amber-200' 
                          : 'bg-blue-100 text-blue-800 border-blue-200';

                        return (
                          <div 
                            key={item.id} 
                            className="p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-300 transition-all shadow-sm space-y-3 group"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border ${typeBadgeClass}`}>
                                    {typeLabel}
                                  </span>
                                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200/70 text-slate-700 border border-slate-300/60">
                                    {item.subjectName || 'Subject'}
                                  </span>
                                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200">
                                    <Calendar size={12} className="text-slate-400" />
                                    {item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBA'}
                                  </span>
                                </div>
                                <h4 
                                  onClick={() => handleGradeRedirect(item)}
                                  className="text-base font-bold text-slate-900 mt-1.5 leading-snug group-hover:text-blue-600 transition-colors cursor-pointer"
                                >
                                  {item.title}
                                </h4>
                                <p className="text-xs text-slate-600 font-medium mt-1 flex items-center gap-1">
                                  <span className="text-slate-400 font-normal">Batches:</span> 
                                  <span className="font-semibold text-slate-800">{item.batchNames?.join(', ') || 'Assigned Batches'}</span>
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Award size={13} className="text-amber-600" />
                                  Max: {item.maxMarks || 100}
                                </span>
                              </div>
                            </div>

                            {/* Progress and status */}
                            <div className="bg-white p-3 rounded-lg border border-slate-200/90 space-y-1.5">
                              <div className="flex items-center justify-between text-xs font-medium">
                                <span className="text-slate-600">Evaluation Progress</span>
                                <span className="font-bold text-slate-900">
                                  {graded} / {total} graded ({pct}%)
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${isAllGraded ? 'bg-emerald-500' : 'bg-blue-600'}`} 
                                  style={{ width: `${pct}%` }} 
                                />
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                                <span className="font-medium text-slate-600">
                                  {isAllGraded ? (
                                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                      <CheckCircle size={11} /> All students graded
                                    </span>
                                  ) : (
                                    <span className="text-amber-600 font-semibold">
                                      {pending} pending evaluation
                                    </span>
                                  )}
                                </span>
                                <span className="text-slate-400">
                                  Class Avg: <span className="font-semibold text-slate-700">{item.classAveragePercentage ? `${Number(item.classAveragePercentage).toFixed(1)}%` : '—'}</span>
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[11px] text-slate-400 font-medium">
                                {item.status === 'Closed' ? 'Closed' : 'Active'}
                              </span>
                              <Button
                                variant={isAllGraded ? "secondary" : "primary"}
                                size="sm"
                                className="text-xs flex items-center gap-1.5 font-semibold cursor-pointer shadow-xs"
                                onClick={() => handleGradeRedirect(item)}
                              >
                                <Edit3 size={13} />
                                {isAllGraded ? 'Review / Edit Grades' : 'Grade Students'}
                              </Button>
                            </div>
                          </div>
                        );
                      })}

                      {/* View All / Show Less Toggle Bar */}
                      {filteredAssessments.length > 2 && (
                        <div className="pt-2.5 pb-1 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-200/80">
                          <span className="text-xs text-slate-500 font-medium">
                            {showAllAssessments
                              ? `Showing all ${filteredAssessments.length} assessments`
                              : `Showing latest 2 of ${filteredAssessments.length} assessments`}
                          </span>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setShowAllAssessments(!showAllAssessments)}
                              className="text-xs font-semibold px-3 py-1.5 flex items-center gap-1.5 cursor-pointer hover:bg-slate-200/80 shadow-2xs"
                            >
                              {showAllAssessments ? (
                                <>
                                  <ChevronUp size={13} />
                                  Show Less
                                </>
                              ) : (
                                <>
                                  <ChevronDown size={13} />
                                  View All ({filteredAssessments.length})
                                </>
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate('/assignments')}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2.5 py-1.5 cursor-pointer"
                            >
                              Manage All →
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="py-20 text-center flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                        <GraduationCap size={26} />
                      </div>
                      <div className="text-slate-700 font-bold text-base">No {assessmentTypeFilter === 'all' ? 'assessments' : assessmentTypeFilter} found.</div>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs">
                        Tests, homeworks, or assignments assigned to your batches will appear here for student grading.
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="mt-4 text-xs cursor-pointer"
                        onClick={() => navigate('/assignments')}
                      >
                        Go to Assessments
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

    </div>
  );
};
export default TeacherDashboard;
