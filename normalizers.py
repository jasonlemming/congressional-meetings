"""Normalization helpers for committee meeting data."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Dict, Iterable, List, Mapping, MutableMapping, Optional, Sequence


CSV_COLUMNS: Sequence[str] = (
    "eventId",
    "congress",
    "chamber",
    "meetingType",
    "meetingDateTime",
    "status",
    "committee_codes",
    "committee_names",
    "subcommittee_name",
    "title",
    "location_building",
    "location_room",
    "location_city",
    "location_state",
    "documents_count",
    "documents_list",
    "witnesses_count",
    "witnesses_list",
    "votes_list",
    "amendments_list",
    "related_bills_list",
    "related_items_count",
    "related_items_summary",
    "meeting_detail_url",
    "printed_hearing_pdf_url",
    "printed_hearing_match_method",
    "printed_hearing_match_confidence",
    "updateDate",
    "source_last_modified",
    "fetch_run_id",
)


CONTROL_CHARS = re.compile(r"[\u0000-\u001F\u007F]+")


def clean_text(value: Optional[str]) -> str:
    """Trim whitespace and strip control characters."""

    if not value:
        return ""
    return CONTROL_CHARS.sub("", value).strip()


def canonical_meeting_type(value: Optional[str]) -> str:
    if not value:
        return "Other"
    normalized = value.strip().lower()
    mapping = {
        "hearing": "Hearing",
        "markup": "Markup",
        "business meeting": "Business Meeting",
        "field hearing": "Field Hearing",
    }
    return mapping.get(normalized, value.title() if value else "Other")


def to_utc_iso(value: Optional[str]) -> str:
    if not value:
        return ""
    try:
        cleaned = value.replace("Z", "+00:00")
        dt = datetime.fromisoformat(cleaned)
    except ValueError:
        return value
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    dt = dt.astimezone(timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")


def pipe_join(values: Iterable[str]) -> str:
    return "|".join([v for v in values if v])


def normalize_documents(documents: Optional[Iterable[Mapping]]) -> tuple[int, str]:
    items: List[str] = []
    count = 0
    if documents:
        for doc in documents:
            if not isinstance(doc, Mapping):
                continue
            doc_type = clean_text(str(doc.get("type", "")))
            doc_title = clean_text(str(doc.get("title", "")))
            url = clean_text(str(doc.get("url", "")))
            items.append(f"{doc_type}:{doc_title}:{url}")
        count = len(items)
    return count, pipe_join(items)


def normalize_witnesses(witnesses: Optional[Iterable[Mapping]]) -> tuple[int, str]:
    items: List[str] = []
    if witnesses:
        for witness in witnesses:
            if not isinstance(witness, Mapping):
                continue
            last = clean_text(witness.get("lastName"))
            first = clean_text(witness.get("firstName"))
            org = clean_text(witness.get("organization"))
            title = clean_text(witness.get("title"))
            segment = ", ".join([part for part in [last, first] if part])
            parts = [segment, org, title]
            items.append(" | ".join(parts))
    return len(items), pipe_join(items)


def normalize_committees(detail: Mapping, committees_lookup: Mapping[str, Mapping[str, str]]) -> tuple[str, str, str]:
    committee_codes: List[str] = []
    committee_names: List[str] = []
    subcommittee_name = ""

    committees = detail.get("committees") or detail.get("committee") or []
    if isinstance(committees, Mapping):
        committees = committees.get("item", [])

    for entry in committees or []:
        if not isinstance(entry, Mapping):
            continue
        system_code = clean_text(entry.get("systemCode"))
        if system_code:
            committee_codes.append(system_code)
            metadata = committees_lookup.get(system_code, {})
            committee_names.append(clean_text(metadata.get("name") or entry.get("name")))
        name = clean_text(entry.get("name"))
        if name and name not in committee_names:
            committee_names.append(name)
        subcommittee = clean_text(entry.get("subcommittee"))
        if subcommittee:
            subcommittee_name = subcommittee

    return pipe_join(committee_codes), pipe_join(committee_names), subcommittee_name


def extract_list(detail: Mapping, key: str) -> List[Mapping]:
    data = detail.get(key)
    if not data:
        return []
    if isinstance(data, Mapping) and "item" in data:
        items = data["item"]
        if isinstance(items, list):
            return [item for item in items if isinstance(item, Mapping)]
        if isinstance(items, Mapping):
            return [items]
    if isinstance(data, list):
        return [item for item in data if isinstance(item, Mapping)]
    if isinstance(data, Mapping):
        return [data]
    return []


def normalize_list_strings(values: Iterable[str]) -> str:
    return pipe_join([clean_text(value) for value in values if value])


def normalize_meeting_detail(detail: Mapping, committees_lookup: Mapping[str, Mapping[str, str]]) -> Dict[str, object]:
    row: Dict[str, object] = {column: "" for column in CSV_COLUMNS}

    row["eventId"] = clean_text(detail.get("eventId") or detail.get("eventID"))
    row["congress"] = detail.get("congress") or 119
    row["chamber"] = clean_text(detail.get("chamber"))
    row["meetingType"] = canonical_meeting_type(detail.get("meetingType"))
    row["meetingDateTime"] = to_utc_iso(detail.get("meetingDateTime") or detail.get("date"))
    row["status"] = clean_text(detail.get("status"))

    committee_codes, committee_names, subcommittee_name = normalize_committees(detail, committees_lookup)
    row["committee_codes"] = committee_codes
    row["committee_names"] = committee_names
    row["subcommittee_name"] = subcommittee_name

    location = detail.get("location", {}) if isinstance(detail.get("location"), Mapping) else {}
    row["title"] = clean_text(detail.get("title"))
    row["location_building"] = clean_text(location.get("building"))
    row["location_room"] = clean_text(location.get("room"))
    row["location_city"] = clean_text(location.get("city"))
    row["location_state"] = clean_text(location.get("state"))

    documents = extract_list(detail, "documents")
    docs_count, docs_joined = normalize_documents(documents)
    row["documents_count"] = docs_count
    row["documents_list"] = docs_joined

    witnesses = extract_list(detail, "witnesses")
    witnesses_count, witnesses_joined = normalize_witnesses(witnesses)
    row["witnesses_count"] = witnesses_count
    row["witnesses_list"] = witnesses_joined

    votes = extract_list(detail, "votes")
    row["votes_list"] = normalize_list_strings(
        [f"{clean_text(vote.get('description'))}" for vote in votes]
    )

    amendments = extract_list(detail, "amendments")
    row["amendments_list"] = normalize_list_strings(
        [clean_text(amend.get("number")) or clean_text(amend.get("description")) for amend in amendments]
    )

    related_bills = extract_list(detail, "relatedBills")
    row["related_bills_list"] = normalize_list_strings(
        [clean_text(bill.get("number")) for bill in related_bills]
    )

    related_items = extract_list(detail, "relatedItems")
    row["related_items_count"] = len(related_items)
    row["related_items_summary"] = normalize_list_strings(
        [clean_text(item.get("description")) for item in related_items]
    )

    row["meeting_detail_url"] = clean_text(detail.get("url"))
    row["updateDate"] = to_utc_iso(detail.get("updateDate") or detail.get("updateDateTime"))
    row["source_last_modified"] = to_utc_iso(detail.get("lastModified") or detail.get("lastModifiedDate"))

    return row


__all__ = ["CSV_COLUMNS", "normalize_meeting_detail", "clean_text", "canonical_meeting_type", "pipe_join"]

