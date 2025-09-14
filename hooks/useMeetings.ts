import { useState, useEffect } from 'react';
import type { Meeting } from '@/types';

export function useMeetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/meetings')
      .then((res) => res.json())
      .then((data: Meeting[]) => {
        setMeetings(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { meetings, loading, error };
}
