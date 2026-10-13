import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '../ui/Card';
import { Table } from '../ui/Table';
import { Button } from '../ui/Button';
import { Pagination } from '../ui/Pagination';
import { useApp } from '../../context/AppContext';
import {
  staffSalaryApi,
  type StaffSalaryMasterItem
} from '../../services/staffSalaryApi';
import { StaffSalaryHistoryView } from './StaffSalaryHistoryView';
import { EditStaffSalaryView } from './EditStaffSalaryView';
import {
  Users,
  Search,
  Filter,
  DollarSign,
  Calendar,
  Pencil,
  Eye,
  Loader2,
  Building2,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  Layers,
  ArrowUpDown,
  RotateCcw,
  ChevronDown,
  X,
  BadgeCheck,
  TrendingUp
} from 'lucide-react';
import { formatDate } from '../../utils/dateFormatter';

const fmt = (n: number) => '₹' + (Number(n) || 0).toLocaleString('en-IN');

const getEmployeeTypeBadge = (type?: string) => {
  switch (type?.toLowerCase()) {
    case 'teaching':
      return {
        bg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
        dot: 'bg-indigo-500',
        label: 'Teaching'
      };
    case 'non-teaching':
      return {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        dot: 'bg-emerald-500',
        label: 'Non-Teaching'
      };
    case 'administration':
      return {
        bg: 'bg-amber-50 text-amber-700 border-amber-200/80',
        dot: 'bg-amber-500',
        label: 'Administration'
      };
    case 'counsellor':
      return {
        bg: 'bg-purple-50 text-purple-700 border-purple-200/80',
        dot: 'bg-purple-500',
        label: 'Counsellor'
      };
    case 'management':
      return {
        bg: 'bg-rose-50 text-rose-700 border-rose-200/80',
        dot: 'bg-rose-500',
        label: 'Management'
      };
    default:
      return {
        bg: 'bg-slate-100 text-slate-700 border-slate-200',
        dot: 'bg-slate-400',
        label: type || 'Staff'
      };
  }
};

interface StaffSalaryMasterViewProps {
  branchFilter?: string;
  branchOptions?: { value: string; label: string }[];
  onBranchChange?: (branchId: string) => void;
  onNavigateToStatus?: () => void;
  onDetailViewChange?: (isActive: boolean) => void;
}

