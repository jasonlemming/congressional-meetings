"""CLI entrypoint to export 119th Congress committee meetings."""

from __future__ import annotations

import argparse
import os
from datetime import datetime
from typing import Dict, Iterable, List, Mapping, Optional
from uuid import uuid4

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - optional dependency
    load_dotenv = None

from congress_api import CongressAPI
from matching import build_hearings_index, match_printed_hearing
from normalizers import CSV_COLUMNS, normalize_meeting_detail
from rate_limit import Throttler
from utils import setup_logger, write_csv


CHAMBER_CHOICES = ["house", "senate", "joint", "all"]
MEETING_TYPE_CHOICES = ["hearing", "markup", "business", "all"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export committee meetings for the 119th Congress")
    parser.add_argument("--chamber", choices=CHAMBER_CHOICES, default="all")
    parser.add_argument("--committee-code", dest="committee_code", help="Filter by committee system code", default=None)
    parser.add_argument("--meeting-type", choices=MEETING_TYPE_CHOICES, default="all")
    parser.add_argument("--since", help="Lower bound meeting date (YYYY-MM-DD)", default=None)
    return parser.parse_args()


def resolve_chambers(chamber: str) -> List[str]:
    if chamber == "all":
        return ["house", "senate", "joint"]
    return [chamber]


def parse_date(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def filter_since(meeting_datetime: str, since: Optional[datetime]) -> bool:
    if not since or not meeting_datetime:
        return True
    try:
        meeting_dt = datetime.fromisoformat(meeting_datetime.replace("Z", "+00:00"))
    except ValueError:
        return True
    return meeting_dt >= since


def committee_code_in_row(row: Mapping[str, str], committee_code: Optional[str]) -> bool:
    if not committee_code:
        return True
    codes = (row.get("committee_codes") or "").split("|")
    return committee_code.upper() in {code.upper() for code in codes if code}


def main() -> None:
    if load_dotenv:
        load_dotenv()

    args = parse_args()
    logger = setup_logger()

    api_key = os.environ.get("CONGRESS_API_KEY")
    if not api_key:
        raise SystemExit("CONGRESS_API_KEY not set. Create a .env file or export it in the environment.")

    throttler = Throttler(1.0)
    api = CongressAPI(api_key, throttler=throttler)

    chambers = resolve_chambers(args.chamber)
    since_date = parse_date(args.since) if args.since else None

    logger.info("Building committee lookup…")
    committees_lookup: Dict[str, Dict[str, str]] = {}
    for chamber in chambers:
        for committee in api.iter_committees(congress=119, chamber=chamber):
            system_code = str(committee.get("systemCode"))
            if system_code:
                committees_lookup[system_code] = {
                    "name": committee.get("name", ""),
                    "chamber": chamber,
                }

    logger.info("Enumerating committee meetings…")
    meeting_keys: List[tuple[str, str]] = []
    for chamber in chambers:
        for item in api.iter_committee_meetings(congress=119, chamber=chamber, meeting_type=args.meeting_type):
            event_id = str(item.get("eventId") or item.get("eventID"))
            if not event_id:
                continue
            meeting_keys.append((chamber, event_id))

    logger.info("Found %d meeting stubs", len(meeting_keys))

    logger.info("Fetching printed hearings…")
    hearings: List[Mapping] = []
    for chamber in chambers:
        hearings.extend(list(api.iter_hearings(congress=119, chamber=chamber)))
    hearings_index = build_hearings_index(hearings)

    logger.info("Hydrating meeting details…")
    rows = []
    skipped = 0
    fetch_run_id = str(uuid4())
    for chamber, event_id in meeting_keys:
        try:
            detail = api.get_committee_meeting_detail(congress=119, chamber=chamber, event_id=event_id)
        except Exception as exc:  # pragma: no cover - logged and skipped
            logger.warning("Failed to fetch meeting %s/%s: %s", chamber, event_id, exc)
            skipped += 1
            continue

        row = normalize_meeting_detail(detail, committees_lookup)
        if not filter_since(row.get("meetingDateTime", ""), since_date):
            continue
        if not committee_code_in_row(row, args.committee_code):
            continue

        pdf_url, method, confidence = match_printed_hearing(row, hearings_index)
        row["printed_hearing_pdf_url"] = pdf_url
        row["printed_hearing_match_method"] = method
        row["printed_hearing_match_confidence"] = confidence
        row["fetch_run_id"] = fetch_run_id
        rows.append(row)

    logger.info("Hydrated %d meetings, skipped %d", len(rows), skipped)

    output_path = os.path.join("exports", "committee_meetings_119.csv")
    logger.info("Writing CSV to %s", output_path)
    write_csv(rows, output_path, CSV_COLUMNS)
    logger.info("Done. Exported %d rows", len(rows))


if __name__ == "__main__":  # pragma: no cover
    main()

