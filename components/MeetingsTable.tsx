import type { Meeting } from '@/types';

type MeetingsTableProps = {
  meetings: Meeting[];
};

export function MeetingsTable({ meetings }: MeetingsTableProps) {
  if (meetings.length === 0) {
    return <div>No meetings found</div>;
  }

  return (
    <div>
      <h3>Found {meetings.length} meetings:</h3>
      {meetings.map((meeting) => (
        <div key={meeting.meeting_id} style={{ border: '1px solid #ccc', padding: '1rem', margin: '1rem 0' }}>
          <strong>{meeting.committee_name}</strong>
          <br />
          {meeting.title_or_subject}
          <br />
          <a href={meeting.detail_page_url} target="_blank" rel="noopener noreferrer">
            View Details
          </a>
        </div>
      ))}
    </div>
  );
}