export const StaffSalaryMasterView: React.FC<StaffSalaryMasterViewProps> = ({
  branchFilter = 'All',
  branchOptions = [],
  onBranchChange,
  onNavigateToStatus,
  onDetailViewChange
}) => {
  const { addToast } = useApp();

  const [staffList, setStaffList] = useState<StaffSalaryMasterItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [employeeTypeFilter, setEmployeeTypeFilter] = useState<string>('All');
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const limit = 15;

  // In-Page View State
  const [editingStaff, setEditingStaff] = useState<StaffSalaryMasterItem | null>(null);
  const [historyStaffId, setHistoryStaffId] = useState<number | null>(null);

  useEffect(() => {
    const isDetail = Boolean(editingStaff || historyStaffId);
    onDetailViewChange?.(isDetail);
    if (isDetail) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      const mainContainer = document.getElementById('main-scroll-container');
      if (mainContainer) {
        mainContainer.scrollTop = 0;
      }
    }
  }, [editingStaff, historyStaffId, onDetailViewChange]);

  const fetchStaffSalaries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await staffSalaryApi.getStaffSalariesMaster({
        search: searchTerm.trim() || undefined,
        employeeType: employeeTypeFilter !== 'All' ? employeeTypeFilter : undefined,
        branchId: branchFilter !== 'All' ? branchFilter : undefined,
        page,
        limit
      });

      if (res.success && Array.isArray(res.data)) {
        setStaffList(res.data);
        setTotal(res.pagination?.total || res.data.length);
      } else {
        setStaffList([]);
        setTotal(0);
      }
    } catch (err: any) {
      console.error('Error fetching master staff salaries:', err);
      addToast(
        err?.response?.data?.message || err.message || 'Failed to load staff salary structure.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  }, [searchTerm, employeeTypeFilter, branchFilter, page, addToast]);

  useEffect(() => {
    fetchStaffSalaries();
  }, [fetchStaffSalaries]);

  // Quick stats calculation
  const stats = useMemo(() => {
    const totalStaff = total;
    const totalAllocated = staffList.reduce((acc, curr) => acc + Number(curr.salary_amount || 0), 0);
    const avgSalary = staffList.length > 0 ? Math.round(totalAllocated / staffList.length) : 0;
    return { totalStaff, totalAllocated, avgSalary };
  }, [staffList, total]);

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
    employeeTypeFilter !== 'All' ||
    (branchFilter !== 'All' && branchOptions.length > 2)
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setEmployeeTypeFilter('All');
    if (onBranchChange && branchFilter !== 'All') {
      onBranchChange('All');
    }
    setPage(1);
  };

  // If in-page Edit View is active
  if (editingStaff) {
    return (
      <EditStaffSalaryView
        key={editingStaff.id}
        staff={editingStaff}
        onBack={() => setEditingStaff(null)}
        onSuccess={() => {
          setEditingStaff(null);
          fetchStaffSalaries();
        }}
        addToast={(toast) => {
          if (typeof toast === 'string') {
            addToast(toast);
          } else {
            addToast(toast.message, toast.type);
          }
        }}
      />
    );
  }

  // If in-page History View is active
  if (historyStaffId) {
    return (
      <StaffSalaryHistoryView
        key={historyStaffId}
        staffId={historyStaffId}
        onBack={() => setHistoryStaffId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Modern Elevated 3-Column KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Active Staff */}
        <div className="group relative overflow-hidden bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200">
          <div className="absolute top-0 right-0 w-32 h-32 bg-radial from-blue-500/10 via-transparent to-transparent rounded-full -mr-8 -mt-8 pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Active Staff
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center ring-4 ring-blue-50/60 shadow-xs transition-transform group-hover:scale-105">
              <Users size={20} className="stroke-[2.2]" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 tracking-tight">
            {stats.totalStaff}{' '}
            <span className="text-sm font-semibold text-slate-500 font-sans">Members</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>Across all designations & departments</span>
          </div>
        </div>

        {/* Total Monthly Basic */}
        <div className="group relative overflow-hidden bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200">
          <div className="absolute top-0 right-0 w-32 h-32 bg-radial from-emerald-500/10 via-transparent to-transparent rounded-full -mr-8 -mt-8 pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Monthly Baseline
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center ring-4 ring-emerald-50/60 shadow-xs transition-transform group-hover:scale-105">
              <DollarSign size={20} className="stroke-[2.2]" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-700 tracking-tight">
            {fmt(stats.totalAllocated)}{' '}
            <span className="text-xs font-semibold text-emerald-600 font-sans">/ month</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Committed master compensation</span>
          </div>
        </div>

        {/* Avg Basic Salary */}
        <div className="group relative overflow-hidden bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200">
          <div className="absolute top-0 right-0 w-32 h-32 bg-radial from-indigo-500/10 via-transparent to-transparent rounded-full -mr-8 -mt-8 pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Avg. Monthly Compensation
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center ring-4 ring-indigo-50/60 shadow-xs transition-transform group-hover:scale-105">
              <Briefcase size={20} className="stroke-[2.2]" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 tracking-tight">
            {fmt(stats.avgSalary)}{' '}
            <span className="text-xs font-semibold text-slate-500 font-sans">/ staff</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span>Average remuneration per member</span>
          </div>
        </div>
      </div>

      {/* ── Modern Elevated Filter & Search Bar ── */}
      <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[240px] max-w-sm flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Search staff by name, ID, designation..."
              className="w-full pl-10 pr-8 py-2 text-sm bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200/90 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Employee Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type:</span>
            <div className="relative">
              <select
                value={employeeTypeFilter}
                onChange={(e) => {
                  setEmployeeTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="appearance-none pl-3 pr-8 py-2 text-xs font-semibold bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer transition-all"
              >
                <option value="All">All Types</option>
                <option value="Teaching">Teaching / Faculty</option>
                <option value="Non-Teaching">Non-Teaching</option>
                <option value="Administration">Administration</option>
                <option value="Counsellor">Counsellor</option>
                <option value="Management">Management</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Branch Filter if multi-branch */}
          {branchOptions.length > 2 && onBranchChange && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Branch:</span>
              <div className="relative">
                <select
                  value={branchFilter}
                  onChange={(e) => {
                    onBranchChange(e.target.value);
                    setPage(1);
                  }}
                  className="appearance-none pl-3 pr-8 py-2 text-xs font-semibold bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer transition-all"
                >
                  {branchOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          )}
        </div>

        {/* Reset button */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 border-slate-200 rounded-xl px-3 py-1.5 flex items-center gap-1.5 hover:bg-slate-50 self-end md:self-auto"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </Button>
        )}
      </div>

      {/* ── Elevated Table Card ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-10 h-10 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
            <p className="text-sm text-slate-500 font-semibold">Loading staff salary structure...</p>
          </div>
        ) : staffList.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <Users size={28} />
            </div>
            <h3 className="text-base font-bold text-slate-800">No staff members found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchTerm || employeeTypeFilter !== 'All'
                ? 'Try adjusting your search criteria or resetting filters to find staff records.'
                : 'No active staff records exist for this branch.'}
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="mt-4 rounded-xl text-xs font-semibold"
              >
                <RotateCcw size={13} className="mr-1.5" />
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <Table
            dense
            borderless
            headers={[
              { label: 'STAFF MEMBER', align: 'left' },
              { label: 'EMPLOYEE ID', align: 'left' },
              { label: 'EMPLOYEE TYPE', align: 'left' },
              { label: 'DESIGNATION', align: 'left' },
              { label: 'MONTHLY BASIC', align: 'left' },
              { label: 'EFFECTIVE FROM', align: 'left' },
              { label: 'ACTIONS', align: 'right' }
            ]}
          >
            {staffList.map((staff) => {
              const typeBadge = getEmployeeTypeBadge(staff.employee_type);
              const initials = (staff.full_name || 'Staff')
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();

              return (
                <tr key={staff.id} className="hover:bg-slate-50/80 transition-colors group">
                  {/* Staff Member */}
                  <td className="px-4 py-3.5 text-left whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200/80 shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
                        {initials}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm leading-tight">
                          {staff.full_name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          {staff.department || 'Active Staff'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Employee ID */}
                  <td className="px-4 py-3.5 text-left whitespace-nowrap">
                    <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100/90 px-2.5 py-1 rounded-md border border-slate-200/80">
                      {staff.employee_id || `ID: ${staff.id}`}
                    </span>
                  </td>

                  {/* Employee Type */}
                  <td className="px-4 py-3.5 text-left whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${typeBadge.bg}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${typeBadge.dot}`} />
                      {typeBadge.label}
                    </span>
                  </td>

                  {/* Designation */}
                  <td className="px-4 py-3.5 text-left text-xs font-semibold text-slate-700 whitespace-nowrap">
                    {staff.designation || staff.department || '—'}
                  </td>

                  {/* Basic Monthly Salary */}
                  <td className="px-4 py-3.5 text-left whitespace-nowrap">
                    <span className="font-black font-mono text-slate-900 text-sm tracking-tight">
                      {fmt(staff.salary_amount)}
                    </span>
                    <span className="text-[11px] text-slate-400 ml-1 font-medium">/mo</span>
                  </td>

                  {/* Effective From */}
                  <td className="px-4 py-3.5 text-left text-xs font-medium text-slate-600 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-slate-400 shrink-0" />
                      <span>{staff.salary_effective_from ? formatDate(staff.salary_effective_from) : 'Joining Date'}</span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingStaff(staff)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white border border-indigo-200/80 transition-all shadow-2xs hover:shadow-xs active:scale-95"
                      >
                        <Pencil size={13} />
                        <span>Edit Salary</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoryStaffId(staff.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 transition-all shadow-2xs hover:shadow-xs active:scale-95"
                        title="View complete payment history"
                      >
                        <Eye size={13} />
                        <span>History</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}

        {/* Modern Summary Strip & Pagination */}
        {staffList.length > 0 && (
          <div className="border-t border-slate-200/80 bg-slate-50/50">
            <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-2">
                <span>Showing <strong>{staffList.length}</strong> of <strong>{total}</strong> active staff members</span>
              </div>
              <div className="flex items-center gap-4">
                <span>
                  Page Basic Allocation:{' '}
                  <strong className="font-mono text-slate-900">{fmt(stats.totalAllocated)}</strong>
                </span>
              </div>
            </div>
            <div className="border-t border-slate-200/60">
              <Pagination
                currentPage={page}
                totalPages={Math.max(1, Math.ceil(total / limit))}
                totalItems={total}
                pageSize={limit}
                onPageChange={setPage}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

