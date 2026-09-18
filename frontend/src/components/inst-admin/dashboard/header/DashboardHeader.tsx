import React, { useState } from 'react';
import { RefreshCw, Filter, X, ChevronDown, RotateCcw } from 'lucide-react';
import type {
  DashboardFiltersOption,
  DashboardProgramOption,
  DashboardLevelOption,
  DashboardBatchOption
} from '../types';

export type DatePreset = 'daily' | 'weekly' | 'monthly';

export interface DashboardHeaderFilters {
  academicYearId: string;
  branchId: string;
  courseId: string;
  programId: string;
  levelId: string;
  batchId: string;
  preset: DatePreset;
  from: string;
  to: string;
}

interface DashboardHeaderProps {
  filters: DashboardHeaderFilters;
  onChange: (f: Partial<DashboardHeaderFilters>) => void;
  branches: DashboardFiltersOption[];
  academicYears: DashboardFiltersOption[];
  courses: DashboardFiltersOption[];
  programs?: DashboardProgramOption[];
  levels?: DashboardLevelOption[];
  batches?: DashboardBatchOption[];
  lastUpdated?: string;
  loading?: boolean;
  onRefresh?: () => void;
  isBranchAdmin?: boolean;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  filters,
  onChange,
  branches,
  academicYears,
  courses,
  programs = [],
  levels = [],
  batches = [],
  loading,
  onRefresh,
  isBranchAdmin,
}) => {
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  // Cascading options
  const filteredPrograms = React.useMemo(() => {
    if (!filters.courseId || filters.courseId === 'all') return programs;
    return programs.filter(p => String(p.course_id) === filters.courseId);
  }, [programs, filters.courseId]);

  const filteredLevels = React.useMemo(() => {
    if (!filters.programId || filters.programId === 'all') return levels;
    return levels.filter(l => String(l.program_id) === filters.programId);
  }, [levels, filters.programId]);

  const filteredBatches = React.useMemo(() => {
    const selectedAY = academicYears.find(a => String(a.id) === filters.academicYearId);
    return batches.filter(b => {
      if (filters.levelId && filters.levelId !== 'all' && String(b.level_id) !== filters.levelId) return false;
      if (filters.branchId && filters.branchId !== 'all' && String(b.branch_id) !== filters.branchId) return false;
      if (filters.academicYearId && filters.academicYearId !== 'all') {
        if (selectedAY && b.academic_year_id) {
          const batchAY = academicYears.find(ay => ay.id === b.academic_year_id);
          if (batchAY && batchAY.name !== selectedAY.name) return false;
          if (!batchAY && String(b.academic_year_id) !== filters.academicYearId) return false;
        } else if (String(b.academic_year_id) !== filters.academicYearId) {
          return false;
        }
      }
      return true;
    });
  }, [batches, filters.levelId, filters.branchId, filters.academicYearId, academicYears]);

  // Calculate active filter count (excluding default 'all')
  const activeFilters = React.useMemo(() => {
    const list: { label: string; value: string; clear: () => void }[] = [];
    if (filters.academicYearId !== 'all') {
      const ay = academicYears.find(a => String(a.id) === filters.academicYearId);
      list.push({ label: 'Year', value: ay?.name || filters.academicYearId, clear: () => onChange({ academicYearId: 'all' }) });
    }
    if (!isBranchAdmin && filters.branchId !== 'all') {
      const br = branches.find(b => String(b.id) === filters.branchId);
      list.push({ label: 'Branch', value: br?.name || filters.branchId, clear: () => onChange({ branchId: 'all' }) });
    }
    if (filters.courseId !== 'all') {
      const c = courses.find(item => String(item.id) === filters.courseId);
      list.push({ label: 'Course', value: c?.name || filters.courseId, clear: () => onChange({ courseId: 'all', programId: 'all', levelId: 'all', batchId: 'all' }) });
    }
    if (filters.programId !== 'all') {
      const p = programs.find(item => String(item.id) === filters.programId);
      list.push({ label: 'Program', value: p?.name || filters.programId, clear: () => onChange({ programId: 'all', levelId: 'all', batchId: 'all' }) });
    }
    if (filters.levelId !== 'all') {
      const l = levels.find(item => String(item.id) === filters.levelId);
      list.push({ label: 'Level', value: l?.name || filters.levelId, clear: () => onChange({ levelId: 'all', batchId: 'all' }) });
    }
    if (filters.batchId !== 'all') {
      const b = batches.find(item => String(item.id) === filters.batchId);
      list.push({ label: 'Batch', value: b?.name || filters.batchId, clear: () => onChange({ batchId: 'all' }) });
    }
    return list;
  }, [filters, academicYears, branches, courses, programs, levels, batches, isBranchAdmin, onChange]);

  const selectClass =
    'w-full h-8 text-xs font-semibold bg-slate-50 hover:bg-white border border-slate-200 text-slate-800 rounded-xl px-2.5 pr-7 appearance-none cursor-pointer ' +
    'hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 focus:bg-white transition-all shadow-xs';

  return (
    <div className="space-y-3 mb-5">
      {/* ── Top Header Row ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pt-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {isBranchAdmin ? 'Branch Dashboard' : 'Institute Analytics'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isBranchAdmin
              ? 'Real-time academic performance, attendance, collections, and branch overview.'
              : 'Real-time academic performance, attendance, collections, and multi-branch overview.'}
          </p>
        </div>

        {/* ── Top-Right Controls: Filter Toggle + Week/Month Toggle + Refresh ── */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
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
              onClick={() => onChange({ preset: 'daily' })}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 ${
                filters.preset === 'daily'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => onChange({ preset: 'weekly' })}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 ${
                filters.preset === 'weekly'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => onChange({ preset: 'monthly' })}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 ${
                filters.preset === 'monthly'
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
            onClick={onRefresh}
            disabled={loading}
            title="Refresh dashboard data"
            className="group flex items-center gap-1.5 h-8 px-2.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={13} className={`transition-transform duration-500 ${loading ? 'animate-spin text-slate-400' : 'text-slate-500 group-hover:rotate-180 group-hover:text-slate-700'}`} />
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
            onClick={() => onChange({
              academicYearId: 'all',
              ...(isBranchAdmin ? {} : { branchId: 'all' }),
              courseId: 'all',
              programId: 'all',
              levelId: 'all',
              batchId: 'all',
            })}
            className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer ml-1 transition-all"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Expandable Filter Panel (opens directly on the dashboard before KPI cards) ── */}
      {isFilterExpanded && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm animate-fade-in space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                <Filter size={12} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block leading-tight">Filter Academic & Branch Data</span>
                <span className="text-[10px] text-slate-400 block">Select course, program, level, batch or branch to filter all KPI cards</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {activeFilters.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange({
                    academicYearId: 'all',
                    ...(isBranchAdmin ? {} : { branchId: 'all' }),
                    courseId: 'all',
                    programId: 'all',
                    levelId: 'all',
                    batchId: 'all',
                  })}
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
                  value={filters.academicYearId}
                  onChange={e => onChange({ academicYearId: e.target.value })}
                  className={selectClass}
                >
                  <option value="all">All Years</option>
                  {academicYears.map(ay => (
                    <option key={ay.id} value={String(ay.id)}>{ay.name}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">▼</span>
              </div>
            </div>

            {/* Branch (hidden if user is branch-locked) */}
            {!isBranchAdmin && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Branch
                </label>
                <div className="relative">
                  <select
                    value={filters.branchId}
                    onChange={e => onChange({ branchId: e.target.value, batchId: 'all' })}
                    className={selectClass}
                  >
                    <option value="all">All Branches</option>
                    {branches.map(b => (
                      <option key={b.id} value={String(b.id)}>{b.name}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">▼</span>
                </div>
              </div>
            )}

            {/* Course */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Course
              </label>
              <div className="relative">
                <select
                  value={filters.courseId}
                  onChange={e => onChange({ courseId: e.target.value, programId: 'all', levelId: 'all', batchId: 'all' })}
                  className={selectClass}
                >
                  <option value="all">All Courses</option>
                  {courses.map(c => (
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
                  value={filters.programId}
                  onChange={e => onChange({ programId: e.target.value, levelId: 'all', batchId: 'all' })}
                  className={selectClass}
                >
                  <option value="all">All Programs</option>
                  {filteredPrograms.map(p => (
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
                  value={filters.levelId}
                  onChange={e => onChange({ levelId: e.target.value, batchId: 'all' })}
                  className={selectClass}
                >
                  <option value="all">All Levels</option>
                  {filteredLevels.map(l => (
                    <option key={l.id} value={String(l.id)}>{l.name}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">▼</span>
              </div>
            </div>

            {/* Batch */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Batch
              </label>
              <div className="relative">
                <select
                  value={filters.batchId}
                  onChange={e => onChange({ batchId: e.target.value })}
                  className={selectClass}
                >
                  <option value="all">All Batches</option>
                  {filteredBatches.map(b => (
                    <option key={b.id} value={String(b.id)}>{b.name}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">▼</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardHeader;
