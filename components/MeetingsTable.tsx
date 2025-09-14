"use client";

import React from "react";

type Meeting = {
  meeting_id: string;
  title_or_subject?: string;
  date?: string;
  chamber?: string;
  committee_name?: string;
  detail_page_url?: string;
};

export default function MeetingsTable({ meetings }: { meetings: Meeting[] }) {
  const rows = Array.isArray(meetings) ? meetings : [];

  return (
    <div style={{ background: "white", borderRadius: "8px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ backgroundColor: "#f7fafc" }}>
            <th style={th}>Title / Subject</th>
            <th style={th}>Date</th>
            <th style={th}>Chamber</th>
            <th style={th}>Committee</th>
            <th style={th}>Details</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.meeting_id} style={{ borderTop: "1px solid #e2e8f0" }}>
              <td style={td}>{m.title_or_subject || "—"}</td>
              <td style={td}>{m.date || "—"}</td>
              <td style={td}>{m.chamber || "—"}</td>
              <td style={td}>{m.committee_name || "—"}</td>
              <td style={td}>
                {m.detail_page_url ? (
                  <a href={m.detail_page_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>
                    Open
                  </a>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}

          {rows.length === 0 && (
            <tr>
              <td style={{ ...td, textAlign: "center" }} colSpan={5}>
                No meetings found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 14px",
  fontWeight: 600,
  fontSize: 14,
};

const td: React.CSSProperties = {
  padding: "10px 14px",
  verticalAlign: "top",
  fontSize: 14,
};
