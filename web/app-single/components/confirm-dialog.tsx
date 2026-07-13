'use client';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, message,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  destructive = false, loading = false,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-navy-800 border border-navy-700 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-400 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ${
              destructive
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-gold-500 text-navy-900 hover:bg-gold-400'
            }`}
          >
            {loading ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
