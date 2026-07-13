'use client';

import { ReactNode, useEffect } from 'react';

interface ModalFormProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}

export function ModalForm({ open, onClose, title, children, footer, wide }: ModalFormProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className={`relative bg-navy-800 border border-navy-700 rounded-2xl shadow-2xl w-full mx-4 overflow-hidden animate-in slide-in-from-bottom-4 duration-200 ${wide ? 'max-w-3xl' : 'max-w-lg'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-navy-700 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
