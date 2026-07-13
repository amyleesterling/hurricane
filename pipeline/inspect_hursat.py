import argparse
from netCDF4 import Dataset
p=argparse.ArgumentParser(); p.add_argument('file'); a=p.parse_args()
with Dataset(a.file) as d: print({k:{'shape':v.shape,'units':getattr(v,'units',None)} for k,v in d.variables.items()})
