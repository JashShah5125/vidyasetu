import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Pagination } from '../ui/Pagination';
import { useApp } from '../../context/AppContext';
import {
  staffSalaryApi,
  type StaffSalaryMasterItem
} from '../../services/staffSalaryApi';
import { StaffSalaryHistoryModal } from './StaffSalaryHistoryModal';
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
  ArrowUpDown
} from 'lucide-react';
import { formatDate } from '../../utils/dateFormatter';

const fmt = (n: number) => '₹' + (Number(n) || 0).toLocaleString('en-IN');

interface StaffSalaryMasterViewProps {
  branchFilter?: string;
  branchOptions?: { value: string; label: string }[];
  onBranchChange?: (branchId: string) => void;
  onNavigateToStatus?: () => void;
}

export const StaffSalaryMasterView: React.FC<StaffSalaryMasterViewProps> = ({
  branchFilter = 'All',
  branchOptions = [],
  onBranchChange,
  onNavigateToStatus
}) => {
  const { addToast } = useApp();

  const [staffList, setStaffList] = useState<StaffSalaryMasterItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [employeeTypeFilter, setEmployeeTypeFilter] = useState<string>('All');
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const limit = 15;

  // Modals state
  const [editingStaff, setEditingStaff] = useState<StaffSalaryMasterItem | null>(null);
  const [editSalaryAmount, setEditSalaryAmount] = useState<string>('');
  const [editEffectiveFrom, setEditEffectiveFrom] = useState<string>('');
  const [isSavingSalary, setIsSavingSalary] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [historyStaffId, setHistoryStaffId] = useState<number | null>(null);

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

  const handleOpenEdit = (staff: StaffSalaryMasterItem) => {
    setEditingStaff(staff);
    setEditSalaryAmount(String(staff.salary_amount || 0));
    setEditEffectiveFrom(staff.salary_effective_from || new Date().toISOString().split('T')[0]);
    setEditError(null);
  };

  const handleSaveSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setEditError(null);

    const numSalary = Number(editSalaryAmount);
    if (isNaN(numSalary) || numSalary < 0) {
      setEditError('Please enter a valid salary amount (0 or higher).');
      return;
    }

    try {
      setIsSavingSalary(true);
      await staffSalaryApi.updateStaffSalary(editingStaff.id, {
        salaryAmount: numSalary,
        salaryEffectiveFrom: editEffectiveFrom || null
      });

      addToast({
        title: 'Salary Updated',
        message: `Basic monthly salary for ${editingStaff.full_name} set to ${fmt(numSalary)}.`,
        type: 'success'
      });

      setEditingStaff(null);
      fetchStaffSalaries();
    } catch (err: any) {
      console.error('Error updating staff salary:', err);
      setEditError(err?.response?.data?.message || err.message || 'Failed to update salary.');
    } finally {
      setIsSavingSalary(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Users size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Staff Salary Master</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Master record of basic monthly compensation and effective salary dates across branch staff
              </p>
            </div>
          </div>
        </div>

        {onNavigateToStatus && (
          <Button
            variant="outline"
            onClick={onNavigateToStatus}
            className="flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 font-semibold"
          >
            <Calendar size={16} />
            Go to Monthly Salary Status
          </Button>
        )}
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3.5 shadow-xs">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users size={22} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Active Staff</span>
            <span className="text-xl font-bold text-slate-900">{stats.totalStaff} Members</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3.5 shadow-xs">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign size={22} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Monthly Basic</span>
            <span className="text-xl font-bold text-emerald-700">{fmt(stats.totalAllocated)} / mo</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3.5 shadow-xs">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Briefcase size={22} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Avg. Basic Salary</span>
            <span className="text-xl font-bold text-purple-900">{fmt(stats.avgSalary)} / staff</span>
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
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
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Employee Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Type:</span>
            <select
              value={employeeTypeFilter}
              onChange={(e) => {
                setEmployeeTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="All">All Types</option>
              <option value="Teaching">Teaching / Teacher</option>
              <option value="Non-Teaching">Non-Teaching</option>
              <option value="Administration">Administration</option>
              <option value="Counsellor">Counsellor</option>
              <option value="Management">Management</option>
            </select>
          </div>

          {/* Branch Filter if multi-branch */}
          {branchOptions.length > 2 && onBranchChange && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Branch:</span>
              <select
                value={branchFilter}
                onChange={(e) => {
                  onBranchChange(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
          className="text-slate-600 hover:text-slate-900 self-end md:self-auto"
        >
          Reset Filters
        </Button>
      </div>

      {/* Staff Salary Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
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
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Employee Type</th>
                  <th className="py-3 px-4">Designation / Dept</th>
                  <th className="py-3 px-4">Basic Monthly Salary</th>
                  <th className="py-3 px-4">Effective From</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {staffList.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                          {staff.first_name?.[0] || ''}
                          {staff.last_name?.[0] || ''}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 leading-tight">
                            {staff.full_name}
                          </div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">
                            {staff.employee_id || `ID: ${staff.id}`}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {staff.employee_type || 'Staff'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 text-xs">
                      <div className="font-medium text-slate-800">{staff.designation || '—'}</div>
                      <div className="text-slate-400 mt-0.5">{staff.department || staff.primary_branch_name}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-900 text-base tracking-tight">
                        {fmt(staff.salary_amount)}
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">per month</span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 text-xs font-medium">
                      {staff.salary_effective_from ? (
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Calendar size={13} className="text-slate-400" />
                          <span>{formatDate(staff.salary_effective_from)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Joining Date</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(staff)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2.5 py-1 text-xs font-semibold flex items-center gap-1.5 border border-transparent hover:border-blue-200"
                        >
                          <Pencil size={13} />
                          Edit Salary
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setHistoryStaffId(staff.id)}
                          className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-2 py-1 text-xs flex items-center gap-1"
                          title="View complete payment history"
                        >
                          <Eye size={13} />
                          History
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/50">
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(total / limit)}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Edit Salary Modal */}
      {editingStaff && (
        <Modal
          isOpen={Boolean(editingStaff)}
          onClose={() => setEditingStaff(null)}
          title="Edit Staff Salary"
          size="md"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => setEditingStaff(null)}
                disabled={isSavingSalary}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveSalary}
                disabled={isSavingSalary}
                className="bg-blue-600 hover:bg-blue-700 font-semibold"
              >
                {isSavingSalary ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Salary'
                )}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleSaveSalary} className="space-y-4">
            {editError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            {/* Profile Glance */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                {editingStaff.first_name[0]}
                {editingStaff.last_name ? editingStaff.last_name[0] : ''}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{editingStaff.full_name}</h4>
                <p className="text-xs text-slate-500">
                  {editingStaff.employee_type} • {editingStaff.designation || 'Staff'}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Basic Monthly Salary (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={editSalaryAmount}
                  onChange={(e) => setEditSalaryAmount(e.target.value)}
                  required
                  placeholder="0"
                  className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                The standard monthly gross amount used for monthly payroll generation.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Effective From Date
              </label>
              <input
                type="date"
                value={editEffectiveFrom}
                onChange={(e) => setEditEffectiveFrom(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Date when this salary structure takes effect.
              </span>
            </div>
          </form>
        </Modal>
      )}

      {/* Staff Salary History Modal */}
      {historyStaffId && (
        <StaffSalaryHistoryModal
          isOpen={Boolean(historyStaffId)}
          onClose={() => setHistoryStaffId(null)}
          staffId={historyStaffId}
        />
      )}
    </div>
  );
};
