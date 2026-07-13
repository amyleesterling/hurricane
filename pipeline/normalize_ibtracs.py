"""Build a compact, geographically balanced 60-storm browser demo from IBTrACS."""
from __future__ import annotations
import csv, json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
INPUT=Path('pipeline/cache/ibtracs.since1980.csv'); OUT=Path('public/data')
def num(v):
    try: return float(v) if v.strip() else None
    except (ValueError,AttributeError): return None
def cat(w):
    if w is None:return None
    return -1 if w<34 else 0 if w<64 else 1 if w<83 else 2 if w<96 else 3 if w<113 else 4 if w<137 else 5
def iso(v): return datetime.strptime(v,'%Y-%m-%d %H:%M:%S').replace(tzinfo=timezone.utc).isoformat().replace('+00:00','Z')
def main():
    groups=defaultdict(list)
    with INPUT.open(encoding='utf-8') as f:
        rows=csv.DictReader(f); next(rows)
        for r in rows:
            if not r['ISO_TIME'].strip() or num(r['LAT']) is None or num(r['LON']) is None: continue
            groups[r['SID']].append(r)
    candidates=[]
    for sid,rs in groups.items():
        basin=next((r['BASIN'] for r in rs if r['BASIN'] in {'NA','EP','WP','NI','SI','SP','SA'}),None)
        if not basin or len(rs)<5: continue
        year=int(rs[0]['SEASON']); peak=max((num(r['USA_WIND']) or num(r['WMO_WIND']) or 0 for r in rs),default=0)
        candidates.append((sid,basin,year,peak,rs))
    chosen=[]
    for decade in range(1980,2030,10):
        for basin in ['NA','EP','WP','NI','SI','SP']:
            pool=sorted((x for x in candidates if x[1]==basin and decade<=x[2]<decade+10),key=lambda x:(-x[3],x[0]))
            chosen.extend(pool[:2])
    seen=set(); chosen=[x for x in chosen if not (x[0] in seen or seen.add(x[0]))][:60]
    OUT.mkdir(parents=True,exist_ok=True); (OUT/'tracks').mkdir(exist_ok=True)
    manifest=[]
    for sid,basin,year,_,rs in chosen:
        pts=[]
        for r in rs:
            wind=num(r['USA_WIND']) or num(r['WMO_WIND']); pressure=num(r['USA_PRES']) or num(r['WMO_PRES'])
            pts.append({'t':iso(r['ISO_TIME']),'lat':num(r['LAT']),'lon':num(r['LON']),'wind':wind,'pressure':pressure,'status':r['NATURE'].strip() or None,'category':cat(wind),'agency':r['WMO_AGENCY'].strip() or None})
        windpts=[p for p in pts if p['wind'] is not None]; peak=max(windpts,key=lambda p:p['wind']) if windpts else None
        pressures=[p['pressure'] for p in pts if p['pressure'] is not None]
        name=rs[0]['NAME'].strip(); name=None if name in {'','NOT_NAMED','UNNAMED'} else name.title()
        (OUT/'tracks'/f'{sid}.json').write_text(json.dumps(pts,separators=(',',':')))
        status='outside-current-collection' if year>2015 else 'uncertain'
        manifest.append({'id':sid,'name':name,'season':year,'basin':basin,'subBasin':rs[0]['SUBBASIN'].strip() or None,'firstTime':pts[0]['t'],'lastTime':pts[-1]['t'],'peakTime':peak['t'] if peak else None,'maxWindKt':peak['wind'] if peak else None,'minPressureMb':min(pressures) if pressures else None,'category':cat(peak['wind']) if peak else None,'trackAsset':f'data/tracks/{sid}.json','imagery':{'status':status,'source':'NOAA HURSAT-B1 v06' if year<=2015 else None,'channel':'infrared' if year<=2015 else None,'frameCount':0},'provenance':{'trackSource':'NOAA/NCEI IBTrACS','trackVersion':'v04r01','imagerySource':'NOAA HURSAT-B1 v06' if year<=2015 else None}})
    payload={'version':'demo-v1','generatedAt':datetime.now(timezone.utc).isoformat().replace('+00:00','Z'),'source':{'name':'IBTrACS','version':'v04r01','url':__import__('download_ibtracs').URL,'selection':'two strongest well-sampled storms per basin and decade, capped at 60'},'storms':manifest}
    (OUT/'manifest.json').write_text(json.dumps(payload,indent=2)); (OUT/'sources.json').write_text(json.dumps(payload['source'],indent=2)); print(f'Wrote {len(manifest)} real storms')
if __name__=='__main__': main()
