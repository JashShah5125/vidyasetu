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
  Loader2
} from 'lucide-react';
import { teacherScheduleApi } from '../../services/teacherScheduleApi';
import type { TeacherScheduleOptions, TeacherScheduleLecture } from '../../services/teacherScheduleApi';
import { doubtApi } from '../../services/doubtApi';
import type { DoubtItem } from '../../services/doubtApi';
import { teacherHomeworkApi } from '../../services/teacherHomeworkApi';

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

  // Operational Data
  const [todayLectures, setTodayLectures] = useState<TeacherScheduleLecture[]>([]);
  const [weekLectures, setWeekLectures] = useState<TeacherScheduleLecture[]>([]);
  const [doubts, setDoubts] = useState<DoubtItem[]>([]);
  const [selectedDoubtDetail, setSelectedDoubtDetail] = useState<DoubtItem | null>(null);
  const [classAverageScore, setClassAverageScore] = useState<string>('83.8%');

  // UI / Tab & Modal States
  const [scheduleTab, setScheduleTab] = useState<'today' | 'weekly'>('today');
  const [doubtFilter, setDoubtFilter] = useState<'All' | 'Pending' | 'Resolved'>('All');
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [activeDoubtId, setActiveDoubtId] = useState<number | null>(null);
  const [responseText, setResponseText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

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

  // 3. Fetch Teacher Dashboard Data (Today Lectures, Week Schedule, Doubts, Homework Stats)
  const loadDashboardData = useCallback(async () => {
    try {
      setLoadingData(true);

      const batchFilterParam = filterBatch !== 'All' ? filterBatch : undefined;
      const branchFilterParam = filterBranch !== 'All' ? filterBranch : undefined;

      const [todayRes, weekRes, doubtsRes, homeworksRes] = await Promise.allSettled([
        teacherScheduleApi.getToday(undefined, { batchId: batchFilterParam, branchId: branchFilterParam }),
        teacherScheduleApi.getWeek(undefined, undefined, { batchId: batchFilterParam, branchId: branchFilterParam }),
        doubtApi.getTeacherDoubts({ batchId: batchFilterParam }),
        teacherHomeworkApi.getHomeworks({ limit: 10 })
      ]);

      if (todayRes.status === 'fulfilled' && todayRes.value) {
        setTodayLectures(todayRes.value.lectures || []);
      }

      if (weekRes.status === 'fulfilled' && weekRes.value) {
        setWeekLectures(weekRes.value.lectures || []);
      }

      if (doubtsRes.status === 'fulfilled' && doubtsRes.value) {
        setDoubts(doubtsRes.value || []);
      }

      if (homeworksRes.status === 'fulfilled' && homeworksRes.value?.data) {
        const hws = homeworksRes.value.data;
        const withGraded = hws.filter((h: any) => h.gradedSubmissionsCount && h.gradedSubmissionsCount > 0);
        if (withGraded.length > 0) {
          const avg = withGraded.reduce((acc: number, cur: any) => acc + (cur.classAveragePercentage || 80), 0) / withGraded.length;
          setClassAverageScore(`${avg.toFixed(1)}%`);
        } else {
          setClassAverageScore('83.8%');
        }
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

  // Doubts Filter & Pagination
  const filteredDoubts = useMemo(() => {
    if (!doubts) return [];
    return doubts.filter(d => {
      if (doubtFilter === 'Pending') {
        return d.status === 0 || d.status === 1 || d.statusLabel === 'Open' || d.statusLabel === 'In Progress';
      }
      if (doubtFilter === 'Resolved') {
        return d.status === 2 || d.statusLabel === 'Resolved';
      }
      return true;
    });
  }, [doubts, doubtFilter]);

  const pendingDoubtsCount = useMemo(() => {
    if (!doubts) return 0;
    return doubts.filter(d => d.status === 0 || d.status === 1 || d.statusLabel === 'Open' || d.statusLabel === 'In Progress').length;
  }, [doubts]);

  const paginatedDoubts = useMemo(() => {
    return filteredDoubts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredDoubts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil((filteredDoubts.length || 0) / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [doubtFilter, filterBatch, filterBranch]);

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">
            Faculty Academic Portal
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Welcome back, <strong className="font-semibold text-slate-800">{currentUser?.name || 'Faculty Member'}</strong>. Answer student questions and review schedule timelines.
          </p>
        </div>
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={() => loadDashboardData()}
          disabled={loadingData}
          className="flex items-center gap-1.5 shadow-sm"
        >
          <RefreshCw size={14} className={loadingData ? 'animate-spin text-blue-600' : ''} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Global Cascade Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
        <Select 
          label="Branch" 
          value={filterBranch} 
          onChange={(e) => setFilterBranch(e.target.value)} 
          options={[
            { value: 'All', label: 'All Branches' }, 
            ...(options.branches || []).map(b => ({ value: String(b.id), label: b.name }))
          ]}
        />
        <Select 
          label="Course" 
          value={filterCourse} 
          onChange={(e) => setFilterCourse(e.target.value)} 
          options={[
            { value: 'All', label: 'All Courses' }, 
            ...(options.courses || []).map(c => ({ value: String(c.id), label: c.name }))
          ]}
        />
        <Select 
          label="Program" 
          value={filterProgram} 
          onChange={(e) => setFilterProgram(e.target.value)} 
          options={[
            { value: 'All', label: 'All Programs' }, 
            ...availablePrograms.map(p => ({ value: String(p.id), label: p.name }))
          ]}
        />
        <Select 
          label="Level" 
          value={filterLevel} 
          onChange={(e) => setFilterLevel(e.target.value)} 
          options={[
            { value: 'All', label: 'All Levels' }, 
            ...availableLevels.map(l => ({ value: String(l.id), label: l.name }))
          ]}
        />
        <Select 
          label="Academic Year" 
          value={filterYear} 
          onChange={(e) => setFilterYear(e.target.value)} 
          options={[
            { value: 'All', label: 'All Years' }, 
            ...(options.academicYears || []).map(y => ({ value: String(y.id), label: y.name }))
          ]}
        />
        <Select 
          label="Target Batch" 
          value={filterBatch} 
          onChange={(e) => setFilterBatch(e.target.value)} 
          options={[
            { value: 'All', label: 'All Batches' }, 
            ...availableBatches.map(b => ({ value: String(b.id), label: b.name }))
          ]}
        />
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Batches</div>
              <div className="text-3xl font-display font-bold text-slate-900 mt-1">
                {filterBatch !== 'All' ? 1 : availableBatches.length || options.batches?.length || 0}
              </div>
            </div>
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100 shadow-sm">
              <BookOpen size={22} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Lectures Today</div>
              <div className="text-3xl font-display font-bold text-slate-900 mt-1">
                {todayLectures.length}
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100 shadow-sm">
              <Calendar size={22} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pending Doubts</div>
              <div className="text-3xl font-display font-bold text-slate-900 mt-1">
                {pendingDoubtsCount}
              </div>
            </div>
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100 shadow-sm">
              <HelpCircle size={22} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Class Average Score</div>
              <div className="text-3xl font-display font-bold text-slate-900 mt-1">
                {classAverageScore}
              </div>
            </div>
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center border border-purple-100 shadow-sm">
              <GraduationCap size={22} />
            </div>
          </div>
        </Card>
      </div>

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
              ) : paginatedDoubts.length > 0 ? (
                paginatedDoubts.map((d) => {
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

                      <div className="text-sm font-semibold text-slate-900 leading-snug">
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

                      {!isResolved && (
                        <div className="flex justify-end pt-1">
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => handleOpenAnswerModal(d.id)}
                            className="flex items-center gap-1.5 text-xs font-semibold shadow-sm"
                          >
                            <MessageSquare size={13} className="text-blue-600" />
                            <span>Answer Question</span>
                          </Button>
                        </div>
                      )}
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

            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-500 shadow-sm select-none mt-3 flex-shrink-0">
                <div>
                  Showing <span className="text-slate-800 font-bold">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredDoubts.length)}</span> to <span className="text-slate-800 font-bold">{Math.min(currentPage * itemsPerPage, filteredDoubts.length)}</span> of <span className="text-slate-800 font-bold">{filteredDoubts.length}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    Prev
                  </button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCurrentPage(i + 1)}
                      className={`px-2.5 py-1 rounded-lg border cursor-pointer transition-colors ${
                        currentPage === i + 1
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm font-bold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
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
                      const isCompleted = lecture.status === 'COMPLETED' || lecture.attendance?.taken;
                      return (
                        <div 
                          key={lecture.id} 
                          className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-blue-200 transition-colors shadow-sm"
                        >
                          <div>
                            <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                              <Clock size={14} className="text-slate-400" />
                              <span>{lecture.startTime} – {lecture.endTime}</span>
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
                              {isCompleted ? (
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
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded border text-center ${
                              isCompleted
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                : 'bg-blue-50 text-blue-600 border-blue-100'
                            }`}>
                              {isCompleted ? 'Completed' : 'Upcoming'}
                            </span>
                            {isCompleted ? (
                              <Button 
                                variant="secondary" 
                                size="sm" 
                                disabled 
                                className="w-full flex items-center justify-center gap-1 opacity-75 cursor-default text-xs"
                              >
                                <CheckCircle size={13} className="text-emerald-500"/> Marked
                              </Button>
                            ) : (
                              <Button 
                                variant="primary" 
                                size="sm" 
                                className="w-full text-xs"
                                onClick={() => {
                                  navigate('/attendance', { 
                                    state: { 
                                      activeLecture: lecture,
                                      branch: lecture.branch?.name || currentUser?.branch || 'Mumbai West', 
                                      batch: lecture.batch?.name,
                                      date: lecture.date || new Date().toISOString().split('T')[0]
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
              ) : (
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
                                  <div key={l.id} className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-xs hover:border-blue-300 transition-colors">
                                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                      <Clock size={11} className="text-slate-400" />
                                      {l.startTime} - {l.endTime}
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
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
export default TeacherDashboard;
