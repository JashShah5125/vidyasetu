import React, { useState, useEffect, useCallback } from 'react';
import { useDashboard } from './useDashboard';
import type { DashboardQueryParams } from './types';
import type { DashboardHeaderFilters, DatePreset } from './header/DashboardHeader';
import DashboardHeader from './header/DashboardHeader';
import ExecutiveKpiRow from './kpis/ExecutiveKpiRow';
import AttentionSection from './attention/AttentionSection';
import StudentAttendanceChart from './attendance/StudentAttendanceChart';
import StaffAttendanceChart from './attendance/StaffAttendanceChart';
import AdmissionsTrendChart from './growth/AdmissionsTrendChart';
import UpcomingExamsTable from './academic/UpcomingExamsTable';
import IncomeExpenseChart from './finance/IncomeExpenseChart';
import ExpenseBreakdownChart from './finance/ExpenseBreakdownChart';
import { useAuth } from '../../../context/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// Date preset helpers
// ─────────────────────────────────────────────────────────────────────────────
const isoDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const computeDates = (preset: DatePreset): { from: string; to: string } => {
  const today = new Date();
  const todayStr = isoDate(today);

  if (preset === 'daily') {
    return { from: todayStr, to: todayStr };
  }
  if (preset === 'weekly') {
    const mon = new Date(today);
    const dayOfWeek = today.getDay();
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    mon.setDate(today.getDate() + diffToMon);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { from: isoDate(mon), to: isoDate(sun) };
  }
  // Default: monthly
  return { from: isoDate(new Date(today.getFullYear(), today.getMonth(), 1)), to: todayStr };
};

const STORAGE_KEY = 'inst_dashboard_v3_filters';

const defaultFilters = (): DashboardHeaderFilters => {
  const today = new Date();
  return {
    academicYearId: 'all',
    branchId: 'all',
    courseId: 'all',
    programId: 'all',
    levelId: 'all',
    batchId: 'all',
    preset: 'monthly',
    from: isoDate(new Date(today.getFullYear(), today.getMonth(), 1)),
    to: isoDate(today),
  };
};

const loadSavedFilters = (): DashboardHeaderFilters => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultFilters();
    const parsed = JSON.parse(raw);
    const validPreset: DatePreset =
      parsed.preset === 'daily' || parsed.preset === 'weekly' || parsed.preset === 'monthly'
        ? parsed.preset
        : 'monthly';
    const dates = computeDates(validPreset);
    return { ...defaultFilters(), ...parsed, preset: validPreset, ...dates };
  } catch {
    return defaultFilters();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Main orchestrator component
// ─────────────────────────────────────────────────────────────────────────────
const InstituteDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const isBranchAdmin = currentUser?.role === 'branch-admin';

  const [filters, setFilters] = useState<DashboardHeaderFilters>(loadSavedFilters);

  // Keep filters in sync with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch { /* ignore */ }
  }, [filters]);

  // Branch-admin: lock to their branch
  useEffect(() => {
    if (isBranchAdmin && currentUser?.branch) {
      setFilters(f => ({ ...f, branchId: String(currentUser.branch) }));
    }
  }, [isBranchAdmin, currentUser?.branch]);

  const handleFilterChange = useCallback((partial: Partial<DashboardHeaderFilters>) => {
    setFilters(f => {
      const merged = { ...f, ...partial };
      // When preset changes, recompute dates
      if (partial.preset) {
        const dates = computeDates(partial.preset);
        return { ...merged, ...dates };
      }
      return merged;
    });
  }, []);

  // Build query params for the hook
  const queryParams: DashboardQueryParams = {
    from: filters.from,
    to: filters.to,
    branchId: filters.branchId !== 'all' ? filters.branchId : null,
    academicYearId: filters.academicYearId !== 'all' ? filters.academicYearId : null,
    courseId: filters.courseId !== 'all' ? filters.courseId : null,
    programId: filters.programId !== 'all' ? filters.programId : null,
    levelId: filters.levelId !== 'all' ? filters.levelId : null,
    batchId: filters.batchId !== 'all' ? filters.batchId : null,
  };

  const { data, loading, error, refetch } = useDashboard(queryParams);

  const filterOptions = {
    branches: data?.filters?.branches ?? [],
    academicYears: data?.filters?.academicYears ?? [],
    courses: data?.filters?.courses ?? [],
    programs: data?.filters?.programs ?? [],
    levels: data?.filters?.levels ?? [],
    batches: data?.filters?.batches ?? [],
  };

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      {/* ── Header + Academic Hierarchy Filter Bar ─────────────────── */}
      <DashboardHeader
        filters={filters}
        onChange={handleFilterChange}
        branches={filterOptions.branches}
        academicYears={filterOptions.academicYears}
        courses={filterOptions.courses}
        programs={filterOptions.programs}
        levels={filterOptions.levels}
        batches={filterOptions.batches}
        lastUpdated={data?.meta?.lastUpdated}
        loading={loading}
        onRefresh={refetch}
        isBranchAdmin={isBranchAdmin}
      />

      {/* Error banner */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2">
          <span className="font-bold">Error:</span> {error}
        </div>
      )}

      {/* ── Section 1: Executive KPI StatCards (Filtered by hierarchy) ── */}
      <ExecutiveKpiRow kpis={data?.kpis} loading={loading} />

      {/* ── Section 2: Actionable Operations Alerts ─────────────────── */}
      <AttentionSection data={data?.attentionRequired} loading={loading} />

      {/* ── Section 3: Attendance Turnout & Intake Trend ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StudentAttendanceChart data={data?.studentAttendance} loading={loading} />
        <StaffAttendanceChart data={data?.staffAttendance} loading={loading} />
        <AdmissionsTrendChart data={data?.admissionsTrend} loading={loading} />
      </div>

      {/* ── Section 4: Financial Inflows & Outflows ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <IncomeExpenseChart data={data?.financialOverview} loading={loading} />
        <ExpenseBreakdownChart data={data?.expenseBreakdown} loading={loading} />
      </div>

      {/* ── Section 5: Upcoming Examinations (Top 3 Date-wise) ──────── */}
      <UpcomingExamsTable data={data?.upcomingExams} loading={loading} />
    </div>
  );
};

export default InstituteDashboard;
