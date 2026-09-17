import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import {
  staffSalaryApi,
  type StaffSalaryMasterItem
} from '../../services/staffSalaryApi';
import {
  ArrowLeft,
  DollarSign,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Calendar,
  Building2,
  User,
  RotateCcw
} from 'lucide-react';
import { formatDate } from '../../utils/dateFormatter';

interface EditStaffSalaryViewProps {
  staff: StaffSalaryMasterItem;
  onBack: () => void;
  onSuccess: () => void;
  addToast: (toast: { title?: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }) => void;
}

const fmt = (n: number) => '₹' + (Number(n) || 0).toLocaleString('en-IN');

export const EditStaffSalaryView: React.FC<EditStaffSalaryViewProps> = ({
  staff,
  onBack,
  onSuccess,
  addToast
}) => {
  const [salaryAmount, setSalaryAmount] = useState<string>(String(staff.salary_amount || ''));
  const [effectiveFrom, setEffectiveFrom] = useState<string>(
    staff.salary_effective_from || new Date().toISOString().split('T')[0]
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const mainContainer = document.getElementById('main-scroll-container');
    if (mainContainer) {
      mainContainer.scrollTop = 0;
    }
  }, []);

  const handleResetSalary = async () => {
    try {
      setIsResetting(true);
      await staffSalaryApi.resetStaffSalary(staff.id);
      addToast({
        title: 'Salary Structure Cleared',
        message: `Base monthly salary for ${staff.full_name} has been reset to ₹0.`,
        type: 'success'
      });
      setIsResetModalOpen(false);
      onSuccess();
    } catch (err: any) {
      console.error('Error resetting staff salary:', err);
      addToast({
        title: 'Error',
        message: err?.response?.data?.message || err.message || 'Failed to reset salary.',
        type: 'error'
      });
    } finally {
      setIsResetting(false);
    }
  };

  const numSalary = Number(salaryAmount) || 0;
  const originalSalary = Number(staff.salary_amount) || 0;
  const diff = numSalary - originalSalary;
  const percentChange = originalSalary > 0 ? (diff / originalSalary) * 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (numSalary < 0 || isNaN(numSalary)) {
      setErrorMsg('Please enter a valid salary amount (0 or higher).');
      return;
    }

    try {
      setIsSaving(true);
      await staffSalaryApi.updateStaffSalary(staff.id, {
        salaryAmount: numSalary,
        salaryEffectiveFrom: effectiveFrom || null
      });

      addToast({
        title: 'Salary Structure Updated',
        message: `Basic monthly salary for ${staff.full_name} set to ${fmt(numSalary)}.`,
        type: 'success'
      });

      onSuccess();
    } catch (err: any) {
      console.error('Error updating staff salary:', err);
      setErrorMsg(err?.response?.data?.message || err.message || 'Failed to update salary.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ── Top Navigation Bar ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
            title="Back to Salary Master"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Edit Salary Structure: {staff.full_name}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Employee ID: <span className="font-mono font-semibold text-slate-700">{staff.employee_id || `ID: ${staff.id}`}</span> • Branch: <span className="font-semibold text-slate-700">{staff.primary_branch_name || 'Main Campus'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {Number(staff.salary_amount) > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsResetModalOpen(true)}
              disabled={isSaving}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 font-semibold"
            >
              Reset / Clear Salary
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            disabled={isSaving}
            className="font-semibold text-slate-700"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 font-bold flex items-center gap-1.5 shadow-xs"
          >
            {isSaving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 size={14} />
                Save Salary Structure
              </>
            )}
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2.5">
          <AlertCircle size={18} className="shrink-0" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* ── Staff Profile Header Banner ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center font-bold text-2xl shadow-inner shrink-0">
              {staff.first_name?.[0]}
              {staff.last_name?.[0]}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-xl font-bold text-white tracking-tight">{staff.full_name}</h3>
                <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {staff.employee_type || 'Staff'}
                </span>
                <span className="font-mono text-xs text-slate-300 bg-white/10 px-2.5 py-0.5 rounded-md border border-white/10">
                  {staff.employee_id || `ID: ${staff.id}`}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 mt-2">
                {staff.designation && (
                  <span className="font-medium text-slate-200">Designation: <strong>{staff.designation}</strong></span>
                )}
                {staff.department && (
                  <>
                    <span>•</span>
                    <span>Department: <strong>{staff.department}</strong></span>
                  </>
                )}
                {staff.primary_branch_name && (
                  <>
                    <span>•</span>
                    <span>Branch: <strong>{staff.primary_branch_name}</strong></span>
                  </>
                )}
                {staff.joining_date && (
                  <>
                    <span>•</span>
                    <span>Joined: {formatDate(staff.joining_date)}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Current Baseline Salary */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-3.5 md:text-right shrink-0">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
              Current Master Salary
            </span>
            <span className="text-2xl font-black text-slate-200 tracking-tight block mt-0.5">
              {fmt(staff.salary_amount)} <span className="text-xs font-normal text-slate-400">/ mo</span>
            </span>
            {staff.salary_effective_from && (
              <span className="text-[11px] text-slate-400 block mt-1 font-medium">
                Since: {formatDate(staff.salary_effective_from)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── 2-Column In-Page Configuration & Analysis Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Configuration */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div>
            <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <DollarSign size={18} className="text-blue-600" />
              Salary Remuneration Parameters
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Set the monthly fixed base compensation and the effective date for automated monthly payroll generation.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Monthly Basic Salary */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Monthly Basic Salary (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-lg">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="500"
                  required
                  value={salaryAmount}
                  onChange={(e) => setSalaryAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full pl-9 pr-4 py-3 text-lg font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Quick Stepper Presets */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="text-[11px] text-slate-400 font-semibold mr-1">Quick Add:</span>
                {[1000, 2500, 5000, 10000].map((increment) => (
                  <button
                    key={increment}
                    type="button"
                    onClick={() => {
                      const cur = Number(salaryAmount) || 0;
                      setSalaryAmount(String(cur + increment));
                    }}
                    className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  >
                    +{fmt(increment)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const cur = Number(salaryAmount) || 0;
                    setSalaryAmount(String(Math.round(cur * 1.1)));
                  }}
                  className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                >
                  +10% Hike
                </button>
              </div>
            </div>

            {/* Salary Revision Effective Date */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Salary Revision Effective Date
              </label>
              <input
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="w-full px-4 py-2.5 text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                <span className="text-[11px] text-slate-400 font-semibold mr-1">Presets:</span>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
                    setEffectiveFrom(firstDay);
                  }}
                  className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 cursor-pointer"
                >
                  1st of this month
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEffectiveFrom(new Date().toISOString().split('T')[0]);
                  }}
                  className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    const nextFirst = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().split('T')[0];
                    setEffectiveFrom(nextFirst);
                  }}
                  className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 cursor-pointer"
                >
                  1st of next month
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                type="button"
                onClick={onBack}
                disabled={isSaving}
                className="px-5 font-semibold"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 px-6 font-bold shadow-xs flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    Save & Apply Salary Structure
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Right Column: Real-Time Compensation Analysis */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-5">
            <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Briefcase size={18} className="text-emerald-600" />
              Compensation Analysis & Impact
            </h4>

            {/* Proposed Monthly Breakdown */}
            <div className="space-y-3">
              <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Proposed Monthly Base
                  </span>
                  <span className="text-2xl font-black text-emerald-700 tracking-tight block mt-0.5">
                    {fmt(numSalary)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Annual CTC Equiv.
                  </span>
                  <span className="text-lg font-extrabold text-slate-900 tracking-tight block mt-0.5">
                    {fmt(numSalary * 12)}
                  </span>
                </div>
              </div>

              {/* Variance Indicator */}
              {originalSalary !== numSalary && (
                <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                  numSalary >= originalSalary
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                    : 'bg-amber-50 text-amber-900 border-amber-200'
                }`}>
                  <span>Salary Variance / Difference:</span>
                  <span className="font-bold text-sm">
                    {numSalary >= originalSalary ? '+' : ''}
                    {fmt(diff)}
                    {originalSalary > 0 && (
                      <span className="text-xs font-normal ml-1">
                        ({percentChange >= 0 ? '+' : ''}{percentChange.toFixed(1)}%)
                      </span>
                    )}
                  </span>
                </div>
              )}

              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Daily Base Rate (30 days):</span>
                  <span className="font-bold text-slate-900">{fmt(Math.round(numSalary / 30))} / day</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Payroll Generation Cycle:</span>
                  <span className="font-bold text-slate-900">Monthly 1st - End</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Disbursement Channel:</span>
                  <span className="font-bold text-slate-900">Bank Transfer / Direct NEFT</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reset / Clear Salary Confirmation Modal */}
      {isResetModalOpen && (
        <Modal
          isOpen={isResetModalOpen}
          onClose={() => setIsResetModalOpen(false)}
          title="Reset Staff Salary Structure"
          size="md"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => setIsResetModalOpen(false)}
                disabled={isResetting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleResetSalary}
                disabled={isResetting}
                className="bg-rose-600 hover:bg-rose-700 font-bold"
              >
                {isResetting ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Resetting...
                  </>
                ) : (
                  'Yes, Reset to ₹0'
                )}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
              <AlertTriangle size={20} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-sm">Clear salary for {staff.full_name}?</span>
                <p className="mt-1">
                  This will reset the base monthly salary structure from <strong>{fmt(staff.salary_amount)}</strong> to <strong>₹0</strong> and remove the effective date. Existing historical payment records will be preserved in the archive.
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
