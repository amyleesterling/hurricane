import { useEffect, useRef } from "react";
import {
  Viewer,
  Color,
  Cartesian2,
  Cartesian3,
  Math as CesiumMath,
  EllipsoidTerrainProvider,
  TileMapServiceImageryProvider,
  ImageryLayer,
  Material,
  PointPrimitiveCollection,
  PolylineCollection,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  defined,
  buildModuleUrl,
  Ion,
} from "cesium";
import type { StormSummary, TrackPoint } from "../types/storm";
import {
  interpolateTrack,
  lifecyclePosition,
  segmentAntimeridian,
} from "../utils/stormMath";

type Props = {
  storms: StormSummary[];
  tracks: Map<string, TrackPoint[]>;
  time: number;
  lifecycle: number;
  alignPeak: boolean;
  mode: string;
  selectedId: string | null;
  reducedMotion: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
};
const intensityColor = (cat: number | null | undefined) =>
  cat == null
    ? Color.fromCssColorString("#a9c5c7")
    : cat >= 3
      ? Color.fromCssColorString("#d7a8ff")
      : cat >= 1
        ? Color.fromCssColorString("#7de4f3")
        : Color.fromCssColorString("#d8e2df");

export default function StormGlobe({
  storms,
  tracks,
  time,
  lifecycle,
  alignPeak,
  mode,
  selectedId,
  reducedMotion,
  onSelect,
  onHover,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const linesRef = useRef<PolylineCollection | null>(null);
  const pointsRef = useRef<PointPrimitiveCollection | null>(null);
  const hoveredIdRef = useRef<string | null>(null);
  const interacted = useRef(false);
  useEffect(() => {
    if (!host.current || viewerRef.current) return;
    let disposed = false;
    if (import.meta.env.VITE_CESIUM_ION_TOKEN)
      Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
    const viewer = new Viewer(host.current, {
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      navigationHelpButton: false,
      sceneModePicker: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      terrainProvider: new EllipsoidTerrainProvider(),
      baseLayer: false,
      requestRenderMode: false,
    });
    viewerRef.current = viewer;
    linesRef.current = viewer.scene.primitives.add(new PolylineCollection());
    pointsRef.current = viewer.scene.primitives.add(
      new PointPrimitiveCollection(),
    );
    viewer.scene.globe.baseColor = Color.fromCssColorString("#071316");
    viewer.scene.backgroundColor = Color.fromCssColorString("#020406");
    if (viewer.scene.skyAtmosphere)
      viewer.scene.skyAtmosphere.brightnessShift = -0.45;
    viewer.scene.globe.showGroundAtmosphere = true;
    viewer.scene.globe.enableLighting = true;
    viewer.scene.fog.enabled = true;
    viewer.scene.highDynamicRange = true;
    TileMapServiceImageryProvider.fromUrl(
      buildModuleUrl("Assets/Textures/NaturalEarthII"),
    ).then((provider) => {
      if (disposed || viewer.isDestroyed()) return;
      const layer = new ImageryLayer(provider);
      layer.brightness = 0.38;
      layer.contrast = 1.35;
      layer.saturation = 0.35;
      viewer.scene.imageryLayers.add(layer);
    });
    viewer.camera.setView({
      destination: Cartesian3.fromDegrees(145, 12, 19_000_000),
      orientation: { heading: 0, pitch: CesiumMath.toRadians(-90), roll: 0 },
    });
    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    const mark = () => {
      interacted.current = true;
    };
    handler.setInputAction(mark, ScreenSpaceEventType.LEFT_DOWN);
    handler.setInputAction(mark, ScreenSpaceEventType.WHEEL);
    handler.setInputAction(mark, ScreenSpaceEventType.PINCH_START);
    handler.setInputAction((movement: { position: Cartesian2 }) => {
      const picked = viewer.scene.pick(movement.position);
      if (defined(picked) && typeof picked.id === "string") onSelect(picked.id);
    }, ScreenSpaceEventType.LEFT_CLICK);
    handler.setInputAction((movement: { endPosition: Cartesian2 }) => {
      const picked = viewer.scene.pick(movement.endPosition);
      const nextId =
        defined(picked) && typeof picked.id === "string" ? picked.id : null;
      if (nextId !== hoveredIdRef.current) {
        hoveredIdRef.current = nextId;
        onHover(nextId);
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);
    const rotate = viewer.clock.onTick.addEventListener(() => {
      if (!interacted.current && !reducedMotion)
        viewer.scene.camera.rotate(Cartesian3.UNIT_Z, -0.00018);
    });
    return () => {
      disposed = true;
      rotate();
      handler.destroy();
      viewer.destroy();
      viewerRef.current = null;
      linesRef.current = null;
      pointsRef.current = null;
      hoveredIdRef.current = null;
    };
  }, [onHover, onSelect, reducedMotion]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const lines = linesRef.current;
    if (!viewer || !lines) return;
    lines.removeAll();
    const trackStride = mode === "lives" ? Math.ceil(storms.length / 700) : 1;
    storms.forEach((s, stormIndex) => {
      if (
        trackStride > 1 &&
        stormIndex % trackStride !== 0 &&
        s.id !== selectedId
      )
        return;
      const track = tracks.get(s.id);
      if (!track?.length) return;
      const selected = s.id === selectedId;
      segmentAntimeridian(track)
        .filter((segment) => segment.length >= 2)
        .forEach((segment) =>
          lines.add({
            positions: segment.map((p) =>
              Cartesian3.fromDegrees(p.lon, p.lat, selected ? 8000 : 2500),
            ),
            width: selected ? 2.8 : 0.75,
            material: Material.fromType("Color", {
              color: selected
                ? Color.fromCssColorString("#c8f7ff").withAlpha(0.85)
                : Color.fromCssColorString("#90a6ab").withAlpha(0.13),
            }),
            id: s.id,
          }),
        );
    });
    viewer.scene.requestRender();
  }, [storms, tracks, selectedId, mode]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const points = pointsRef.current;
    if (!viewer || !points) return;
    points.removeAll();
    storms.forEach((s) => {
      const track = tracks.get(s.id);
      if (!track?.length) return;
      const selected = s.id === selectedId;
      let p: TrackPoint | null;
      if (mode === "lives") p = lifecyclePosition(track, lifecycle, alignPeak);
      else if (mode === "eyes" || mode === "portrait")
        p =
          track.find((x) => x.t === s.peakTime) ||
          track[Math.floor(track.length / 2)];
      else
        p =
          Date.parse(s.firstTime) <= time && Date.parse(s.lastTime) >= time
            ? interpolateTrack(track, time)
            : null;
      if (!p && selected)
        p =
          track.find((x) => x.t === s.peakTime) ||
          track[Math.floor(track.length / 2)];
      if (p)
        points.add({
          position: Cartesian3.fromDegrees(p.lon, p.lat, 12000),
          pixelSize: selected ? 18 : Math.max(6, 8 + (p.category ?? 0) * 1.5),
          color: intensityColor(p.category).withAlpha(selected ? 1 : 0.86),
          outlineColor: selected
            ? Color.WHITE
            : Color.fromCssColorString("#081013"),
          outlineWidth: selected ? 3 : 1,
          disableDepthTestDistance: 7_000_000,
          id: s.id,
        });
    });
    viewer.scene.requestRender();
  }, [storms, tracks, time, lifecycle, alignPeak, mode, selectedId]);

  useEffect(() => {
    const v = viewerRef.current,
      track = selectedId ? tracks.get(selectedId) : null;
    if (v && track?.length) {
      const s = storms.find((x) => x.id === selectedId);
      const p =
        track.find((x) => x.t === s?.peakTime) ||
        track[Math.floor(track.length / 2)];
      interacted.current = true;
      v.camera.flyTo({
        destination: Cartesian3.fromDegrees(p.lon, p.lat, 4_200_000),
        duration: reducedMotion ? 0 : 1.8,
      });
    }
  }, [selectedId, tracks, storms, reducedMotion]);
  return (
    <div
      ref={host}
      className="globe"
      data-testid="globe"
      aria-label="Interactive three-dimensional Earth showing tropical cyclone tracks"
    />
  );
}
