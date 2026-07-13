import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import StormGlobe from "./globe/StormGlobe";
import { useStore } from "./state/store";
import type {
  AppMode,
  Manifest,
  StormSummary,
  TrackPoint,
} from "./types/storm";
import { activeStorms, matchesSearch } from "./utils/stormMath";
import { manifestSchema } from "./data/schema";

const BASINS: Record<string, string> = {
  NA: "North Atlantic",
  EP: "East Pacific",
  WP: "West Pacific",
  NI: "North Indian",
  SI: "South Indian",
  SP: "South Pacific",
  SA: "South Atlantic",
};
const MODES: { id: AppMode; label: string }[] = [
  { id: "historical", label: "Historical Sky" },
  { id: "lives", label: "All Lives at Once" },
  { id: "eyes", label: "Humanity’s Eyes" },
  { id: "portrait", label: "Great Portrait" },
];
const base = import.meta.env.BASE_URL;
const years = [1980, 1990, 2000, 2010, 2020];

function formatDate(ms: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(ms);
}
function duration(s: StormSummary) {
  return `${Math.max(1, Math.round((Date.parse(s.lastTime) - Date.parse(s.firstTime)) / 86400000))} days`;
}

export default function App() {
  const store = useStore();
  const setStore = useStore((state) => state.set);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [tracks, setTracks] = useState<Map<string, TrackPoint[]>>(new Map());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [about, setAbout] = useState(false);
  const [onboarding, setOnboarding] = useState(
    () => localStorage.getItem("storm-choir-seen") !== "1",
  );
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    fetch(`${base}data/manifest.json`)
      .then((r) => r.json())
      .then((x) => {
        manifestSchema.parse(x);
        setManifest(x);
      })
      .catch(console.error);
  }, []);
  useEffect(() => {
    if (!manifest) return;
    Promise.all(
      manifest.storms.map(
        async (s) =>
          [
            s.id,
            await fetch(`${base}${s.trackAsset}`).then((r) => r.json()),
          ] as const,
      ),
    ).then((x) => setTracks(new Map(x)));
  }, [manifest]);
  const filtered = useMemo(
    () =>
      manifest?.storms.filter(
        (s) =>
          matchesSearch(s, store.search) &&
          (!store.basins.length || store.basins.includes(s.basin)) &&
          (!store.namedOnly || !!s.name) &&
          (!store.imageryOnly || s.imagery.status === "processed") &&
          (!store.hurricaneOnly || (s.maxWindKt ?? 0) >= 64) &&
          (!store.majorOnly || (s.maxWindKt ?? 0) >= 96),
      ) || [],
    [
      manifest,
      store.search,
      store.basins,
      store.namedOnly,
      store.imageryOnly,
      store.hurricaneOnly,
      store.majorOnly,
    ],
  );
  const visible = useMemo(
    () =>
      store.mode === "eyes"
        ? filtered.filter(
            (s) => s.season <= new Date(store.time).getUTCFullYear(),
          )
        : filtered,
    [filtered, store.mode, store.time],
  );
  const active = useMemo(
    () => activeStorms(filtered, store.time),
    [filtered, store.time],
  );
  const selected =
    manifest?.storms.find((s) => s.id === store.selectedId) || null;
  const select = useCallback(
    (id: string) => setStore({ selectedId: id }),
    [setStore],
  );
  const hover = useCallback(
    (id: string | null) => setStore({ hoverId: id }),
    [setStore],
  );
  useEffect(() => {
    const p = new URLSearchParams();
    if (store.mode !== "historical") p.set("mode", store.mode);
    if (store.selectedId) p.set("storm", store.selectedId);
    if (store.mode === "historical" || store.mode === "eyes")
      p.set("time", String(Math.round(store.time)));
    if (store.mode === "lives") p.set("life", store.lifecycle.toFixed(3));
    if (store.search) p.set("q", store.search);
    if (store.basins.length) p.set("basins", store.basins.join(","));
    history.replaceState(null, "", `${location.pathname}?${p}`);
  }, [
    store.mode,
    store.selectedId,
    store.time,
    store.lifecycle,
    store.search,
    store.basins,
  ]);
  useEffect(() => {
    if (!store.playing) return;
    let last = performance.now(),
      raf = 0;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (store.mode === "lives") {
        const n = store.lifecycle + (dt * 0.025 * store.speed) / 365;
        store.set({ lifecycle: n > 1 ? 0 : n });
      } else {
        const n = store.time + dt * store.speed * 86400000;
        store.set({
          time: n > Date.parse("2025-12-31") ? Date.parse("1980-01-01") : n,
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [
    store.playing,
    store.mode,
    store.speed,
    store.lifecycle,
    store.time,
    store,
  ]);
  const setMode = (mode: AppMode) => store.set({ mode, playing: false });
  if (!manifest)
    return (
      <div className="loading">
        <span>THE STORM CHOIR</span>
        <i />
      </div>
    );
  return (
    <main className="app">
      {store.mode !== "portrait" && (
        <StormGlobe
          storms={visible}
          tracks={tracks}
          time={store.time}
          lifecycle={store.lifecycle}
          alignPeak={store.alignPeak}
          mode={store.mode}
          selectedId={store.selectedId}
          reducedMotion={reduced}
          onSelect={select}
          onHover={hover}
        />
      )}
      <div className="vignette" aria-hidden="true" />
      <header className="masthead">
        <div>
          <p className="eyebrow">A planetary archive · 1980–2025</p>
          <h1>THE STORM CHOIR</h1>
          <p className="subtitle">
            Every tropical cyclone we have learned to see from space.
          </p>
        </div>
        <nav aria-label="Site">
          <button onClick={() => setAbout(true)}>Methodology</button>
          <button onClick={() => setOnboarding(true)}>How to explore</button>
          <a href="https://github.com/amyleesterling/hurricane">GitHub ↗</a>
        </nav>
      </header>
      <section className="mode-switcher" aria-label="Visualization mode">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={store.mode === m.id ? "active" : ""}
            onClick={() => setMode(m.id)}
          >
            <span>0{MODES.indexOf(m) + 1}</span>
            {m.label}
          </button>
        ))}
      </section>
      {store.mode !== "portrait" && (
        <aside className="explorer" aria-label="Storm explorer">
          <div className="search">
            <label htmlFor="search">Find a storm</label>
            <input
              id="search"
              placeholder="Name, year, ID, basin…"
              value={store.search}
              onChange={(e) => store.set({ search: e.target.value })}
            />
            <kbd>/</kbd>
          </div>
          <div className="result-line">
            <span>
              <b>{filtered.length}</b> storm records
            </span>
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              aria-expanded={filtersOpen}
            >
              Filters {filtersOpen ? "−" : "+"}
            </button>
          </div>
          {filtersOpen && (
            <div className="filters">
              <fieldset>
                <legend>Basin</legend>
                {Object.entries(BASINS).map(([k, v]) => (
                  <label key={k}>
                    <input
                      type="checkbox"
                      checked={store.basins.includes(k)}
                      onChange={() =>
                        store.set({
                          basins: store.basins.includes(k)
                            ? store.basins.filter((x) => x !== k)
                            : [...store.basins, k],
                        })
                      }
                    />
                    <span>{k}</span>
                    <small>{v}</small>
                  </label>
                ))}
              </fieldset>
              <label>
                <input
                  type="checkbox"
                  checked={store.namedOnly}
                  onChange={(e) => store.set({ namedOnly: e.target.checked })}
                />{" "}
                Named storms only
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={store.hurricaneOnly}
                  onChange={(e) =>
                    store.set({
                      hurricaneOnly: e.target.checked,
                      majorOnly: false,
                    })
                  }
                />{" "}
                Hurricane strength
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={store.majorOnly}
                  onChange={(e) =>
                    store.set({
                      majorOnly: e.target.checked,
                      hurricaneOnly: false,
                    })
                  }
                />{" "}
                Major-hurricane equivalent
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={store.imageryOnly}
                  onChange={(e) => store.set({ imageryOnly: e.target.checked })}
                />{" "}
                Processed imagery only
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={store.imageryOn}
                  onChange={(e) => store.set({ imageryOn: e.target.checked })}
                />{" "}
                Show authentic imagery
              </label>
              <label className="opacity-control">
                Imagery opacity
                <input
                  aria-label="Imagery opacity"
                  type="range"
                  min="0.2"
                  max="1"
                  step="0.05"
                  value={store.imageryOpacity}
                  onChange={(e) =>
                    store.set({ imageryOpacity: Number(e.target.value) })
                  }
                />
              </label>
            </div>
          )}
          {store.hoverId && (
            <div className="hover-card">
              {manifest.storms.find((s) => s.id === store.hoverId)?.name ||
                "Unnamed storm"}{" "}
              <span>
                {manifest.storms.find((s) => s.id === store.hoverId)?.season}
              </span>
            </div>
          )}
        </aside>
      )}
      {store.mode === "eyes" && (
        <EyesPanel year={new Date(store.time).getUTCFullYear()} />
      )}
      {store.mode === "portrait" && (
        <Portrait
          storms={filtered}
          onSelect={(id) => {
            select(id);
            setMode("historical");
          }}
        />
      )}
      {selected && (
        <Detail
          storm={selected}
          onClose={() => store.set({ selectedId: null })}
          onPrevNext={(d) => {
            const i = filtered.findIndex((s) => s.id === selected.id);
            select(
              filtered[(i + d + filtered.length) % filtered.length]?.id ||
                selected.id,
            );
          }}
        />
      )}
      {store.mode !== "portrait" && (
        <Timeline
          active={store.mode === "historical" ? active.length : filtered.length}
        />
      )}
      <footer>
        <span>Track data: NOAA/NCEI IBTrACS v04r01</span>
        <span>Imagery status is archival metadata, not proof of absence.</span>
      </footer>
      {onboarding && (
        <Onboarding
          close={() => {
            localStorage.setItem("storm-choir-seen", "1");
            setOnboarding(false);
          }}
        />
      )}
      {about && <About close={() => setAbout(false)} />}
    </main>
  );
}

