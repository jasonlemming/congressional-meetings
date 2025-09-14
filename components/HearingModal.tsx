import { useState } from 'react';
import type { Meeting } from '@/types';

type HearingModalProps = {
  meeting: Meeting;
  isOpen: boolean;
  onClose: () => void;
};

export function HearingModal({ meeting, isOpen, onClose }: HearingModalProps) {
  if (!isOpen) return null;

  const formatDate = (date?: string) => {
    if (!date) return 'TBD';
    try {
      return new Date(date + 'T12:00:00').toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return date;
    }
  };

  const formatTime = (time?: string) => {
    if (!time) return 'Time TBD';
    try {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:${minutes} ${ampm} ET`;
    } catch {
      return time;
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '2rem',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'auto',
          position: 'relative',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: '#666',
            padding: '0.5rem'
          }}
        >
          ×
        </button>

        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', paddingRight: '2rem' }}>
            {meeting.title_or_subject || 'Committee Meeting'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
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
            {meeting.meeting_type && (
              <span style={{ 
                padding: '0.25rem 0.5rem', 
                backgroundColor: '#f3f4f6', 
                borderRadius: '4px', 
                fontSize: '0.75rem',
                textTransform: 'capitalize'
              }}>
                {meeting.meeting_type}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Committee:</strong>
            <div>
              {meeting.committee_name}
              {meeting.subcommittee_name && (
                <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.25rem' }}>
                  Subcommittee: {meeting.subcommittee_name}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Date:</strong>
              {formatDate(meeting.date)}
            </div>
            <div>
              <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Time:</strong>
              {formatTime(meeting.start_time)}
            </div>
          </div>

          {meeting.location && (
            <div>
              <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Location:</strong>
              {meeting.location}
            </div>
          )}

          {meeting.status && meeting.status !== 'scheduled' && (
            <div>
              <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Status:</strong>
              <span style={{ 
                padding: '0.25rem 0.5rem', 
                borderRadius: '4px', 
                fontSize: '0.875rem',
                backgroundColor: meeting.status === 'postponed' ? '#fef3c7' : meeting.status === 'canceled' ? '#fee2e2' : '#f3f4f6',
                color: meeting.status === 'postponed' ? '#92400e' : meeting.status === 'canceled' ? '#991b1b' : '#374151'
              }}>
                {meeting.status}
              </span>
            </div>
          )}

          {meeting.witnesses && meeting.witnesses.length > 0 && (
            <div>
              <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Witnesses:</strong>
              <ul style={{ margin: '0', paddingLeft: '1.5rem' }}>
                {meeting.witnesses.map((witness, index) => (
                  <li key={index} style={{ marginBottom: '0.25rem' }}>{witness}</li>
                ))}
              </ul>
            </div>
          )}

          {meeting.related_legislation && meeting.related_legislation.length > 0 && (
            <div>
              <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Related Legislation:</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {meeting.related_legislation.map((bill, index) => (
                  <span key={index} style={{ 
                    padding: '0.25rem 0.5rem', 
                    backgroundColor: '#dbeafe', 
                    color: '#1e40af',
                    borderRadius: '4px', 
                    fontSize: '0.875rem'
                  }}>
                    {bill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
          
            href={meeting.detail_page_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            View Official Page
          </a>
          {meeting.video_url && (
            
              href={meeting.video_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#10b981',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              Watch Video
            </a>
          )}
        </div>

        <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#6b7280' }}>
          Source: {meeting.source} • Last updated: {new Date(meeting.last_seen_at).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
