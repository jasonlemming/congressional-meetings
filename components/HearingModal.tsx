import type { Meeting } from '@/types';

type HearingModalProps = {
  meeting: Meeting;
  isOpen: boolean;
  onClose: () => void;
};

export function HearingModal({ meeting, isOpen, onClose }: HearingModalProps) {
  if (!isOpen) return null;

  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '500px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        <h2 style={{ marginBottom: '1rem', paddingRight: '2rem' }}>{meeting.title_or_subject || 'Committee Meeting'}</h2>
        <p><strong>Committee:</strong> {meeting.committee_name}</p>
        <p><strong>Chamber:</strong> {meeting.chamber.toUpperCase()}</p>
        <p><strong>Date:</strong> {meeting.date || 'TBD'}</p>
        <a href={meeting.detail_page_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '1rem', padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>View Official Page</a>
      </div>
    </div>
  );
}
