'use client';

import * as React from 'react';
import type { Meeting } from '@/hooks/useMeetings';

type SortKey = 'datetime' | 'chamber' | 'title' | 'committee';
type SortDir = 'asc' | 'desc';

function toDateTime(m: Meeting) {
  const dt = `${m.date || ''} ${m.start_time || ''}`.trim();
  const t = Date.parse(dt) || Date.parse(m.date || '') || 0;
  return t;
}

export default function MeetingsTable({ meetings }: { meetings: Meeting[] }) {
  const [sortKey, setSortKey] = React.useState<SortKey>('datetime');
  const [sortDir, setSortDir] = React.useState<SortDir>('asc');

  const sorted = React.useMemo(() => {
    const arr = [...meetings];
    arr.sort((a, b) => {
      let va: any = 0, vb: any = 0;
      switch (sortKey) {
        case 'datetime':
          va = toDateTime(a); vb = toDateTime(b); break;
        case 'chamber':
          va = (a.chamber || '').localeCompare(b.chamber || ''); break;
        case 'title':
          va = (a.official_title || a.title_or_subject || '')
                .localeCompare(b.official_title || b.title_or_subject || '');
          break;
        case 'committee':
          va = (a.committee_name || '').localeCompare(b.committee_name || ''); break;
      }
      return sortDir === 'asc'
        ? (va > vb ? 1 : va < vb ? -1 : 0)
        : (va < vb ? 1 : va > vb ? -1 : 0);
    });
    return arr;
  }, [meetings, sortKey, sortDir]);

  function clickSort(k: SortKey) {
    setSortDir(prev => (sortKey === k ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'));
    setSortKey(k);
  }

  return (
    <div style={{ background: 'white', borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f7fafc' }}>
            <Th onClick={() => clickSort('datetime')} active={sortKey === 'datetime'} dir={sortDir}>Date / Time</Th>
            <Th onClick={() => clickSort('chamber')} active={sortKey === 'chamber'} dir={sortDir}>Chamber</Th>
            <Th onClick={() => clickSort('title')} active={sortKey === 'title'} dir={sortDir}>Title</Th>
            <Th onClick={() => clickSort('committee')} active={sortKey === 'committee'} dir={sortDir}>Committee</Th>
            <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, color: '#4a5568' }}>Details</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((m, i) => (
            <tr key={`${m.chamber}-${m.meeting_id}-${i}`} style={{ borderTop: '1px solid #edf2f7' }}>
              <td style={td}>{(m.date || '—')}{m.start_time ? ` • ${m.start_time}` : ''}</td>
              <td style={td}>{m.chamber || '—'}</td>
              <td style={td}>
                <div style={{ fontWeight: 600, lineHeight: 1.3 }}>
                  <a href={m.detail_page_url || '#'} target="_blank" rel="noreferrer" style={{ color: '#1a202c', textDecoration: 'underline' }}>
                    {m.official_title || m.title_or_subject || '—'}
                  </a>
                </div>
                {m.colloquial_title && (
                  <div style={{ fontSize: 13, color: '#4a5568', lineHeight: 1.3, marginTop: 4 }}>
                    {m.colloquial_title}
                  </div>
                )}
                {/* Removed the small committee line here to avoid duplication */}
              </td>
              <td style={td}>{m.committee_name || '—'}</td>
              <td style={td}>
                <a href={m.detail_page_url || '#'} target="_blank" rel="noreferrer" style={{ color: '#3182ce', textDecoration: 'underline' }}>Open</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th(props: { children: React.ReactNode; onClick: () => void; active: boolean; dir: SortDir }) {
  const { children, onClick, active, dir } = props;
  return (
    <th
      onClick={onClick}
      style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, color: '#4a5568', cursor: 'pointer', userSelect: 'none' }}
      title="Sort"
    >
      {children} {active ? (dir === 'asc' ? '▲' : '▼') : '↕'}
    </th>
  );
}

const td: React.CSSProperties = { padding: '14px 16px', verticalAlign: 'top', fontSize: 14, color: '#2d3748' };
