import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';

export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title?: string;
  itemName?: string;
  itemType?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  itemType = 'item',
  description,
  confirmLabel = 'Confirm Delete',
  cancelLabel = 'Cancel',
  isLoading = false,
}) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const loading = isLoading || internalLoading;

  const handleConfirm = async () => {
    try {
      setInternalLoading(true);
      await onConfirm();
    } finally {
      setInternalLoading(false);
    }
  };

  const modalTitle = title || `Delete ${itemType.charAt(0).toUpperCase() + itemType.slice(1)}`;
  const displayDesc = description || `Are you sure you want to delete ${itemName ? `"${itemName}"` : `this ${itemType}`}? This action cannot be undone.`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !loading && onClose()}
      title={modalTitle}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="danger"
            className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 font-semibold"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            {loading ? 'Deleting...' : confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="flex items-start gap-3.5 p-1">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-red-600">
          <AlertTriangle size={20} />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-800">
            {itemName ? (
              <>
                Are you sure you want to delete <strong className="text-slate-900">{itemName}</strong>?
              </>
            ) : (
              displayDesc
            )}
          </p>
          {itemName && (
            <p className="text-xs text-slate-500">
              {description || `This action will permanently delete this ${itemType} or mark it as deleted.`}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
};
