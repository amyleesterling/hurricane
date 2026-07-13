"""Register the reviewed Rita HURSAT-B1 sample in the browser manifest."""
from __future__ import annotations
import json
from pathlib import Path

MANIFEST = Path("public/data/manifest.json")

def main() -> None:
    data = json.loads(MANIFEST.read_text())
    storm = next(s for s in data["storms"] if s["id"] == "2005261N21290")
    storm["imagery"] = {
        "status": "processed",
        "source": "NOAA/NCEI HURSAT-B1 v06",
        "channel": "infrared window brightness temperature (IRWIN)",
        "startTime": "2005-09-22T00:00:00Z",
        "endTime": "2005-09-22T06:00:00Z",
        "frameCount": 3,
        "thumbnail": "data/imagery/rita/rita-0300.png",
        "spriteSheet": "data/imagery/rita/rita-sprite.png",
        "frameMetadata": "data/imagery/rita/metadata.json",
    }
    storm["provenance"]["imagerySource"] = "NOAA/NCEI HURSAT-B1 v06"
    MANIFEST.write_text(json.dumps(data, indent=2) + "\n")
    print("Registered 1 authentic sequence / 3 frames for 2005261N21290 Rita")

if __name__ == "__main__":
    main()
