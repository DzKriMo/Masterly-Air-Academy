'use client';

import { useState } from 'react';

export interface FilterOption {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

interface FilterBarProps {
  filters: FilterOption[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onClear: () => void;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

export function FilterBar({ filters, values, onChange, onClear, searchPlaceholder, searchValue, onSearchChange }: FilterBarProps) {
  const hasActive = Object.values(values).some(Boolean) || (searchValue && searchValue.length > 0);

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {onSearchChange && (
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchValue || ''}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder || 'Search...'}
            className="w-full pl-10 pr-4 py-2 bg-navy-800 border border-navy-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gold-500"
          />
        </div>
      )}

      {filters.map(f => (
        <select
          key={f.key}
          value={values[f.key] || ''}
          onChange={e => onChange(f.key, e.target.value)}
          className="px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-gold-500"
        >
          <option value="">{f.label}</option>
          {f.options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ))}

      {hasActive && (
        <button onClick={onClear} className="text-xs text-gold-500 hover:underline">
          Clear filters
        </button>
      )}
    </div>
  );
}
