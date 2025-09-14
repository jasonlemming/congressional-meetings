'use client';

import { useMeetings } from '@/hooks/useMeetings';
import { useFilters } from '@/hooks/useFilters';
import { Filters } from '@/components/Filters';
import { MeetingsTable } from '@/components/MeetingsTable';

export default function HomePage() {
  const { meetings, loading, error } = useMeetings();
  const { filters, filteredMeetings, updateFilter } = useFilters(meetings);

  if (loading) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <p>Loading congressional meetings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <h1>Error</h1>
        <p>Failed to load meetings: {error}</p>
      </div>
    );
  }

  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1a365d', marginBottom: '0.5rem', margin: 0 }}>
          Congressional Committee Meetings
        </h1>
        <p style={{ fontSize: '1.1rem', color: '#666', maxWidth: '600px', margin: '0.5rem 0 0 0' }}>
          Upcoming U.S. House and Senate committee hearings, markups, and business meetings.
          Data sourced from senate.gov and congress.gov.
        </p>
      </header>

      <Filters
        filters={filters}
        updateFilter={updateFilter}
        totalCount={meetings.length}
        filteredCount={filteredMeetings.length}
      />

      <MeetingsTable meetings={filteredMeetings} />

      <footer style={{ 
        marginTop: '3rem', 
        paddingTop: '2rem', 
        borderTop: '1px solid #e2e8f0', 
        textAlign: 'center', 
        color: '#666',
        backgroundColor: '#e3f2fd',
        padding: '1rem',
        borderRadius: '8px'
      }}>
        <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>
          🔄 Site Updated: {new Date().toLocaleString('en-US', { 
            timeZone: 'America/New_York',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZoneName: 'short'
          })}
        </p>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          Showing {meetings.length} meetings • Data auto-refreshes every 45 minutes
        </p>
      </footer>
    </main>
  );
}
