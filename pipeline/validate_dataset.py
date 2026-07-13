from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path


def main() -> None:
    path = Path("public/data/manifest.json")
    if not path.exists():
        sys.exit("manifest missing")
    data = json.loads(path.read_text())
    required = {
        "id",
        "season",
        "basin",
        "firstTime",
        "lastTime",
        "trackAsset",
        "previewTrack",
        "imagery",
        "provenance",
    }
    ids = set()
    basin_counts: Counter[str] = Counter()
    for storm in data.get("storms", []):
        missing = required - set(storm)
        if missing:
            sys.exit(f"{storm.get('id')}: missing {sorted(missing)}")
        if storm["id"] in ids:
            sys.exit(f"duplicate {storm['id']}")
        ids.add(storm["id"])
        basin_counts[storm["basin"]] += 1
        track = Path("public") / storm["trackAsset"]
        if not track.exists() or not json.loads(track.read_text()):
            sys.exit(f"bad track {track}")
        if not storm["previewTrack"]:
            sys.exit(f"missing preview track {storm['id']}")
    if len(ids) < 4_900:
        sys.exit(f"expected full since-1980 archive, got {len(ids)} storms")
    required_basins = {"NA", "EP", "WP", "NI", "SI", "SP", "SA"}
    if set(basin_counts) != required_basins:
        sys.exit(f"expected seven global basins, got {sorted(basin_counts)}")
    if data.get("totalStorms") != len(ids):
        sys.exit("totalStorms does not match manifest")
    print(f"Validated {len(ids)} storms across seven basins and all track assets")


if __name__ == "__main__":
    main()
