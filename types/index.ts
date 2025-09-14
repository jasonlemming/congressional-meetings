export type Meeting = {
  meeting_id: string; // prefer Congress.gov eventId; else House EventID; else stable composite
  congress?: number;
  chamber: 'house' | 'senate';
  committee_name: string;
  subcommittee_name?: string;
  title_or_subject?: string;
  meeting_type?: string; // hearing | markup | business | roundtable | other
  date?: string; // YYYY-MM-DD
  start_time?: string; // HH:MM (local ET if known)
  location?: string;
  status?: string; // scheduled | postponed | canceled | concluded
  detail_page_url: string; // REQUIRED: public event page (Congress.gov or House or Senate)
  video_url?: string;
  witnesses?: string[];
  related_legislation?: string[]; // e.g., bill numbers
  source: 'congress.gov' | 'docs.house.gov' | 'senate.gov';
  last_seen_at: string; // ISO timestamp
};
