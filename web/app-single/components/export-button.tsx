'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

interface ExportButtonProps {
  label?: string;
  exports: {
    label: string;
    url: string;
    filename: string;
    type: 'pdf' | 'excel';
  }[];
}

export function ExportButton({ label = 'Export', exports }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const handleExport = async (url: string, filename: string) => {
    setLoading(filename);
    try {
      const token = api.getAccessToken();
      const res = await fetch(`/api${url}`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setLoading(null);
      setOpen(false);
    }
  };

  if (exports.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white hover:bg-navy-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        {label}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-48 bg-navy-800 border border-navy-700 rounded-xl shadow-xl z-20 overflow-hidden">
            {exports.map(exp => (
              <button
                key={exp.filename}
                onClick={() => handleExport(exp.url, exp.filename)}
                disabled={loading === exp.filename}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-navy-700 hover:text-white transition-colors disabled:opacity-50 flex items-center justify-between"
              >
                {exp.label}
                {loading === exp.filename ? (
                  <span className="text-xs text-gray-500">...</span>
                ) : (
                  <span className="text-xs text-gray-600 uppercase">{exp.type}</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
