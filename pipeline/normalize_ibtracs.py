"""Build the full since-1980 global tropical-cyclone archive from IBTrACS."""
from __future__ import annotations

import csv
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

from download_ibtracs import URL

INPUT = Path("pipeline/cache/ibtracs.since1980.csv")
OUT = Path("public/data")
BASINS = {"NA", "EP", "WP", "NI", "SI", "SP", "SA"}
MAX_PREVIEW_POINTS = 18


def number(value: str) -> float | None:
    try:
        return float(value) if value.strip() else None
    except (ValueError, AttributeError):
        return None


def first_number(*values: str) -> float | None:
    return next((value for raw in values if (value := number(raw)) is not None), None)


def category(wind: float | None) -> int | None:
    if wind is None:
        return None
    if wind < 34:
        return -1
    if wind < 64:
        return 0
    if wind < 83:
        return 1
    if wind < 96:
        return 2
    if wind < 113:
        return 3
    if wind < 137:
        return 4
    return 5


def parse_time(value: str) -> datetime:
    return datetime.strptime(value, "%Y-%m-%d %H:%M:%S").replace(
        tzinfo=timezone.utc
    )


def iso(value: datetime) -> str:
    return value.isoformat().replace("+00:00", "Z")


def preview(points: list[dict], peak_index: int | None) -> list[list]:
    if len(points) <= MAX_PREVIEW_POINTS:
        indices = set(range(len(points)))
    else:
        indices = {
            round(index * (len(points) - 1) / (MAX_PREVIEW_POINTS - 1))
            for index in range(MAX_PREVIEW_POINTS)
        }
    if peak_index is not None:
        indices.add(peak_index)
    return [
        [
            int(parse_time(points[index]["t"].replace("T", " ").replace("Z", "")).timestamp()),
            points[index]["lat"],
            points[index]["lon"],
            points[index]["wind"],
            points[index]["category"],
        ]
        for index in sorted(indices)
    ]


def main() -> None:
    groups: dict[str, list[dict[str, str]]] = defaultdict(list)
    with INPUT.open(encoding="utf-8") as source:
        rows = csv.DictReader(source)
        next(rows)  # IBTrACS units row
        for row in rows:
            if (
                not row["SID"].strip()
                or not row["ISO_TIME"].strip()
                or number(row["LAT"]) is None
                or number(row["LON"]) is None
            ):
                continue
            groups[row["SID"]].append(row)

    OUT.mkdir(parents=True, exist_ok=True)
    tracks_dir = OUT / "tracks"
    tracks_dir.mkdir(exist_ok=True)
    manifest: list[dict] = []

    for sid, rows in sorted(groups.items()):
        basin = next((row["BASIN"] for row in rows if row["BASIN"] in BASINS), None)
        if basin is None:
            continue
        points = []
        for row in rows:
            wind = first_number(row["USA_WIND"], row["WMO_WIND"])
            pressure = first_number(row["USA_PRES"], row["WMO_PRES"])
            points.append(
                {
                    "t": iso(parse_time(row["ISO_TIME"])),
                    "lat": number(row["LAT"]),
                    "lon": number(row["LON"]),
                    "wind": wind,
                    "pressure": pressure,
                    "status": row["NATURE"].strip() or None,
                    "category": category(wind),
                    "agency": row["WMO_AGENCY"].strip() or None,
                }
            )

        peak_index = max(
            range(len(points)),
            key=lambda index: points[index]["wind"] or -1,
            default=None,
        )
        peak = points[peak_index] if peak_index is not None else None
        pressures = [
            point["pressure"] for point in points if point["pressure"] is not None
        ]
        raw_name = next(
            (
                row["NAME"].strip()
                for row in rows
                if row["NAME"].strip() not in {"", "NOT_NAMED", "UNNAMED"}
            ),
            None,
        )
        name = raw_name.title() if raw_name else None
        year = int(rows[0]["SEASON"])
        sub_basin = next(
            (row["SUBBASIN"].strip() for row in rows if row["SUBBASIN"].strip()),
            None,
        )
        track_asset = f"data/tracks/{sid}.json"
        (tracks_dir / f"{sid}.json").write_text(
            json.dumps(points, separators=(",", ":"))
        )
        imagery_status = "outside-current-collection" if year > 2015 else "uncertain"
        manifest.append(
            {
                "id": sid,
                "name": name,
                "season": year,
                "basin": basin,
                "subBasin": sub_basin,
                "firstTime": points[0]["t"],
                "lastTime": points[-1]["t"],
                "peakTime": peak["t"] if peak else None,
                "maxWindKt": peak["wind"] if peak else None,
                "minPressureMb": min(pressures) if pressures else None,
                "category": category(peak["wind"]) if peak else None,
                "trackAsset": track_asset,
                "previewTrack": preview(points, peak_index),
                "imagery": {
                    "status": imagery_status,
                    "source": "NOAA HURSAT-B1 v06" if year <= 2015 else None,
                    "channel": "infrared" if year <= 2015 else None,
                    "frameCount": 0,
                },
                "provenance": {
                    "trackSource": "NOAA/NCEI IBTrACS",
                    "trackVersion": "v04r01",
                    "imagerySource": "NOAA HURSAT-B1 v06" if year <= 2015 else None,
                },
            }
        )

    counts = Counter(storm["basin"] for storm in manifest)
    generated_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    source = {
        "name": "IBTrACS",
        "version": "v04r01",
        "url": URL,
        "selection": "All since-1980 IBTrACS systems with at least one valid position",
    }
    payload = {
        "version": "global-since1980-v1",
        "generatedAt": generated_at,
        "totalStorms": len(manifest),
        "basinCounts": dict(sorted(counts.items())),
        "source": source,
        "storms": manifest,
    }
    (OUT / "manifest.json").write_text(json.dumps(payload, separators=(",", ":")))
    (OUT / "sources.json").write_text(json.dumps(source, indent=2) + "\n")
    print(f"Wrote {len(manifest)} real storms across {len(counts)} basins")


if __name__ == "__main__":
    main()
