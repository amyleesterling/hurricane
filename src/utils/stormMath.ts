import type { StormSummary, TrackPoint } from "../types/storm";

export function categoryFromWind(wind: number | null): number | null {
  if (wind == null) return null;
  if (wind < 34) return -1;
  if (wind < 64) return 0;
  if (wind < 83) return 1;
  if (wind < 96) return 2;
  if (wind < 113) return 3;
  if (wind < 137) return 4;
  return 5;
}

export function interpolateTrack(
  points: TrackPoint[],
  timeMs: number,
): TrackPoint | null {
  if (!points.length) return null;
  if (timeMs <= Date.parse(points[0].t)) return points[0];
  if (timeMs >= Date.parse(points.at(-1)!.t)) return points.at(-1)!;
  const after = points.findIndex((p) => Date.parse(p.t) >= timeMs);
  const a = points[after - 1],
    b = points[after];
  const ratio =
    (timeMs - Date.parse(a.t)) / (Date.parse(b.t) - Date.parse(a.t));
  let delta = b.lon - a.lon;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  let lon = a.lon + delta * ratio;
  if (lon > 180) lon -= 360;
  if (lon < -180) lon += 360;
  const blend = (x: number | null, y: number | null) =>
    x == null ? y : y == null ? x : x + (y - x) * ratio;
  const wind = blend(a.wind, b.wind);
  return {
    ...a,
    t: new Date(timeMs).toISOString(),
    lat: a.lat + (b.lat - a.lat) * ratio,
    lon,
    wind,
    pressure: blend(a.pressure, b.pressure),
    category: categoryFromWind(wind),
  };
}

export function lifecyclePosition(
  points: TrackPoint[],
  progress: number,
  alignPeak = false,
): TrackPoint | null {
  if (!points.length) return null;
  const start = Date.parse(points[0].t),
    end = Date.parse(points.at(-1)!.t);
  if (!alignPeak)
    return interpolateTrack(points, start + (end - start) * progress);
  const peak = points.reduce(
    (best, p) => ((p.wind ?? -1) > (best.wind ?? -1) ? p : best),
    points[0],
  );
  const peakP = (Date.parse(peak.t) - start) / (end - start || 1);
  const mapped =
    progress <= 0.5
      ? (progress / 0.5) * peakP
      : peakP + ((progress - 0.5) / 0.5) * (1 - peakP);
  return interpolateTrack(points, start + (end - start) * mapped);
}

export function activeStorms(storms: StormSummary[], timeMs: number) {
  return storms.filter(
    (s) =>
      Date.parse(s.firstTime) <= timeMs && Date.parse(s.lastTime) >= timeMs,
  );
}
export function segmentAntimeridian(points: TrackPoint[]) {
  const out: TrackPoint[][] = [];
  let current: TrackPoint[] = [];
  for (const p of points) {
    if (current.length && Math.abs(p.lon - current.at(-1)!.lon) > 180) {
      out.push(current);
      current = [];
    }
    current.push(p);
  }
  if (current.length) out.push(current);
  return out;
}
export function matchesSearch(s: StormSummary, q: string) {
  const n = q.trim().toLowerCase();
  const regionalTerms: Record<string, string[]> = {
    NA: ["hurricane", "atlantic"],
    EP: ["hurricane", "eastern pacific", "central pacific"],
    WP: ["typhoon", "western pacific"],
    NI: ["cyclone", "north indian"],
    SI: ["cyclone", "south indian"],
    SP: ["cyclone", "south pacific"],
    SA: ["cyclone", "south atlantic"],
  };
  return (
    !n ||
    [
      s.name ?? "unnamed",
      s.id,
      s.season.toString(),
      s.basin,
      ...(regionalTerms[s.basin] || []),
    ].some((v) => v.toLowerCase().includes(n))
  );
}
