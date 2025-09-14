import type { FilterState } from '@/hooks/useFilters';

type FiltersProps = {
  filters: FilterState;
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  totalCount: number;
  filteredCount: number;
};

export function Filters({ filters, updateFilter, totalCount, filteredCount }: FiltersProps) {
  return (
    <section style={{ 
      background: 'white', 
      padding: '1.5rem', 
      borderRadius: '8px', 
      marginBottom: '2rem',
      border: '1px solid #e2e8f0'
    }}>
      <h2 style={{ marginBottom: '1rem' }}>Filter Meetings</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label htmlFor="chamber" style={{ display: 'block', fontWeight: '600', marginBottom: '0.25rem' }}>Chamber:</label>
          <select
            id="chamber"
            value={filters.chamber}
            onChange={(e) => updateFilter('chamber', e.target.value as FilterState['chamber'])}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e0', borderRadius: '4px' }}
          >
            <option value="all">All</option>
            <option value="house">House</option>
            <option value="senate">Senate</option>
          </select>
        </div>

        <div>
          <label htmlFor="search" style={{ display: 'block', fontWeight: '600', marginBottom: '0.25rem' }}>Search:</label>
          <input
            type="text"
            id="search"
            placeholder="Search title or committee..."
            value={filters.searchText}
            onChange={(e) => updateFilter('searchText', e.target.value)}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e0', borderRadius: '4px' }}
          />
        </div>

        <div>
          <label htmlFor="dateFrom" style={{ display: 'block', fontWeight: '600', marginBottom: '0.25rem' }}>From:</label>
          <input
            type="date"
            id="dateFrom"
            value={filters.dateFrom}
            onChange={(e) => updateFilter('dateFrom', e.target.value)}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e0', borderRadius: '4px' }}
          />
        </div>

        <div>
          <label htmlFor="dateTo" style={{ display: 'block', fontWeight: '600', marginBottom: '0.25rem' }}>To:</label>
          <input
            type="date"
            id="dateTo"
            value={filters.dateTo}
            onChange={(e) => updateFilter('dateTo', e.target.value)}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e0', borderRadius: '4px' }}
          />
        </div>
      </div>

      <div style={{ fontWeight: '600', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
        Showing {filteredCount} of {totalCount} meetings
      </div>
    </section>
  );
}
