"""Generic utilities for the committee meeting exporter."""

from __future__ import annotations

import csv
import logging
import os
from pathlib import Path
from typing import Iterable, List, Mapping, Sequence


def setup_logger() -> logging.Logger:
    """Configure and return a module-level logger."""

    logger = logging.getLogger("committee_exporter")
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter("%(asctime)s %(levelname)s: %(message)s")
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger


def write_csv(rows: Iterable[Mapping[str, object]], path: os.PathLike[str] | str, columns: Sequence[str]) -> None:
    """Write rows to ``path`` ensuring deterministic column order."""

    path_obj = Path(path)
    path_obj.parent.mkdir(parents=True, exist_ok=True)
    with path_obj.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(columns))
        writer.writeheader()
        for row in rows:
            writer.writerow({key: row.get(key, "") for key in columns})


__all__ = ["setup_logger", "write_csv"]

