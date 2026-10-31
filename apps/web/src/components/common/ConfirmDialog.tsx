import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  danger = true,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-[#1C242C] border border-[#303A44] rounded shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-4 py-3 bg-[#182027] border-b border-[#303A44] flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#E8EDF2] font-mono">
            {danger && <AlertTriangle className="w-4 h-4 text-[#F0B44D]" />}
            <span>{title}</span>
          </div>
          <button
            onClick={onCancel}
            className="text-[#8D9AA7] hover:text-[#E8EDF2] p-1 rounded hover:bg-[#222B35] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 text-sm text-[#8D9AA7] leading-relaxed">
          {message}
        </div>
        <div className="px-4 py-3 bg-[#151B21] border-t border-[#303A44] flex items-center justify-end gap-2.5">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-mono font-medium text-[#8D9AA7] hover:text-[#E8EDF2] bg-[#222B35] hover:bg-[#303A44] border border-[#303A44] rounded transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-3 py-1.5 text-xs font-mono font-semibold text-white rounded transition-colors shadow-xs ${
              danger
                ? 'bg-[#EF5555] hover:bg-[#DC2626] border border-[#EF5555]'
                : 'bg-[#35C98A] hover:bg-[#2EB87C] border border-[#35C98A] text-[#101418]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