function Timeline({ active }: { active: number }) {
  const s = useStore();
  const historical = s.mode !== "lives";
  const min = Date.parse("1980-01-01"),
    max = Date.parse("2025-12-31");
  return (
    <section className="timeline" aria-label="Timeline controls">
      <div className="time-readout">
        <span>
          {s.mode === "lives"
            ? "STORM LIFETIME"
            : s.mode === "eyes"
              ? "HUMANITY’S EYES"
              : "HISTORICAL SKY"}
        </span>
        <strong>
          {s.mode === "lives"
            ? `${Math.round(s.lifecycle * 100)}%`
            : s.mode === "eyes"
              ? new Date(s.time).getUTCFullYear()
              : formatDate(s.time)}
        </strong>
        <small>
          {active} {s.mode === "historical" ? "active now" : "in view"}
        </small>
      </div>
      <div className="playback">
        <button
          className="play"
          onClick={() => s.set({ playing: !s.playing })}
          aria-label={s.playing ? "Pause timeline" : "Play timeline"}
        >
          {s.playing ? "Ⅱ" : "▶"}
        </button>
        {historical && (
          <button
            onClick={() => s.set({ time: s.time - 31557600000 })}
            aria-label="Previous year"
          >
            −1Y
          </button>
        )}
        <div className="scrub">
          <input
            aria-label="Timeline position"
            type="range"
            min={historical ? min : 0}
            max={historical ? max : 1000}
            value={historical ? s.time : s.lifecycle * 1000}
            onChange={(e) =>
              s.set(
                historical
                  ? { time: Number(e.target.value) }
                  : { lifecycle: Number(e.target.value) / 1000 },
              )
            }
          />
          <div className="marks">
            {historical
              ? years.map((y) => <span key={y}>{y}</span>)
              : [0, 25, 50, 75, 100].map((x) => <span key={x}>{x}%</span>)}
          </div>
        </div>
        {historical && (
          <button
            onClick={() => s.set({ time: s.time + 31557600000 })}
            aria-label="Next year"
          >
            +1Y
          </button>
        )}
        <select
          aria-label="Playback speed"
          value={s.speed}
          onChange={(e) => s.set({ speed: Number(e.target.value) })}
        >
          <option value="30">1 month / sec</option>
          <option value="90">3 months / sec</option>
          <option value="365">1 year / sec</option>
          <option value="1825">5 years / sec</option>
        </select>
        {s.mode === "lives" && (
          <label className="peak">
            <input
              type="checkbox"
              checked={s.alignPeak}
              onChange={(e) => s.set({ alignPeak: e.target.checked })}
            />{" "}
            Align peaks
          </label>
        )}
      </div>
    </section>
  );
}

