'use client';

import { useState, useMemo } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  onRowClick?: (item: T) => void;
  pageSize?: number;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyField,
  onRowClick,
  pageSize = 15,
  emptyMessage = 'No data found.',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = (a as any)[sortKey] ?? '';
      const bVal = (b as any)[sortKey] ?? '';
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageData = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(0);
  };

  if (data.length === 0) {
    return <p className="text-gray-500 text-sm py-8 text-center">{emptyMessage}</p>;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-700">
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={`px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider font-medium select-none ${
                    col.sortable !== false ? 'cursor-pointer hover:text-white' : ''
                  } ${col.className || ''}`}
                >
                  <span className="flex items-center gap-1">
                    {col.header}
                    {sortKey === col.key && (
                      <span className="text-gold-500">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((item, i) => (
              <tr
                key={String((item as any)[keyField])}
                onClick={() => onRowClick?.(item)}
                className={`border-b border-navy-700/50 ${onRowClick ? 'cursor-pointer hover:bg-navy-700/20' : ''} transition-colors`}
              >
                {columns.map(col => (
                  <td key={col.key} className={`px-4 py-3 ${col.className || ''}`}>
                    {col.render ? col.render(item) : String((item as any)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-navy-700">
          <p className="text-xs text-gray-500">
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 text-xs rounded border border-navy-700 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`px-3 py-1 text-xs rounded border ${
                  i === page
                    ? 'bg-gold-500 border-gold-500 text-navy-900 font-semibold'
                    : 'border-navy-700 text-gray-400 hover:text-white'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 text-xs rounded border border-navy-700 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
