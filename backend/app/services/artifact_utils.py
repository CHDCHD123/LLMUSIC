from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path
from typing import Iterable

TIMESTAMP_FORMAT = "%Y-%m-%d_%H-%M-%S"
DATE_FORMAT = "%Y-%m-%d"


def format_snapshot_timestamp(value: datetime) -> str:
    return value.strftime(TIMESTAMP_FORMAT)


def parse_artifact_timestamp(path: str | Path, prefix: str) -> datetime | None:
    stem = Path(path).stem
    if not stem.startswith(prefix):
        return None
    raw_value = stem.replace(prefix, "", 1)
    for pattern in (TIMESTAMP_FORMAT, DATE_FORMAT):
        try:
            return datetime.strptime(raw_value, pattern)
        except ValueError:
            continue
    return None


def list_artifacts(directories: Iterable[Path], pattern: str, prefix: str) -> list[tuple[datetime, Path]]:
    items: list[tuple[datetime, Path]] = []
    seen: set[Path] = set()
    for directory in directories:
        if not directory.exists():
            continue
        for path in directory.glob(pattern):
            resolved = path.resolve()
            if resolved in seen:
                continue
            timestamp = parse_artifact_timestamp(path, prefix)
            if timestamp is None:
                continue
            items.append((timestamp, path))
            seen.add(resolved)
    items.sort(key=lambda item: item[0])
    return items


def format_elapsed(delta: timedelta) -> str:
    total_seconds = max(int(delta.total_seconds()), 0)
    days, remainder = divmod(total_seconds, 86400)
    hours, remainder = divmod(remainder, 3600)
    minutes, _ = divmod(remainder, 60)
    parts: list[str] = []
    if days:
        parts.append(f"{days}일")
    if hours:
        parts.append(f"{hours}시간")
    if minutes or not parts:
        parts.append(f"{minutes}분")
    return " ".join(parts)