function Detail({
  storm,
  onClose,
  onPrevNext,
}: {
  storm: StormSummary;
  onClose: () => void;
  onPrevNext: (d: number) => void;
}) {
  const imageryOn = useStore((s) => s.imageryOn);
  const imageryOpacity = useStore((s) => s.imageryOpacity);
  return (
    <aside className="detail" aria-live="polite">
      <button
        className="close"
        onClick={onClose}
        aria-label="Close storm detail"
      >
        ×
      </button>
      <p className="specimen">SPECIMEN {storm.id}</p>
      <h2>{storm.name || "Unnamed storm"}</h2>
      <p className="basin">
        {storm.season} · {BASINS[storm.basin]}
      </p>
      {storm.imagery.thumbnail && imageryOn && (
        <figure className="satellite-frame">
          <img
            src={`${base}${storm.imagery.thumbnail}`}
            alt={`False-color infrared HURSAT satellite frame for ${storm.name || storm.id}`}
            style={{ opacity: imageryOpacity }}
          />
          <figcaption>
            AUTHENTIC HURSAT-B1 · IR WINDOW · FALSE-COLOR TEMPERATURE
          </figcaption>
        </figure>
      )}
      {!storm.imagery.thumbnail && imageryOn && (
        <StormReconstruction storm={storm} opacity={imageryOpacity} />
      )}
      <div className="intensity">
        <span>
          <b>{storm.maxWindKt ?? "—"}</b>
          <small>PEAK WIND · KT</small>
        </span>
        <span>
          <b>{storm.minPressureMb ?? "—"}</b>
          <small>MIN PRESSURE · MB</small>
        </span>
        <span>
          <b>
            {storm.category != null && storm.category > 0
              ? storm.category
              : "—"}
          </b>
          <small>SAFFIR–SIMPSON</small>
        </span>
      </div>
      <dl>
        <div>
          <dt>Observed life</dt>
          <dd>
            {formatDate(Date.parse(storm.firstTime))} —{" "}
            {formatDate(Date.parse(storm.lastTime))}
          </dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>{duration(storm)}</dd>
        </div>
        <div>
          <dt>Satellite archive</dt>
          <dd>
            <i className={`status ${storm.imagery.status}`} />
            {storm.imagery.status.replaceAll("-", " ")}
          </dd>
        </div>
        <div>
          <dt>Track source</dt>
          <dd>
            {storm.provenance.trackSource} {storm.provenance.trackVersion}
          </dd>
        </div>
      </dl>
      <p className="caveat">
        “Not located” means only that this project has not yet processed an
        image. It does not mean no observation exists.
      </p>
      <div className="detail-actions">
        <button onClick={() => onPrevNext(-1)}>← Previous</button>
        <button onClick={() => navigator.clipboard?.writeText(location.href)}>
          Copy link
        </button>
        <button onClick={() => onPrevNext(1)}>Next →</button>
      </div>
    </aside>
  );
}

