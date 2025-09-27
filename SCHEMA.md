# Committee Meetings CSV Schema

Each row in `exports/committee_meetings_119.csv` represents a single committee
meeting from the 119th Congress. Columns appear in the order listed below.

| Column | Type | Example | Source / Derivation | Nullable |
| --- | --- | --- | --- | --- |
| `eventId` | string | `12345` | Committee meeting detail `eventId` | no |
| `congress` | integer | `119` | Constant filter value | no |
| `chamber` | string | `House` | Meeting detail `chamber` | yes |
| `meetingType` | string | `Hearing` | Normalized meeting type | no |
| `meetingDateTime` | datetime (ISO 8601 UTC) | `2025-03-12T14:00:00Z` | Meeting detail date/time converted to UTC | yes |
| `status` | string | `Scheduled` | Meeting detail `status` | yes |
| `committee_codes` | pipe-delimited string | `HSGG00|HSGG02` | Pipe-joined system codes from committees in the detail | yes |
| `committee_names` | pipe-delimited string | `House Committee on Oversight|Subcommittee on Government Operations` | Pipe-joined names for referenced committees | yes |
| `subcommittee_name` | string | `Subcommittee on Oversight` | Detail `subcommittee` name when present | yes |
| `title` | string | `Oversight of Agency X` | Meeting title with whitespace cleanup | yes |
| `location_building` | string | `Rayburn House Office Building` | Detail `location.building` | yes |
| `location_room` | string | `2154` | Detail `location.room` | yes |
| `location_city` | string | `Washington` | Detail `location.city` | yes |
| `location_state` | string | `DC` | Detail `location.state` | yes |
| `documents_count` | integer | `2` | Count of `documents_list` entries | no |
| `documents_list` | pipe-delimited string | `Transcript:Hearing:https://example.com/doc.pdf` | Each document is encoded as `type:title:url` and pipe-joined | yes |
| `witnesses_count` | integer | `4` | Count of `witnesses_list` entries | no |
| `witnesses_list` | pipe-delimited string | `Doe, Jane | Agency X | Director` | Each witness encoded as `Last, First | Organization | Title` | yes |
| `votes_list` | pipe-delimited string | `Voice vote on Amendment 1` | Compact descriptions of votes | yes |
| `amendments_list` | pipe-delimited string | `Amendment 1` | Amendment identifiers/descriptions | yes |
| `related_bills_list` | pipe-delimited string | `H.R.1234` | Related bill numbers | yes |
| `related_items_count` | integer | `3` | Count of related items | no |
| `related_items_summary` | pipe-delimited string | `Video recording|Committee report` | Descriptions of related items | yes |
| `meeting_detail_url` | string (URL) | `https://api.congress.gov/v3/...` | API-provided meeting URL | yes |
| `printed_hearing_pdf_url` | string (URL) | `https://www.govinfo.gov/content/pkg/CHRG-119hhrg.../pdf/CHRG-119hhrg....pdf` | Linked printed hearing PDF when matched | yes |
| `printed_hearing_match_method` | string | `explicit` | One of `explicit`, `fuzzy_date_title`, `fuzzy_plus_witness` | yes |
| `printed_hearing_match_confidence` | decimal | `0.94` | Confidence score from matching algorithm | yes |
| `updateDate` | datetime (ISO 8601 UTC) | `2025-03-12T18:30:00Z` | API `updateDate` | yes |
| `source_last_modified` | datetime (ISO 8601 UTC) | `2025-03-12T18:30:00Z` | API last-modified timestamp | yes |
| `fetch_run_id` | UUID string | `550e8400-e29b-41d4-a716-446655440000` | UUID assigned to the export run | no |

## Pipe-Join Semantics

* Lists use the pipe (`|`) character as a separator. Empty lists are stored as
  an empty string and the corresponding count column is set to `0`.
* The `documents_list` encoding is strictly `type:title:url` for each document.
* The `witnesses_list` encoding preserves positional placeholders: even if an
  organization or title is missing the delimiter (` | `) remains so that the
  parser can reliably split columns.

