"""Pack an ordered directory of equally sized PNG frames into a horizontal sheet."""
import argparse
from pathlib import Path
from PIL import Image
p=argparse.ArgumentParser(); p.add_argument('directory'); p.add_argument('--output',required=True); a=p.parse_args(); files=sorted(Path(a.directory).glob('*.png')); imgs=[Image.open(f).convert('L') for f in files]
if not imgs: raise SystemExit('no PNG frames')
sheet=Image.new('L',(imgs[0].width*len(imgs),imgs[0].height)); [sheet.paste(im,(i*im.width,0)) for i,im in enumerate(imgs)]; sheet.save(a.output)
