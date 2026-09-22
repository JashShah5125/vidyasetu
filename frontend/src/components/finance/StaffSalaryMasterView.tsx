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
  RotateCcw
} from 'lucide-react';
import { formatDate } from '../../utils/dateFormatter';

const fmt = (n: number) => '₹' + (Number(n) || 0).toLocaleString('en-IN');

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
      addToast({
        title: 'Error',
        message: err?.response?.data?.message || err.message || 'Failed to load staff salary structure.',
        type: 'error'
      });
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
        addToast={addToast}
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
      {/* ── Standard 3-Column Compact KPI Financial Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-l-4 border-l-blue-600 shadow-xs hover:shadow-sm transition-shadow">
          <div className="p-3 sm:p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                Total Active Staff
              </span>
              <div className="w-6.5 h-6.5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users size={14} />
              </div>
            </div>
            <div className="text-xl font-bold text-slate-900 mt-0.5 tabular-nums tracking-tight">
              {stats.totalStaff} Members
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
              Across all department designations
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-xs hover:shadow-sm transition-shadow">
          <div className="p-3 sm:p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                Total Monthly Basic
              </span>
              <div className="w-6.5 h-6.5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign size={14} />
              </div>
            </div>
            <div className="text-xl font-bold text-emerald-700 mt-0.5 tabular-nums tracking-tight">
              {fmt(stats.totalAllocated)} <span className="text-xs font-normal text-emerald-600">/ mo</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
              Committed basic payroll expense
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-indigo-500 shadow-xs hover:shadow-sm transition-shadow">
          <div className="p-3 sm:p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                Avg. Basic Salary
              </span>
              <div className="w-6.5 h-6.5 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Briefcase size={14} />
              </div>
            </div>
            <div className="text-xl font-bold text-indigo-900 mt-0.5 tabular-nums tracking-tight">
              {fmt(stats.avgSalary)} <span className="text-xs font-normal text-indigo-600">/ staff</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
              Average remuneration per employee
            </div>
          </div>
        </Card>
      </div>

      {/* ── Filters & Search Toolbar ── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[240px] max-w-sm flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, ID, designation..."
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Employee Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type:</span>
            <select
              value={employeeTypeFilter}
              onChange={(e) => {
                setEmployeeTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="All">All Types</option>
              <option value="Teaching">Teaching / Faculty</option>
              <option value="Non-Teaching">Non-Teaching</option>
              <option value="Administration">Administration</option>
              <option value="Counsellor">Counsellor</option>
              <option value="Management">Management</option>
            </select>
          </div>

          {/* Branch Filter if multi-branch */}
          {branchOptions.length > 2 && onBranchChange && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Branch:</span>
              <select
                value={branchFilter}
                onChange={(e) => {
                  onBranchChange(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {branchOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSearchTerm('');
            setEmployeeTypeFilter('All');
            setPage(1);
          }}
          className="text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1.5 self-end md:self-auto"
        >
          <RotateCcw size={13} />
          Reset Filters
        </Button>
      </div>

      {/* ── Standard Table Template Card Container ── */}
      <Card className="p-0 overflow-hidden border border-slate-200 shadow-sm">

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Loader2 size={32} className="animate-spin text-blue-600" />
            <p className="text-sm text-slate-500 font-medium">Loading staff salary structure...</p>
          </div>
        ) : staffList.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Users size={40} className="mx-auto text-slate-300 mb-2.5" />
            <h3 className="text-base font-semibold text-slate-700">No staff members found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              {searchTerm || employeeTypeFilter !== 'All'
                ? 'Try adjusting your search query or type filters to see staff records.'
                : 'No active staff records exist for this branch.'}
            </p>
          </div>
        ) : (
          <Table
            dense
            borderless
            headers={[
              { label: 'Staff Member', align: 'left' },
              { label: 'Employee ID', align: 'left' },
              { label: 'Employee Type', align: 'left' },
              { label: 'Designation', align: 'left' },
              { label: 'Basic Monthly Salary', align: 'left' },
              { label: 'Effective From', align: 'left' },
              { label: 'Actions', align: 'right' }
            ]}
          >
            {staffList.map((staff) => (
              <tr key={staff.id} className="hover:bg-slate-50/80 transition-colors">
                {/* Staff Member */}
                <td className="px-3.5 py-3 text-left whitespace-nowrap">
                  <span className="font-semibold text-slate-900 text-sm">
                    {staff.full_name}
                  </span>
                </td>

                {/* Employee ID */}
                <td className="px-3.5 py-3 text-left whitespace-nowrap font-mono text-xs text-slate-600 font-medium">
                  {staff.employee_id || `ID: ${staff.id}`}
                </td>

                {/* Employee Type */}
                <td className="px-3.5 py-3 text-left whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    {staff.employee_type || 'Staff'}
                  </span>
                </td>

                {/* Designation */}
                <td className="px-3.5 py-3 text-left text-xs font-medium text-slate-700 whitespace-nowrap">
                  {staff.designation || staff.department || '—'}
                </td>

                {/* Basic Monthly Salary */}
                <td className="px-3.5 py-3 text-left whitespace-nowrap font-bold text-slate-900 text-sm">
                  {fmt(staff.salary_amount)}
                </td>

                {/* Effective From */}
                <td className="px-3.5 py-3 text-left text-slate-600 text-xs font-medium whitespace-nowrap">
                  {staff.salary_effective_from ? formatDate(staff.salary_effective_from) : 'Joining Date'}
                </td>

                {/* Actions */}
                <td className="px-3.5 py-3 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setEditingStaff(staff)}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:text-blue-800 hover:bg-blue-50 border border-blue-200"
                    >
                      <Pencil size={13} />
                      <span>Edit Salary</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setHistoryStaffId(staff.id)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
                      title="View complete payment history"
                    >
                      <Eye size={13} />
                      <span>History</span>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}

        {/* Pagination */}
        {staffList.length > 0 && (
          <div className="border-t border-slate-200">
            <Pagination
              currentPage={page}
              totalPages={Math.max(1, Math.ceil(total / limit))}
              totalItems={total}
              pageSize={limit}
              onPageChange={setPage}
            />
          </div>
        )}
      </Card>
    </div>
  );
};
