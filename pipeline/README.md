# Data pipeline

Raw caches are ignored. Run `python pipeline/download_ibtracs.py`, then `python pipeline/normalize_ibtracs.py`, then `python pipeline/validate_dataset.py`. The normalizer preserves missing intensity values, uses USA wind when available and WMO wind otherwise without claiming the values are interchangeable, and keeps the chosen WMO agency on every observation.

HURSAT ingestion is deliberately opt-in: install `pipeline/requirements.txt`, download a specific official file with `download_hursat.py`, inspect it, render an IR preview, then build a sprite sheet. Outputs must be reviewed and registered as authentic before their manifest status becomes `processed`.

The committed Rita example uses three IRWIN frames from the official HURSAT-B1 v06 archive. After regenerating the track manifest, run `python pipeline/register_sample_imagery.py` to restore its reviewed imagery metadata.
