import { describe, expect, it } from "vitest";
import {
  activeStorms,
  categoryFromWind,
  interpolateTrack,
  lifecyclePosition,
  matchesSearch,
  segmentAntimeridian,
} from "./stormMath";
import type { StormSummary, TrackPoint } from "../types/storm";
const p: TrackPoint[] = [
  {
    t: "2020-01-01T00:00:00.000Z",
    lat: 0,
    lon: 170,
    wind: 30,
    pressure: 1000,
    status: "TS",
    category: -1,
  },
  {
    t: "2020-01-02T00:00:00.000Z",
    lat: 10,
    lon: -170,
    wind: 100,
    pressure: 950,
    status: "HU",
    category: 3,
  },
];
const s = {
  id: "2020001N",
  name: "ALPHA",
  season: 2020,
  basin: "NA",
  firstTime: p[0].t,
  lastTime: p[1].t,
  trackAsset: "x",
  imagery: { status: "uncertain" },
  provenance: { trackSource: "IBTrACS" },
} as StormSummary;
describe("storm math", () => {
  it("calculates categories", () => {
    expect(categoryFromWind(64)).toBe(1);
    expect(categoryFromWind(null)).toBeNull();
  });
  it("interpolates across the antimeridian", () => {
    const x = interpolateTrack(p, Date.parse(p[0].t) + 43200000)!;
    expect(x.lat).toBe(5);
    expect(Math.abs(x.lon)).toBe(180);
  });
  it("normalizes lifecycle", () => {
    expect(lifecyclePosition(p, 0.5)!.lat).toBe(5);
  });
  it("indexes active storms", () => {
    expect(activeStorms([s], Date.parse("2020-01-01T12:00:00Z"))).toHaveLength(
      1,
    );
  });
  it("segments crossings", () => {
    expect(segmentAntimeridian(p)).toHaveLength(2);
  });
  it("searches name, id, year and basin", () => {
    expect(matchesSearch(s, "alpha")).toBe(true);
    expect(matchesSearch(s, "2019")).toBe(false);
  });
  it("searches regional cyclone terminology", () => {
    expect(matchesSearch({ ...s, basin: "WP" }, "typhoon")).toBe(true);
    expect(matchesSearch({ ...s, basin: "SI" }, "cyclone")).toBe(true);
    expect(matchesSearch(s, "hurricane")).toBe(true);
  });
});
