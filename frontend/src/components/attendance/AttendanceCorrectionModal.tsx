import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AlertTriangle, History, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import type { AttendanceCorrectionItem } from '../../services/attendanceApi';

export interface AttendanceChangeDiff {
  student_id: number;
  student_name: string;
  student_code?: string;
  old_status: 0 | 1 | 2 | null;
  new_status: 0 | 1 | 2;
  old_remarks?: string;
  new_remarks?: string;
}

const statusBadge = (status: number | null | undefined) => {
  if (status === 1) {
    return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Present</span>;
  }
  if (status === 2) {
    return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Late</span>;
  }
  if (status === 0) {
    return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Absent</span>;
  }
  return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200">Unmarked</span>;
};

const PRESET_REASONS = [
  'Student arrived late with valid permission',
  'Medical / parent-intimated leave updated',
  'Clerical marking error corrected',
  'Biometric / manual register sync'
];

interface AttendanceCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  changes: AttendanceChangeDiff[];
  isSubmitting?: boolean;
  onConfirm: (reason: string) => Promise<void> | void;
}

export const AttendanceCorrectionModal: React.FC<AttendanceCorrectionModalProps> = ({
  isOpen,
  onClose,
  changes,
  isSubmitting = false,
  onConfirm
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setError('Please enter a valid correction reason (at least 3 characters).');
      return;
    }
    setError('');
    await onConfirm(trimmed);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Attendance Correction & Audit Trail"
      description="This lecture's attendance is locked. Every post-submission edit requires a reason and is permanently logged."
      size="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Audit Log Notice</p>
            <p className="text-amber-800 mt-0.5">
              {changes.length} student record{changes.length === 1 ? '' : 's'} will be updated and recorded under your user account in the system Audit Trail.
            </p>
          </div>
        </div>

        {/* Diff summary table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
              <tr>
                <th className="px-3.5 py-2.5">Student</th>
                <th className="px-3.5 py-2.5">Previous</th>
                <th className="px-2 py-2.5 text-center"></th>
                <th className="px-3.5 py-2.5">Updated</th>
                <th className="px-3.5 py-2.5">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {changes.map((c) => (
                <tr key={c.student_id} className="hover:bg-slate-50/60">
                  <td className="px-3.5 py-2.5">
                    <div className="font-bold text-slate-900">{c.student_name}</div>
                    {c.student_code && <div className="font-mono text-[10px] text-slate-500">{c.student_code}</div>}
                  </td>
                  <td className="px-3.5 py-2.5">{statusBadge(c.old_status)}</td>
                  <td className="px-2 py-2.5 text-center text-slate-400">
                    <ArrowRight size={14} className="inline" />
                  </td>
                  <td className="px-3.5 py-2.5">{statusBadge(c.new_status)}</td>
                  <td className="px-3.5 py-2.5 text-slate-600 max-w-[160px] truncate">
                    {c.new_remarks || <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Quick presets */}
        <div>
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
            Correction Reason <span className="text-rose-500">*</span>
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {PRESET_REASONS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setReason(preset);
                  setError('');
                }}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 transition-colors cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError('');
            }}
            placeholder="Explain why this locked attendance record is being modified..."
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
            required
          />
          {error && <p className="text-xs font-semibold text-rose-600 mt-1.5">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || changes.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin mr-1.5" /> Saving Correction...
              </>
            ) : (
              <>
                <ShieldCheck size={14} className="mr-1.5" /> Confirm &amp; Log Correction
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

interface AttendanceCorrectionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  corrections: AttendanceCorrectionItem[];
  isLoading?: boolean;
}

export const AttendanceCorrectionHistoryModal: React.FC<AttendanceCorrectionHistoryModalProps> = ({
  isOpen,
  onClose,
  corrections,
  isLoading = false
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Attendance Correction Audit History"
      description="Chronological log of all post-lock attendance edits and reasons for this lecture."
      size="3xl"
    >
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
          <Loader2 size={28} className="animate-spin text-indigo-600" />
          Loading audit history...
        </div>
      ) : corrections.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <History size={32} className="mx-auto text-slate-300" />
          <p className="text-sm font-bold text-slate-700">No Corrections Recorded</p>
          <p className="text-xs text-slate-500">Original submitted attendance has not been modified.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {corrections.map((item) => (
            <div key={item.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{item.student_name}</span>
                  {item.student_code && (
                    <span className="font-mono text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {item.student_code}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-medium text-slate-500">
                  {new Date(item.created_at).toLocaleString()}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {statusBadge(item.old_status)}
                <ArrowRight size={13} className="text-slate-400" />
                {statusBadge(item.new_status)}
                <span className="text-slate-400 mx-1">•</span>
                <span className="text-slate-600">
                  Corrected by <strong className="text-slate-800">{item.corrected_by_name || `User #${item.corrected_by}`}</strong>
                </span>
              </div>

              <div className="text-xs text-slate-700 bg-white border border-slate-200 rounded-lg p-2.5">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-0.5">Reason</span>
                {item.reason}
              </div>

              {(item.old_remarks || item.new_remarks) && (
                <div className="text-[11px] text-slate-500">
                  Remarks: <span className="line-through">{item.old_remarks || 'none'}</span> → <strong className="text-slate-700">{item.new_remarks || 'none'}</strong>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