function StormReconstruction({
  storm,
  opacity,
}: {
  storm: StormSummary;
  opacity: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const width = 640;
    const height = 360;
    canvas.width = width;
    canvas.height = height;
    let seed = [...storm.id].reduce(
      (value, character) =>
        (Math.imul(value, 31) + character.charCodeAt(0)) >>> 0,
      2166136261,
    );
    const random = () => {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return (seed >>> 0) / 4294967296;
    };
    const image = context.createImageData(width, height);
    const pixels = image.data;
    const centerX = width * (0.48 + (random() - 0.5) * 0.08);
    const centerY = height * (0.5 + (random() - 0.5) * 0.1);
    const strength = Math.min(1, (storm.maxWindKt ?? 45) / 165);
    const rotation = random() * Math.PI * 2;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const dx = (x - centerX) / height;
        const dy = (y - centerY) / height;
        const radius = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) + rotation;
        const spiral = Math.sin(angle * 4 - radius * (32 + strength * 12));
        const outerBands = Math.max(0, spiral * 0.5 + 0.5 - radius * 0.42);
        const core = Math.exp(-radius * radius * 34);
        const eye = Math.exp(-radius * radius * 620);
        const asymmetry = 0.78 + 0.22 * Math.sin(angle - radius * 8);
        const grain = (random() - 0.5) * 34;
        const cloud = Math.max(
          0,
          Math.min(
            255,
            22 + outerBands * 155 * asymmetry + core * 105 - eye * 205 + grain,
          ),
        );
        const offset = (y * width + x) * 4;
        pixels[offset] = cloud * 0.9;
        pixels[offset + 1] = cloud * 0.98;
        pixels[offset + 2] = cloud;
        pixels[offset + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);
    const glow = context.createRadialGradient(
      centerX,
      centerY,
      6,
      centerX,
      centerY,
      height * 0.48,
    );
    glow.addColorStop(0, "rgba(220, 250, 252, .2)");
    glow.addColorStop(0.55, "rgba(90, 194, 205, .08)");
    glow.addColorStop(1, "rgba(0, 0, 0, .58)");
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);
  }, [storm]);
  return (
    <figure className="satellite-frame reconstruction">
      <canvas
        ref={canvasRef}
        style={{ opacity }}
        aria-label={`Visual reconstruction of ${storm.name || storm.id} based on track and intensity; not satellite data`}
      />
      <figcaption>
        VISUAL RECONSTRUCTION · TRACK + INTENSITY · NOT SATELLITE DATA
      </figcaption>
    </figure>
  );
}

