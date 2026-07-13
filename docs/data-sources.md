# Data sources

## IBTrACS

The demo uses NOAA/NCEI International Best Track Archive for Climate Stewardship v04r01 `since1980` CSV. The pipeline preserves blanks as null, chooses USA wind when present and WMO wind otherwise, records the WMO agency per observation, and does not claim agency wind periods are interchangeable. Longitudes remain in −180…180 and render segments split at the antimeridian.

## Satellite imagery

NOAA HURSAT-B1 v06 is the first standardized adapter target: global storm-centered geostationary observations, approximately 8 km and three-hourly, 1978–2015. Roadmap adapters cover early TIROS/Nimbus/ESSA/ATS/GOES holdings, later GOES, Meteosat, Himawari, and polar-orbiting archives. Only authoritative source files may become `processed`.
