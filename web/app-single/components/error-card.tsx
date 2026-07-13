'use client';

interface ErrorCardProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorCard({ message, onRetry }: ErrorCardProps) {
  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
      <svg className="w-10 h-10 text-red-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-red-300 text-sm mb-4">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors">
          Try Again
        </button>
      )}
    </div>
  );
}
