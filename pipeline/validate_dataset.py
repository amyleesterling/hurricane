from __future__ import annotations
import json, sys
from pathlib import Path
def main():
    p=Path('public/data/manifest.json')
    if not p.exists(): sys.exit('manifest missing')
    d=json.loads(p.read_text()); required={'id','season','basin','firstTime','lastTime','trackAsset','imagery','provenance'}; ids=set()
    for s in d.get('storms',[]):
        missing=required-set(s)
        if missing: sys.exit(f"{s.get('id')}: missing {sorted(missing)}")
        if s['id'] in ids: sys.exit(f"duplicate {s['id']}")
        ids.add(s['id']); track=Path('public')/s['trackAsset']
        if not track.exists() or not json.loads(track.read_text()): sys.exit(f"bad track {track}")
    if len(ids)<50: sys.exit(f'expected >=50 storms, got {len(ids)}')
    print(f'Validated {len(ids)} storms and track assets')
if __name__=='__main__': main()
