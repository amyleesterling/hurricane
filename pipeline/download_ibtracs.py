"""Download the official versioned IBTrACS v04r01 since-1980 CSV."""
from __future__ import annotations
import argparse, hashlib, json, urllib.request
from datetime import datetime, timezone
from pathlib import Path
URL = "https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/v04r01/access/csv/ibtracs.since1980.list.v04r01.csv"
def main() -> None:
    parser=argparse.ArgumentParser(); parser.add_argument('--output',default='pipeline/cache/ibtracs.since1980.csv'); args=parser.parse_args()
    path=Path(args.output); path.parent.mkdir(parents=True,exist_ok=True)
    urllib.request.urlretrieve(URL,path)
    sha=hashlib.sha256(path.read_bytes()).hexdigest()
    path.with_suffix('.metadata.json').write_text(json.dumps({'url':URL,'downloadedAt':datetime.now(timezone.utc).isoformat(),'version':'v04r01','sha256':sha},indent=2))
    print(f'Downloaded {path} sha256={sha}')
if __name__=='__main__': main()
