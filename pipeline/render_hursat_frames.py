"""Render infrared brightness temperatures to an explicitly false-color PNG preview."""
import argparse
from netCDF4 import Dataset
import numpy as np
from PIL import Image
p=argparse.ArgumentParser(); p.add_argument('file'); p.add_argument('--variable',default='IRWIN'); p.add_argument('--output',required=True); a=p.parse_args()
with Dataset(a.file) as d: x=np.asarray(d.variables[a.variable][:],dtype=float).squeeze()
x=np.nan_to_num(x,nan=300); x=np.clip((300-x)/(300-180)*255,0,255).astype('uint8'); Image.fromarray(x).save(a.output)
