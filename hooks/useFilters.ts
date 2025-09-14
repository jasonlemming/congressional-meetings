import { useState, useMemo } from 'react';
import type { Meeting } from '@/types';

export type FilterState = {
  chamber: 'all' | 'house' | 'senate';
  searchText: string;
  dateFrom: string;
  dateTo: string;
};

export function useFilters(meetings: Meeting[]) {
  const [filters, setFilters] = useState<FilterState>({
    chamber: 'all',
    searchText: '',
    dateFrom: '',
    dateTo: '',
  });

  const filteredMeetings = useMemo(() => {
    return meetings.filter((meeting) => {
      if (filters.chamber !== 'all' && meeting.chamber !== filters.chamber) {
        return false;
      }

      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const titleMatch = meeting.title_or_subject?.toLowerCase().includes(searchLower);
        const committeeMatch = meeting.committee_name.toLowerCase().includes(searchLower);
        
        if (!titleMatch && !committeeMatch) {
          return false;
        }
      }

      if (filters.dateFrom && meeting.date) {
        if (meeting.date < filters.dateFrom) {
          return false;
        }
      }

      if (filters.dateTo && meeting.date) {
        if (meeting.date > filters.dateTo) {
          return false;
        }
      }

      return true;
    });
  }, [meetings, filters]);

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return {
    filters,
    filteredMeetings,
    updateFilter,
  };
}
