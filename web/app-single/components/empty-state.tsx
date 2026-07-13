'use client';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  message: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="bg-navy-800 border border-navy-700 rounded-xl p-10 text-center">
      {icon || (
        <svg className="w-12 h-12 text-navy-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      )}
      {title && <h3 className="text-white font-semibold mb-1">{title}</h3>}
      <p className="text-gray-500 text-sm">{message}</p>
      {action && (
        <button onClick={action.onClick} className="mt-4 px-4 py-2 bg-gold-500 text-navy-900 rounded-lg text-sm font-semibold hover:bg-gold-400 transition-colors">
          {action.label}
        </button>
      )}
    </div>
  );
}
