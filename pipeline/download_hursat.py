"""Download requested HURSAT files from an official URL; never bulk-download by default."""
import argparse, urllib.request
from pathlib import Path
def main():
    p=argparse.ArgumentParser(); p.add_argument('url'); p.add_argument('--output',required=True); a=p.parse_args(); out=Path(a.output); out.parent.mkdir(parents=True,exist_ok=True); urllib.request.urlretrieve(a.url,out); print(out)
if __name__=='__main__': main()
