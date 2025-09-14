"use client";

import { useEffect, useState } from "react";

export type Meeting = {
  congress?: number;
  session?: string | number;
  meeting_id: string;
  meeting_type?: string;
  chamber?: "house" | "senate";
  committee_name?: string;
  title_or_subject?: string;
  date?: string;
  start_time?: string;
  location?: string;
  status?: string;
  detail_page_url?: string;
  video_url?: string;
  transcript_url?: string;
  witnesses?: string;
  testimony_urls?: string;
  related_legislation?: string;
  notes?: string;
};

type Wrapped = { updated_at?: string; count?: number; meetings?: Meeting[] };
type FetchResponse = Wrapped | Meeting[];

export function useMeetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meta, setMeta] = useState<{ updated_at?: string; count?: number }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        let res = await fetch("/api/meetings", { cache: "no-store" });
        if (!res.ok) res = await fetch("/meetings.json", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data: FetchResponse = await res.json();

        const rows = Array.isArray(data) ? data : Array.isArray(data.meetings) ? data.meetings : [];
        setMeetings(rows);

        if (!Array.isArray(data)) setMeta({ updated_at: data.updated_at, count: data.count });
      } catch (e: any) {
        setError(e?.message ?? "Failed to load meetings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { meetings, loading, error, meta };
}

