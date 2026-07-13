'use client';

interface LoadingSkeletonProps {
  rows?: number;
  type?: 'card' | 'table' | 'detail';
}

export function LoadingSkeleton({ rows = 4, type = 'card' }: LoadingSkeletonProps) {
  if (type === 'table') {
    return (
      <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden animate-pulse">
        <div className="grid grid-cols-4 gap-4 px-5 py-3 border-b border-navy-700">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-3 bg-navy-700 rounded w-16" />
          ))}
        </div>
        {[...Array(rows)].map((_, r) => (
          <div key={r} className="grid grid-cols-4 gap-4 px-5 py-3 border-b border-navy-700/50">
            {[...Array(4)].map((_, c) => (
              <div key={c} className="h-4 bg-navy-700 rounded" style={{ width: `${60 + Math.random() * 30}%` }} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (type === 'detail') {
    return (
      <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 animate-pulse space-y-4">
        <div className="h-6 bg-navy-700 rounded w-48" />
        <div className="space-y-2">
          {[...Array(rows)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 bg-navy-700 rounded w-24" />
              <div className="h-4 bg-navy-700 rounded flex-1" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="bg-navy-800 border border-navy-700 rounded-xl p-5">
          <div className="h-4 bg-navy-700 rounded w-20 mb-3" />
          <div className="h-8 bg-navy-700 rounded w-16 mb-2" />
          <div className="h-3 bg-navy-700 rounded w-32" />
        </div>
      ))}
    </div>
  );
}