function EyesPanel({ year }: { year: number }) {
  return (
    <aside className="eyes-panel">
      <p className="eyebrow">OBSERVATION ERA</p>
      <h2>
        {year < 1966
          ? "First signals"
          : year < 1978
            ? "Experimental constellations"
            : year < 2016
              ? "Standardized archive era"
              : "Growing modern record"}
      </h2>
      <p>
        This view reveals records present by {year}. Coverage and archival
        survival change dramatically through time; blank space is not evidence
        that no image was taken.
      </p>
      <ul>
        <li>
          <i className="processed" />
          Imagery located and processed
        </li>
        <li>
          <i className="located" />
          Located, awaiting processing
        </li>
        <li>
          <i className="uncertain" />
          Archival status uncertain
        </li>
        <li>
          <i className="outside" />
          Outside standardized collection
        </li>
      </ul>
    </aside>
  );
}

function Portrait({
  storms,
  onSelect,
}: {
  storms: StormSummary[];
  onSelect: (id: string) => void;
}) {
  const imageryOn = useStore((s) => s.imageryOn);
  const imageryOpacity = useStore((s) => s.imageryOpacity);
  const parent = useRef<HTMLDivElement>(null);
  const rows = Math.ceil(storms.length / 4);
  const v = useVirtualizer({
    count: rows,
    getScrollElement: () => parent.current,
    estimateSize: () => 210,
    overscan: 2,
  });
  return (
    <section className="portrait">
      <div className="portrait-head">
        <p className="eyebrow">GREAT PORTRAIT · {storms.length} LIVES</p>
        <h2>A choir drawn in trajectories.</h2>
        <p>
          Representative portraits use authentic processed imagery when
          available. Neutral track studies stand in for storms whose imagery has
          not yet been processed.
        </p>
      </div>
      <div className="portrait-scroll" ref={parent}>
        <div style={{ height: v.getTotalSize(), position: "relative" }}>
          {v.getVirtualItems().map((row) => (
            <div
              className="portrait-row"
              key={row.key}
              style={{ transform: `translateY(${row.start}px)` }}
            >
              {storms.slice(row.index * 4, row.index * 4 + 4).map((s, i) => (
                <button
                  className="portrait-tile"
                  key={s.id}
                  onClick={() => onSelect(s.id)}
                >
                  {s.imagery.thumbnail && imageryOn ? (
                    <div className="portrait-image">
                      <img
                        src={`${base}${s.imagery.thumbnail}`}
                        alt={`HURSAT infrared portrait of ${s.name || s.id}`}
                        style={{ opacity: imageryOpacity }}
                      />
                      <span>AUTHENTIC · HURSAT-B1</span>
                    </div>
                  ) : (
                    <div className={`track-glyph g${(row.index * 4 + i) % 6}`}>
                      <span />
                    </div>
                  )}
                  <small>{s.id}</small>
                  <strong>{s.name || "Unnamed storm"}</strong>
                  <em>
                    {s.season} · {s.basin} · {s.maxWindKt ?? "—"} kt
                  </em>
                  <label>{s.imagery.status.replaceAll("-", " ")}</label>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Onboarding({ close }: { close: () => void }) {
  return (
    <div className="modal-back">
      <section
        className="onboarding"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome"
      >
        <p className="eyebrow">WELCOME TO THE ARCHIVE</p>
        <h2 id="welcome">Listen to the planet’s weather memory.</h2>
        <ol>
          <li>
            <span>01</span>
            <b>Drag to rotate Earth.</b>
          </li>
          <li>
            <span>02</span>
            <b>Scroll or pinch to zoom.</b>
          </li>
          <li>
            <span>03</span>
            <b>Move through time.</b>
          </li>
          <li>
            <span>04</span>
            <b>Select a storm to see its life.</b>
          </li>
        </ol>
        <button className="enter" onClick={close}>
          Enter the archive →
        </button>
      </section>
    </div>
  );
}
function About({ close }: { close: () => void }) {
  return (
    <div className="modal-back">
      <section
        className="about"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about"
      >
        <button className="close" onClick={close}>
          ×
        </button>
        <p className="eyebrow">SCIENTIFIC METHOD</p>
        <h2 id="about">What the archive knows — and does not.</h2>
        <p>
          The current release is a working exploration prototype using 60 real
          global cyclone tracks from NOAA/NCEI IBTrACS v04r01. It does not claim
          a complete imagery archive.
        </p>
        <h3>Best tracks are retrospective</h3>
        <p>
          Agency practices, wind averaging periods, and observational coverage
          differ by basin and era. Missing intensity is preserved, never
          converted to zero.
        </p>
        <h3>Satellite absence is not storm absence</h3>
        <p>
          HURSAT-B1 offers a standardized storm-centered record for 1978–2015,
          but older holdings are incomplete and later sources require separate
          adapters. Infrared colors are visual mappings, not natural-color
          photographs.
        </p>
        <p className="attribution">
          Data: NOAA/NCEI · IBTrACS · HURSAT. Globe engine: CesiumJS. Base
          texture: Natural Earth II distributed with CesiumJS.
        </p>
      </section>
    </div>
  );
}
