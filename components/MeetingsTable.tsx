import { useState } from 'react';
import type { Meeting } from '@/types';
import { HearingModal } from './HearingModal';

type MeetingsTableProps = {
  meetings: Meeting[];
};

export function MeetingsTable({ meetings }: MeetingsTableProps) {
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  if (meetings.length === 0) {
    return <div>No meetings found</div>;
  }

  return (
    <>
      <div>
        <h3>Found {meetings.length} meetings:</h3>
        {meetings.map((meeting) => (
          <div key={meeting.meeting_id} style={{ border: '1px solid #ccc', padding: '1rem', margin: '1rem 0' }}>
            <strong>{meeting.committee_name}</strong>
            <br />
            <button
              onClick={() => setSelectedMeeting(meeting)}
              style={{ 
                background: 'none',
                border: 'none',
                color: '#3182ce',
                textDecoration: 'underline',
                cursor: 'pointer',
                padding: 0
              }}
            >
              {meeting.title_or_subject || 'View Details'}
            </button>
          </div>
        ))}
      </div>

      <HearingModal
        meeting={selectedMeeting!}
        isOpen={!!selectedMeeting}
        onClose={() => setSelectedMeeting(null)}
      />
    </>
  );
}
