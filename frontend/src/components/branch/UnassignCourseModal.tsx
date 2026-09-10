import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface UnassignCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  course: {
    id: number | string;
    name: string;
    code: string;
  } | null;
  branchName?: string;
  isLoading?: boolean;
}

export const UnassignCourseModal: React.FC<UnassignCourseModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  course,
  branchName = 'your branch',
  isLoading = false
}) => {
  if (!course) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Remove Course from Branch"
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-semibold"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-2"
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            Confirm Unassign
          </Button>
        </div>
      }
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 text-amber-600">
          <AlertTriangle size={24} />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-800 leading-relaxed">
            Are you sure you want to unassign <span className="font-bold text-slate-900">{course.name}</span> (<span className="font-mono font-semibold text-indigo-600 text-xs">{course.code}</span>) from <span className="font-semibold">{branchName}</span>?
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600">
            <span className="font-bold text-slate-700">Note: </span>
            This action will hide this course from your branch operations. The master course in the Institute Catalog will <strong>NOT</strong> be deleted.
          </div>
        </div>
      </div>
    </Modal>
  );
};
