# Imagery methodology

Every sequence has one of five states: processed; located but not processed; not located; uncertain; or outside the current standardized collection. “Not located” is a project-workflow statement, never a claim that no image exists.

HURSAT netCDF files are cached outside Git. The adapter inspects channels and metadata, defaults to infrared window brightness temperature, preserves the source array, and maps a documented 180–300 K range to an ivory false-color preview. North remains up, aspect ratio is preserved, and generated metadata records source, channel, time, variable, range, transform, resolution, and checksum. A human review is required before changing status to `processed`.

The committed Rita sequence contains three authentic IRWIN frames at 00:00, 03:00, and 06:00 UTC on 22 September 2005. Its source URL, archive checksum, grid, channel, units, and exact display transform are recorded beside the images.
