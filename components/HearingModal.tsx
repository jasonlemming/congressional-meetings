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
          position: 'relative'
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
            cursor: 'pointer'
          }}
        >
          ×
        </button>

        <h2 style={{ marginBottom: '1rem', paddingRight: '2rem' }}>
          {meeting.title_or_subject || 'Committee Meeting'}
        </h2>
        
        <div style={{ marginBottom: '1rem' }}>
          <strong>Committee:</strong> {meeting.committee_name}
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <strong>Date:</strong> {formatDate(meeting.date)}
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <strong>Chamber:</strong> {meeting.chamber.toUpperCase()}
        </div>
        
        
          href={meeting.detail_page_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px'
          }}
        >
          View Official Page
        </a>
      </div>
    </div>
  );
}
