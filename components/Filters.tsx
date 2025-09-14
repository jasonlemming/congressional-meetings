'use client';

import * as React from 'react';

export type FilterState = {
  chamber: 'all' | 'house' | 'senate';
};

type Props = {
  filters: FilterState;
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  totalCount: number;
  filteredCount: number;
};

export function Filters({ filters, updateFilter, totalCount, filteredCount }: Props) {
  return (
    <div style={wrap}>
      <div style={row}>
        <label htmlFor="chamber" style={label}>Chamber</label>
        <select
          id="chamber"
          value={filters.chamber}
          onChange={(e) => updateFilter('chamber', e.target.value as FilterState['chamber'])}
          style={select}
        >
          <option value="all">All</option>
          <option value="house">House</option>
          <option value="senate">Senate</option>
        </select>
      </div>

      <div style={{ fontSize: 13, color: '#4a5568' }}>
        Showing <strong>{filteredCount}</strong> of <strong>{totalCount}</strong>
      </div>
    </div>
  );
}

const wrap: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  justifyContent: 'space-between',
  padding: '12px 0',
};

const row: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const label: React.CSSProperties = {
  fontSize: 14,
  color: '#2d3748',
};

const select: React.CSSProperties = {
  padding: '6px 8px',
  borderRadius: 6,
  border: '1px solid #cbd5e0',
  background: 'white',
  fontSize: 14,
};
