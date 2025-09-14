import { useState } from 'react';
import type { Meeting } from '@/types';
import { HearingModal } from './HearingModal';

type MeetingsTableProps = {
  meetings: Meeting[];
};

export function MeetingsTable({ meetings }: MeetingsTableProps) {
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  if (meetings.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#666' }}>
        <p>No meetings found matching your criteria.</p>
      </div>
    );
  }

  return (
    <>
      <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f7fafc' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', borderBottom: '2px solid #e2e8f0' }}>Date</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', borderBottom: '2px solid #e2e8f0' }}>Chamber</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', borderBottom: '2px solid #e2e8f0' }}>Committee</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', borderBottom: '2px solid #e2e8f0' }}>Title/Subject</th>
            </tr>
          </thead>
          <tbody>
            {meetings.map((meeting) => (
              <tr key={meeting.meeting_id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '0.75rem' }}>{meeting.date || 'TBD'}</td>
                <td style={{ padding: '0.75rem' }}>
                  <span style={{ 
                    display: 'inline-block', 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '4px', 
                    fontSize: '0.75rem', 
                    fontWeight: '600', 
                    textTransform: 'uppercase',
                    backgroundColor: meeting.chamber === 'house' ? '#e6fffa' : '#ede9fe',
                    color: meeting.chamber === 'house' ? '#065f46' : '#581c87'
                  }}>
                    {meeting.chamber}
                  </span>
                </td>
                <td style={{ padding: '0.75rem' }}>{meeting.committee_name}</td>
                <td style={{ padding: '0.75rem' }}>
                  <button
                    onClick={() => setSelectedMeeting(meeting)}
                    style={{ 
                      background: 'none',
                      border: 'none',
                      color: '#3182ce',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      padding: 0,
                      textAlign: 'left'
                    }}
                  >
                    {meeting.title_or_subject || 'View Details'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <HearingModal
        meeting={selectedMeeting!}
        isOpen={!!selectedMeeting}
        onClose={() => setSelectedMeeting(null)}
      />
    </>
  );
}
