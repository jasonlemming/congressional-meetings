# Congress.gov Committee Meeting Exporter

This repository contains a Python 3.11 command line utility that downloads
committee meeting data for the 119th Congress from the Congress.gov v3 API
and produces a single denormalized CSV export with optional printed hearing
enrichment.

## Features

* Enumerates committees and meetings for the selected chambers with full
  pagination support.
* Hydrates each meeting with its detailed record and normalizes nested fields
  into a flat schema suitable for analytics pipelines.
* Links printed hearings using explicit document references or fuzzy matching
  based on title, date proximity, and witness overlap.
* Writes the export to `./exports/committee_meetings_119.csv`, overwriting any
  previous file.

## Requirements

* Python 3.11
* Congress.gov API key (v3) — obtain from [api.congress.gov](https://api.congress.gov/)

Recommended setup (from the repository root):

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file or set an environment variable with your API key:

```bash
echo "CONGRESS_API_KEY=your-key" > .env
```

## Usage

The CLI accepts several filters. All runs write to
`exports/committee_meetings_119.csv`.

```bash
python export_committees.py
```

Filter to the House chamber only:

```bash
python export_committees.py --chamber house
```

Filter to a specific committee:

```bash
python export_committees.py --committee-code HSGG00
```

Export only hearings held after 1 February 2025:

```bash
python export_committees.py --meeting-type hearing --since 2025-02-01
```

## Output Schema

The export contains one row per committee meeting. See [SCHEMA.md](SCHEMA.md)
for the authoritative column dictionary, including data types and examples.

Repeated fields are flattened using pipe (`|`) delimiters. For example,
`documents_list` will look like:

```
Transcript:Full Committee Hearing:https://example.com/transcript.pdf|Printed Hearing:Official Record:https://example.com/hearing.pdf
```

The script populates `printed_hearing_pdf_url`, `printed_hearing_match_method`,
and `printed_hearing_match_confidence` when a printed hearing is linked via the
explicit or fuzzy matching strategies.

## Notes

* The tool respects the API's rate limits by issuing requests roughly once per
  second and automatically retries transient errors using exponential backoff.
* Pagination uses the maximum allowed page size (250) to minimize request
  counts.
* Normalization ensures `documents_count`, `witnesses_count`, and
  `related_items_count` reflect the lengths of their respective list columns.
* Known edge cases include missing location information and inconsistently
  formatted titles; both are handled conservatively.

