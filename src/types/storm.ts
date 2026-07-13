export type BasinCode = "NA" | "EP" | "WP" | "NI" | "SI" | "SP" | "SA";
export type ImageryStatus =
  | "processed"
  | "located-not-processed"
  | "not-located"
  | "uncertain"
  | "outside-current-collection";
export interface TrackPoint {
  t: string;
  lat: number;
  lon: number;
  wind: number | null;
  pressure: number | null;
  status: string | null;
  category: number | null;
  agency?: string | null;
}
export interface StormSummary {
  id: string;
  name: string | null;
  season: number;
  basin: BasinCode;
  subBasin?: string | null;
  firstTime: string;
  lastTime: string;
  peakTime?: string | null;
  maxWindKt?: number | null;
  minPressureMb?: number | null;
  category?: number | null;
  trackAsset: string;
  imagery: {
    status: ImageryStatus;
    source?: string | null;
    channel?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    frameCount?: number;
    thumbnail?: string | null;
    spriteSheet?: string | null;
    frameMetadata?: string | null;
  };
  provenance: {
    trackSource: string;
    trackVersion?: string;
    imagerySource?: string | null;
  };
}
export interface Manifest {
  version: string;
  generatedAt: string;
  source: Record<string, string>;
  storms: StormSummary[];
}
export type AppMode = "historical" | "lives" | "eyes" | "portrait";
