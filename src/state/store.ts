import { create } from "zustand";
import type { AppMode } from "../types/storm";

type State = {
  mode: AppMode;
  selectedId: string | null;
  hoverId: string | null;
  time: number;
  lifecycle: number;
  playing: boolean;
  speed: number;
  search: string;
  basins: string[];
  imageryOnly: boolean;
  hurricaneOnly: boolean;
  majorOnly: boolean;
  namedOnly: boolean;
  imageryOn: boolean;
  imageryOpacity: number;
  alignPeak: boolean;
  set: (patch: Partial<Omit<State, "set">>) => void;
};
const params = new URLSearchParams(location.search);
export const useStore = create<State>((set) => ({
  mode: (params.get("mode") as AppMode) || "historical",
  selectedId: params.get("storm"),
  hoverId: null,
  time: Number(params.get("time")) || Date.parse("2005-09-22T03:00:00Z"),
  lifecycle: Number(params.get("life")) || 0,
  playing: false,
  speed: 365,
  search: params.get("q") || "",
  basins: params.get("basins")?.split(",").filter(Boolean) || [],
  imageryOnly: params.get("imagery") === "1",
  hurricaneOnly: false,
  majorOnly: false,
  namedOnly: false,
  imageryOn: true,
  imageryOpacity: 0.72,
  alignPeak: false,
  set,
}));
