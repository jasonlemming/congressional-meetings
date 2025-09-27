"""Printed hearing linkage logic."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, Iterable, List, Mapping, Optional, Sequence, Tuple

from normalizers import clean_text, pipe_join


def jaro_winkler_similarity(s1: str, s2: str) -> float:
    """Compute a basic Jaro–Winkler similarity score."""

    s1 = s1 or ""
    s2 = s2 or ""
    if s1 == s2:
        return 1.0
    s1_len = len(s1)
    s2_len = len(s2)
    if s1_len == 0 or s2_len == 0:
        return 0.0
    max_dist = max(s1_len, s2_len) // 2 - 1
    s1_matches = [False] * s1_len
    s2_matches = [False] * s2_len
    matches = 0
    transpositions = 0

    for i in range(s1_len):
        start = max(0, i - max_dist)
        end = min(i + max_dist + 1, s2_len)
        for j in range(start, end):
            if s2_matches[j]:
                continue
            if s1[i] != s2[j]:
                continue
            s1_matches[i] = True
            s2_matches[j] = True
            matches += 1
            break
    if matches == 0:
        return 0.0

    k = 0
    for i in range(s1_len):
        if not s1_matches[i]:
            continue
        while not s2_matches[k]:
            k += 1
        if s1[i] != s2[k]:
            transpositions += 1
        k += 1

    transpositions /= 2
    jaro = (
        matches / s1_len + matches / s2_len + (matches - transpositions) / matches
    ) / 3

    prefix = 0
    for i in range(min(4, s1_len, s2_len)):
        if s1[i] == s2[i]:
            prefix += 1
        else:
            break
    return jaro + 0.1 * prefix * (1 - jaro)


@dataclass
class HearingRecord:
    system_code: str
    date: Optional[datetime]
    title: str
    pdf_url: str
    witnesses: Sequence[str]


def build_hearings_index(hearings: Iterable[Mapping]) -> Dict[str, List[HearingRecord]]:
    index: Dict[str, List[HearingRecord]] = {}
    for hearing in hearings:
        if not isinstance(hearing, Mapping):
            continue
        system_code = clean_text(hearing.get("systemCode"))
        if not system_code:
            continue
        title = clean_text(hearing.get("title"))
        pdf_url = clean_text(hearing.get("pdfUrl") or hearing.get("pdfURL"))
        date_value = clean_text(hearing.get("date"))
        date = None
        if date_value:
            try:
                date = datetime.fromisoformat(date_value.replace("Z", "+00:00"))
            except ValueError:
                date = None
        witnesses = []
        witness_list = hearing.get("witnesses") or []
        if isinstance(witness_list, Mapping) and "item" in witness_list:
            witness_list = witness_list["item"]
        if isinstance(witness_list, list):
            witnesses = [clean_text(str(item)) for item in witness_list]
        record = HearingRecord(system_code=system_code, date=date, title=title, pdf_url=pdf_url, witnesses=witnesses)
        index.setdefault(system_code, []).append(record)
    return index


def match_printed_hearing(row: Mapping[str, str], hearings_index: Mapping[str, List[HearingRecord]]):
    system_codes = (row.get("committee_codes") or "").split("|")
    meeting_date_str = row.get("meetingDateTime") or ""
    meeting_title = clean_text(row.get("title"))
    witnesses = [segment.strip() for segment in (row.get("witnesses_list") or "").split("|") if segment.strip()]

    meeting_date = None
    if meeting_date_str:
        try:
            meeting_date = datetime.fromisoformat(meeting_date_str.replace("Z", "+00:00"))
        except ValueError:
            meeting_date = None

    explicit_pdf = row.get("documents_list") or ""
    for segment in explicit_pdf.split("|"):
        if segment.lower().startswith("printed hearing"):
            parts = segment.split(":")
            if len(parts) >= 3:
                url = parts[-1]
                return url, "explicit", 1.0

    window = timedelta(days=7)
    best_match: Tuple[float, HearingRecord, str] | None = None
    for system_code in system_codes:
        records = hearings_index.get(system_code) or []
        for record in records:
            if not record.pdf_url:
                continue
            confidence = jaro_winkler_similarity(meeting_title.lower(), record.title.lower())
            if meeting_date and record.date:
                if abs((meeting_date - record.date).days) > window.days:
                    continue
            method = "fuzzy_date_title"
            if witnesses and record.witnesses:
                overlap = _witness_overlap(witnesses, record.witnesses)
                if overlap:
                    confidence = min(1.0, confidence + 0.05 * overlap)
                    method = "fuzzy_plus_witness"
            if confidence < 0.9:
                continue
            if not best_match or confidence > best_match[0]:
                best_match = (confidence, record, method)

    if best_match:
        confidence, record, method = best_match
        return record.pdf_url, method, round(confidence, 3)

    return "", "", ""


def _witness_overlap(meeting_witnesses: Sequence[str], hearing_witnesses: Sequence[str]) -> int:
    meeting_tokens = {w.lower() for w in meeting_witnesses if w}
    hearing_tokens = {w.lower() for w in hearing_witnesses if w}
    return len(meeting_tokens & hearing_tokens)


__all__ = ["match_printed_hearing", "build_hearings_index"]

