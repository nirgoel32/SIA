import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import type { FeatureCollection } from "geojson";
import type { Topology } from "topojson-specification";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/lib/theme";
import CompositionChart from "./CompositionChart";
import {
  COUNTRY_COORDS,
  GATEWAYS,
  POST_1965_DATA,
  YEAR_MAX,
  YEAR_MIN,
  counterfactualSourcesFor,
  counterfactualTotalFor,
  getYear,
  regionLabel,
  regionTotals,
  supplementalFlowsForYear,
  type Region,
  type SourceFlow,
  type YearRecord,
} from "@/data/post-1965-flows";

const W = 1200;
const H = 600;

// Replay pacing. Faster cadence on routine years; longer hold on policy /
// refugee event years so the headline has time to register.
const PLAY_MS_PER_YEAR_DEFAULT = 1700;
const PLAY_MS_PER_YEAR_EVENT = 3200;

// Corridor "memory" — how many years a once-seen corridor keeps a plane
// flying on it. Older corridors stay visible as faint lines but go quiet.
const ACTIVE_CORRIDOR_WINDOW = 5;

const REGION_COLOR: Record<Region, string> = {
  "latin-america": "#C9A24A",
  "asia": "#D87B4A",
  "europe": "#9FB1C2",
  "africa": "#7FA67F",
  "caribbean": "#E8B14A",
  "north-america": "#B8A285",
  "middle-east": "#B36E8A",
  "oceania": "#6B8FAA",
};

// Plane glyph in local coords, pointing up (north).
const PLANE_PATH =
  "M0 -8 L1 -2 L8 2 L8 3.5 L1 2.6 L0.6 7 L2.5 9 L2.5 10 L-2.5 10 L-2.5 9 L-0.6 7 L-1 2.6 L-8 3.5 L-8 2 L-1 -2 Z";

function cssVar(name: string): string {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function rgb(name: string): string {
  return `rgb(${cssVar(name)})`;
}
function rgba(name: string, a: number): string {
  return `rgb(${cssVar(name)} / ${a})`;
}

function formatThousands(k: number): string {
  if (k >= 1000) return `${(k / 1000).toFixed(2)}M`;
  return `${Math.round(k)}K`;
}

type CorridorKey = string;
type Corridor = {
  key: CorridorKey;
  country: string;
  region: Region;
  gateway: SourceFlow["gateway"];
  firstYear: number;
  lastYear: number;
  // Largest single-year volume ever recorded on this corridor — used for
  // line thickness so the historic record doesn't shrink when the corridor
  // goes dormant in later years.
  maxCount: number;
  // The most recent year's count, or 0 if not active this year.
  currentCount: number;
};

// Pre-sampled positions + tangent angles along an arc — lets the RAF loop
// interpolate plane positions with pure arithmetic instead of calling the
// (expensive) SVGPathElement.getPointAtLength on every plane every frame.
// With ~100+ planes in flight this is the difference between smooth 60fps
// and visible choppiness.
const SAMPLE_COUNT = 96;
function sampleArc(path: SVGPathElement): Float32Array {
  const len = path.getTotalLength();
  const out = new Float32Array(SAMPLE_COUNT * 3);
  if (!len) return out;
  const dt = Math.min(len * 0.005, 2);
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const t = i / (SAMPLE_COUNT - 1);
    const pt = path.getPointAtLength(t * len);
    const aheadAt = Math.min(len, t * len + dt);
    const ahead = path.getPointAtLength(aheadAt);
    out[i * 3] = pt.x;
    out[i * 3 + 1] = pt.y;
    out[i * 3 + 2] = (Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * 180) / Math.PI + 90;
  }
  return out;
}

type ArcPlane = {
  planeNode: SVGGElement;
  trailNode: SVGPathElement;
  trailLength: number;
  /** Pre-sampled [x0, y0, angle0, x1, y1, angle1, ...] triplets. */
  samples: Float32Array;
  sampleCount: number;
  phase: number;
  speed: number;
  flow: SourceFlow;
  isNew: boolean;
};

// Per-corridor DOM bag — persisted across year changes so the network
// stays put and only the bits that actually need to change get tweened.
type CorridorEl = {
  arcG: SVGGElement;
  base: SVGPathElement;
  stroke: SVGPathElement;
  origin: SVGCircleElement;
  gatewayDot: SVGCircleElement;
  label: SVGTextElement | null;
  hit: SVGPathElement;
  pathLength: number;
  planes: ArcPlane[];
  color: string;
  thickness: number;
  // Cached pre-sampled arc geometry — shared by every plane on this arc
  // so we only call getPointAtLength once per corridor.
  samples?: Float32Array;
  // The visual state we last drove this corridor to. We don't re-apply
  // transitions if the state is unchanged across a re-render.
  lastState: "current" | "recent" | "historic" | "none";
  lastPlaneCount: number;
};

type VisualState = "current" | "recent" | "historic";

function visualOpacities(state: VisualState) {
  if (state === "current") return { trail: 0.42, stroke: 0.85, originR: 3.4, originAlpha: 0.95, gatewayStroke: 1, planeOpacity: 1, planeScale: 1.1, labelOpacity: 1 };
  if (state === "recent")  return { trail: 0.28, stroke: 0.45, originR: 2.0, originAlpha: 0.7,  gatewayStroke: 0.6, planeOpacity: 0.55, planeScale: 0.9, labelOpacity: 0 };
  return                        { trail: 0.16, stroke: 0.18, originR: 1.5, originAlpha: 0.45, gatewayStroke: 0.4, planeOpacity: 0,   planeScale: 0.8, labelOpacity: 0 };
}

/**
 * Build the cumulative set of corridors seen from 1965 through `upToYear`.
 * Each corridor is keyed by (country + gateway) so re-appearances reinforce
 * the same arc instead of stacking parallel duplicates.
 */
function accumulateCorridors(upToYear: number): Map<CorridorKey, Corridor> {
  const map = new Map<CorridorKey, Corridor>();

  const upsert = (flow: SourceFlow, atYear: number) => {
    const key = `${flow.country}__${flow.gateway}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        key,
        country: flow.country,
        region: flow.region,
        gateway: flow.gateway,
        firstYear: atYear,
        lastYear: atYear,
        maxCount: flow.count,
        currentCount: atYear === upToYear ? flow.count : 0,
      });
    } else {
      existing.lastYear = atYear;
      existing.maxCount = Math.max(existing.maxCount, flow.count);
      existing.currentCount = atYear === upToYear ? flow.count : 0;
    }
  };

  for (const yr of POST_1965_DATA) {
    if (yr.year > upToYear) break;
    // Headline top-N sources for the year.
    for (const flow of yr.sources) upsert(flow, yr.year);
    // The long tail — Pakistan, Iran, Colombia, Nigeria, Haiti, etc. —
    // that didn't make any year's top 8 but were steady, real immigration
    // streams. Adds dozens of corridors to the cumulative network.
    for (const flow of supplementalFlowsForYear(yr.year)) upsert(flow, yr.year);
  }
  return map;
}

export default function Post1965Replay() {
  const svgRef = useRef<SVGSVGElement>(null);
  const worldRef = useRef<SVGGElement | null>(null);
  const arcsRef = useRef<SVGGElement | null>(null);
  const planesRef = useRef<SVGGElement | null>(null);
  const projectionRef = useRef<d3.GeoProjection | null>(null);
  const animRef = useRef<number>(0);
  const planesStateRef = useRef<ArcPlane[]>([]);
  const renderedRef = useRef(false);
  // Persisted per-corridor DOM elements keyed by corridor.key. This is what
  // lets us add / remove / tween corridors across year changes instead of
  // tearing the whole layer down each tick.
  const corridorElsRef = useRef<Map<string, CorridorEl>>(new Map());
  // The map container — this is the element we hand to the browser's
  // Fullscreen API. Using the native API means the browser positions the
  // element correctly regardless of any ancestor `transform` / `filter` /
  // `backdrop-filter`, which previously trapped our `position: fixed`
  // wrapper inside a parent containing block.
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // Counterfactual ("what if 1965 hadn't passed") layers — drawn from
  // scratch each year, clipped to the left of the splitter.
  const counterArcsRef = useRef<SVGGElement | null>(null);
  const counterPlanesRef = useRef<SVGGElement | null>(null);
  const counterPlanesStateRef = useRef<ArcPlane[]>([]);
  // SVG clipPath rects we mutate when the splitter moves.
  const realityClipRef = useRef<SVGRectElement | null>(null);
  const counterClipRef = useRef<SVGRectElement | null>(null);

  const [year, setYear] = useState<number>(YEAR_MIN);
  const [playing, setPlaying] = useState<boolean>(false);
  const [hovered, setHovered] = useState<SourceFlow | null>(null);
  const [worldVersion, setWorldVersion] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [splitterPct, setSplitterPct] = useState(50);
  const { resolved: theme } = useTheme();

  // Sync `isFullscreen` state with the browser's actual fullscreen state.
  // Esc-to-exit and scroll-lock are handled by the browser automatically
  // when we use the native Fullscreen API, so we don't need custom handlers.
  useEffect(() => {
    const onChange = () => {
      const fsEl =
        document.fullscreenElement ??
        (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement;
      setIsFullscreen(fsEl === mapContainerRef.current);
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange as EventListener);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange as EventListener);
    };
  }, []);

  const enterFullscreen = useCallback(async () => {
    const el = mapContainerRef.current as
      | (HTMLElement & { webkitRequestFullscreen?: () => Promise<void> })
      | null;
    if (!el) return;
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      }
    } catch (err) {
      // Browsers reject when called outside a user gesture or when the
      // tab isn't focused. Surface in the console; user can try again.
      // eslint-disable-next-line no-console
      console.warn("[fullscreen] could not enter:", err);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    const doc = document as Document & { webkitExitFullscreen?: () => Promise<void> };
    try {
      if (doc.exitFullscreen) {
        await doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[fullscreen] could not exit:", err);
    }
  }, []);

  const yearData: YearRecord = useMemo(() => getYear(year), [year]);
  const regionBreakdown = useMemo(() => regionTotals(yearData), [yearData]);
  const topByRegion = useMemo(() => regionBreakdown[0], [regionBreakdown]);
  const corridors = useMemo(() => accumulateCorridors(year), [year]);

  // ----------------------------- world render (once per theme) -----------------------------
  useEffect(() => {
    if (!svgRef.current) return;
    let cancelled = false;

    async function render() {
      const [{ feature: topoFeature }, { default: worldAtlas }] = await Promise.all([
        import("topojson-client"),
        import("world-atlas/countries-110m.json"),
      ]);
      if (cancelled || !svgRef.current) return;

      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();
      svg.attr("viewBox", `0 0 ${W} ${H}`);

      const topology = worldAtlas as unknown as Topology;
      const countries = topoFeature(topology, topology.objects.countries) as FeatureCollection;

      const projection = d3
        .geoNaturalEarth1()
        .precision(0.1)
        .fitExtent([[20, 20], [W - 20, H - 40]], countries);
      projectionRef.current = projection;
      const path = d3.geoPath().projection(projection);

      const defs = svg.append("defs");

      const ocean = defs.append("radialGradient").attr("id", "p65-ocean").attr("cx", "55%").attr("cy", "40%").attr("r", "80%");
      ocean.append("stop").attr("offset", "0%").attr("stop-color", rgb("--map-ocean-from"));
      ocean.append("stop").attr("offset", "100%").attr("stop-color", rgb("--map-ocean-to"));

      const vignette = defs.append("radialGradient").attr("id", "p65-vignette").attr("cx", "50%").attr("cy", "50%").attr("r", "70%");
      vignette.append("stop").attr("offset", "60%").attr("stop-color", "rgba(0,0,0,0)");
      vignette.append("stop").attr("offset", "100%").attr("stop-color", rgba("--museum-bg", 0.85));

      const glow = defs.append("filter").attr("id", "p65-glow").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
      glow.append("feGaussianBlur").attr("stdDeviation", 3).attr("result", "blur");
      const merge = glow.append("feMerge");
      merge.append("feMergeNode").attr("in", "blur");
      merge.append("feMergeNode").attr("in", "SourceGraphic");

      const bigGlow = defs.append("filter").attr("id", "p65-bigglow").attr("x", "-100%").attr("y", "-100%").attr("width", "300%").attr("height", "300%");
      bigGlow.append("feGaussianBlur").attr("stdDeviation", 6).attr("result", "blur");
      const bMerge = bigGlow.append("feMerge");
      bMerge.append("feMergeNode").attr("in", "blur");
      bMerge.append("feMergeNode").attr("in", "SourceGraphic");

      svg.append("rect").attr("width", W).attr("height", H).attr("fill", "url(#p65-ocean)");

      // Starfield for ocean depth.
      const stars = svg.append("g").attr("class", "stars").attr("opacity", 0.5);
      for (let i = 0; i < 60; i++) {
        stars.append("circle")
          .attr("cx", Math.random() * W)
          .attr("cy", Math.random() * H)
          .attr("r", Math.random() * 0.8 + 0.2)
          .attr("fill", "rgba(234, 226, 209, 0.25)");
      }

      const world = svg.append("g").attr("class", "world");
      worldRef.current = world.node();

      const graticule = d3.geoGraticule10();
      world
        .append("path")
        .datum(graticule)
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", rgba("--map-graticule", 0.06))
        .attr("stroke-width", 0.4);

      world
        .append("g")
        .attr("class", "land")
        .selectAll("path")
        .data(countries.features)
        .join("path")
        .attr("d", path)
        .attr("fill", rgb("--map-land"))
        .attr("stroke", rgba("--map-border", 0.12))
        .attr("stroke-width", 0.4);

      // U.S. highlighted as receiving country + permanent gateway labels.
      const usa = countries.features.find((f) => (f as { id?: string }).id === "840");
      if (usa) {
        world
          .append("path")
          .datum(usa)
          .attr("d", path)
          .attr("fill", rgba("--museum-gold", 0.08))
          .attr("stroke", rgba("--museum-gold", 0.5))
          .attr("stroke-width", 0.8)
          .attr("pointer-events", "none");

        const gateLayer = world.append("g").attr("class", "gateways");
        Object.values(GATEWAYS).forEach((g) => {
          const pt = projection([g.lng, g.lat]);
          if (!pt) return;
          gateLayer.append("circle")
            .attr("cx", pt[0])
            .attr("cy", pt[1])
            .attr("r", 1.6)
            .attr("fill", rgba("--museum-gold", 0.65));
          gateLayer.append("text")
            .attr("x", pt[0])
            .attr("y", pt[1] + 10)
            .attr("text-anchor", "middle")
            .attr("font-size", 8)
            .attr("font-family", "Inter, sans-serif")
            .attr("font-weight", 500)
            .attr("fill", rgba("--museum-text", 0.6))
            .attr("paint-order", "stroke")
            .attr("stroke", rgba("--museum-bg", 0.6))
            .attr("stroke-width", 2)
            .text(g.label);
        });
      }

      // Clip-path rects for the before/after splitter. Initialized full-
      // width; the dedicated effect below updates them when the splitter
      // moves or compare mode is toggled.
      const realityClip = defs.append("clipPath").attr("id", "p65-reality-clip");
      realityClipRef.current = realityClip
        .append("rect")
        .attr("x", 0).attr("y", 0).attr("width", W).attr("height", H)
        .node() as SVGRectElement;
      const counterClip = defs.append("clipPath").attr("id", "p65-counter-clip");
      counterClipRef.current = counterClip
        .append("rect")
        .attr("x", 0).attr("y", 0).attr("width", W).attr("height", H)
        .node() as SVGRectElement;

      // Reality layers (arcs below, planes above).
      arcsRef.current = world.append("g").attr("class", "arcs").node();
      planesRef.current = world.append("g").attr("class", "planes").node();
      // Counterfactual layers — what immigration would look like if 1965
      // hadn't passed. Sit on top of reality so they remain visible when
      // clipped to the left half.
      counterArcsRef.current = world.append("g").attr("class", "counter-arcs").node();
      counterPlanesRef.current = world.append("g").attr("class", "counter-planes").node();

      renderedRef.current = true;
      setWorldVersion((v) => v + 1);
    }

    render();
    return () => {
      cancelled = true;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [theme]);

  // When the world is rebuilt (theme change), corridor element refs point
  // at stale DOM. Clear them so the next corridor-diff effect rebuilds.
  useEffect(() => {
    corridorElsRef.current.clear();
    planesStateRef.current = [];
    counterPlanesStateRef.current = [];
  }, [worldVersion]);

  // ----------------------------- corridors diff + tween on year change -----------------------------
  // Lines and planes from previous years are kept in place; we only ADD new
  // corridors (with a fade-in), REMOVE corridors that fell out of the data
  // (fade-out), and TWEEN existing ones to their new state. This is what
  // keeps the network from flickering every time the year advances.
  useEffect(() => {
    const arcs = arcsRef.current;
    const planeLayer = planesRef.current;
    const projection = projectionRef.current;
    if (!arcs || !planeLayer || !projection || !renderedRef.current) return;

    const elsMap = corridorElsRef.current;
    const corridorList = Array.from(corridors.values());
    const maxOverallCount = Math.max(1, ...corridorList.map((c) => c.maxCount));
    const maxCurrentCount = Math.max(
      1,
      ...corridorList.filter((c) => c.currentCount > 0).map((c) => c.currentCount)
    );
    const newKeys = new Set(corridorList.map((c) => c.key));

    // --- 1. Remove corridors that fell out of the data (scrub-back path) ---
    elsMap.forEach((el, key) => {
      if (newKeys.has(key)) return;
      d3.select(el.arcG).transition().duration(550).attr("opacity", 0).remove();
      el.planes.forEach((p) => {
        d3.select(p.planeNode).transition().duration(450).attr("opacity", 0).remove();
        d3.select(p.trailNode).transition().duration(450).attr("opacity", 0).remove();
      });
      elsMap.delete(key);
    });

    const stateFor = (c: Corridor): VisualState => {
      if (c.currentCount > 0) return "current";
      if (year - c.lastYear <= ACTIVE_CORRIDOR_WINDOW) return "recent";
      return "historic";
    };
    const desiredPlanes = (c: Corridor, s: VisualState) => {
      if (s === "current") {
        // Scale plane count by both relative share AND absolute volume so a
        // few mega-corridors (Mexico, India, China) get dense traffic while
        // smaller flows still feel busy. Numbers are in thousands.
        const share = c.currentCount / maxCurrentCount;
        const abs = c.currentCount;
        if (share > 0.7 || abs > 200) return 6;
        if (share > 0.45 || abs > 110) return 5;
        if (share > 0.25 || abs > 55) return 4;
        if (share > 0.12 || abs > 25) return 3;
        if (share > 0.04 || abs > 8) return 2;
        return 1;
      }
      if (s === "recent") {
        // Recently-active corridors keep at least one plane in the air, and
        // historically large ones (Mexico, Philippines) keep two — the
        // cumulative map should feel lived-in, not ghostly.
        return c.maxCount > 60 ? 2 : 1;
      }
      return 0;
    };

    // --- 2. Enter / update each corridor ---
    corridorList.forEach((corridor, idx) => {
      const originCoord = COUNTRY_COORDS[corridor.country];
      const gate = GATEWAYS[corridor.gateway];
      if (!originCoord || !gate) return;
      const start = projection([originCoord.lng, originCoord.lat]);
      const end = projection([gate.lng, gate.lat]);
      if (!start || !end) return;

      const state = stateFor(corridor);
      const vis = visualOpacities(state);
      const wantPlanes = desiredPlanes(corridor, state);
      const color = REGION_COLOR[corridor.region];
      const thickness = 0.6 + (corridor.maxCount / maxOverallCount) * 3.5;

      let el = elsMap.get(corridor.key);

      // ---------- ENTER ----------
      if (!el) {
        // Build the arc in projected SCREEN space, not in spherical lng/lat.
        // The previous great-circle interpolation took the geographic short
        // path, which for Asia→San Francisco crosses the antimeridian — and
        // the flat Natural Earth projection then snapped half the line to
        // the right edge of the map and half to the left, making the arc
        // "bounce" off the edges. Drawing a quadratic Bézier between the
        // two screen-space points goes directly from origin to gateway with
        // a clean lift in between, no wrapping artifacts.
        const dx = end[0] - start[0];
        const dy = end[1] - start[1];
        const dist = Math.sqrt(dx * dx + dy * dy);
        const liftSeed = (corridor.country.charCodeAt(0) + corridor.country.charCodeAt(corridor.country.length - 1)) % 5;
        const liftScale = 0.28 + 0.08 * (liftSeed / 4);
        // Arcs always lift toward the top of the map. Cap the lift on very
        // long routes so cross-Pacific paths don't fly off the canvas.
        const lift = Math.min(180, dist * liftScale);
        const cx = (start[0] + end[0]) / 2;
        const cy = (start[1] + end[1]) / 2 - lift;
        const dStr = `M ${start[0].toFixed(2)},${start[1].toFixed(2)} Q ${cx.toFixed(2)},${cy.toFixed(2)} ${end[0].toFixed(2)},${end[1].toFixed(2)}`;

        const arcG = d3.select(arcs).append("g")
          .attr("class", "arc-group")
          .style("cursor", "pointer")
          .attr("opacity", 0);

        const base = arcG.append("path")
          .attr("d", dStr)
          .attr("fill", "none")
          .attr("stroke", color)
          .attr("stroke-opacity", vis.trail)
          .attr("stroke-width", Math.max(0.5, thickness * 0.45))
          .attr("stroke-dasharray", "1 4")
          .attr("stroke-linecap", "round");

        const stroke = arcG.append("path")
          .attr("d", dStr)
          .attr("fill", "none")
          .attr("stroke", color)
          .attr("stroke-opacity", vis.stroke)
          .attr("stroke-width", thickness)
          .attr("stroke-linecap", "round")
          .attr("filter", state === "current" ? "url(#p65-glow)" : null);

        const pathLength = (stroke.node() as SVGPathElement).getTotalLength();

        // Trace-on animation only on first appearance. Once it finishes we
        // strip the dasharray so future stroke-opacity tweens are clean.
        if (state === "current") {
          stroke
            .attr("stroke-dasharray", `${pathLength} ${pathLength}`)
            .attr("stroke-dashoffset", pathLength)
            .transition()
            .delay((idx % 8) * 35)
            .duration(900)
            .ease(d3.easeCubicOut)
            .attr("stroke-dashoffset", 0)
            .on("end", function () {
              d3.select(this).attr("stroke-dasharray", null).attr("stroke-dashoffset", null);
            });

          // Arrival ping at the gateway — one-shot, removes itself.
          const pulse = arcG.append("circle")
            .attr("cx", end[0])
            .attr("cy", end[1])
            .attr("r", 3)
            .attr("fill", color)
            .attr("fill-opacity", 0.9)
            .attr("filter", "url(#p65-glow)");
          pulse.transition()
            .delay((idx % 8) * 35 + 500)
            .duration(1500)
            .ease(d3.easeCubicOut)
            .attr("r", 22)
            .attr("fill-opacity", 0)
            .remove();
        }

        const originDot = arcG.append("circle")
          .attr("cx", start[0])
          .attr("cy", start[1])
          .attr("r", vis.originR)
          .attr("fill", color)
          .attr("fill-opacity", vis.originAlpha)
          .attr("stroke", "rgba(255,255,255,0.6)")
          .attr("stroke-width", 0.5);

        const gatewayDot = arcG.append("circle")
          .attr("cx", end[0])
          .attr("cy", end[1])
          .attr("r", 1.8)
          .attr("fill", rgb("--museum-text"))
          .attr("stroke", color)
          .attr("stroke-width", vis.gatewayStroke);

        const label = arcG.append("text")
          .attr("x", start[0])
          .attr("y", start[1] - 8)
          .attr("text-anchor", "middle")
          .attr("font-size", 10)
          .attr("font-family", "Inter, sans-serif")
          .attr("font-weight", 600)
          .attr("fill", rgb("--museum-text"))
          .attr("paint-order", "stroke")
          .attr("stroke", rgba("--museum-bg", 0.75))
          .attr("stroke-width", 3)
          .attr("opacity", vis.labelOpacity)
          .text(corridor.country);

        const hit = arcG.append("path")
          .attr("d", dStr)
          .attr("fill", "none")
          .attr("stroke", "transparent")
          .attr("stroke-width", Math.max(14, thickness * 4));

        arcG.transition().duration(550).attr("opacity", 1);

        el = {
          arcG: arcG.node() as SVGGElement,
          base: base.node() as SVGPathElement,
          stroke: stroke.node() as SVGPathElement,
          origin: originDot.node() as SVGCircleElement,
          gatewayDot: gatewayDot.node() as SVGCircleElement,
          label: label.node() as SVGTextElement,
          hit: hit.node() as SVGPathElement,
          pathLength,
          planes: [],
          color,
          thickness,
          lastState: "none",
          lastPlaneCount: 0,
        };
        elsMap.set(corridor.key, el);
      }

      // ---------- UPDATE (tween only if state actually changed) ----------
      if (el.lastState !== state) {
        const tweenMs = 520;
        d3.select(el.base).transition().duration(tweenMs).attr("stroke-opacity", vis.trail);
        d3.select(el.stroke)
          .transition()
          .duration(tweenMs)
          .attr("stroke-opacity", vis.stroke);
        // Filter swap (glow on current, none on others) — not tweenable, so
        // just set it inside the transition window.
        d3.select(el.stroke).attr("filter", state === "current" ? "url(#p65-glow)" : null);
        d3.select(el.origin)
          .transition()
          .duration(tweenMs)
          .attr("r", vis.originR)
          .attr("fill-opacity", vis.originAlpha);
        d3.select(el.gatewayDot).transition().duration(tweenMs).attr("stroke-width", vis.gatewayStroke);
        if (el.label) {
          d3.select(el.label).transition().duration(tweenMs).attr("opacity", vis.labelOpacity);
        }
      }

      // Hover-area binding — updates each year so the tooltip carries the
      // current year's count. Historic corridors don't show a tooltip.
      const tooltipFlow: SourceFlow = {
        country: corridor.country,
        count: corridor.currentCount > 0 ? corridor.currentCount : corridor.maxCount,
        region: corridor.region,
        gateway: corridor.gateway,
      };
      const hitSel = d3.select(el.hit);
      if (state === "historic") {
        hitSel.on("mouseenter", null).on("mouseleave", null);
      } else {
        hitSel
          .on("mouseenter", () => setHovered(tooltipFlow))
          .on("mouseleave", () => setHovered(null));
      }

      // ---------- Adjust plane fleet on this corridor ----------
      // Remove excess planes (fade out, then drop from DOM and from our list).
      while (el.planes.length > wantPlanes) {
        const removed = el.planes.pop();
        if (!removed) break;
        d3.select(removed.planeNode).transition().duration(400).attr("opacity", 0).remove();
        d3.select(removed.trailNode).transition().duration(400).attr("opacity", 0).remove();
      }
      // Add missing planes (fade in).
      const arcLength = el.pathLength;
      const pathDStr = d3.select(el.stroke).attr("d") ?? "";
      // Sample the arc once per corridor entry — all of this corridor's
      // planes share the same geometry, so a single sample table suffices.
      // (Cached on the el so we don't resample on every plane add.)
      const samples = el.samples ?? sampleArc(el.stroke);
      el.samples = samples;
      while (el.planes.length < wantPlanes) {
        const k = el.planes.length;
        const planeRoot = d3.select(planeLayer);
        const trail = planeRoot.append("path")
          .attr("d", pathDStr)
          .attr("fill", "none")
          .attr("stroke", "rgba(255, 255, 255, 0.7)")
          .attr("stroke-width", Math.max(1.2, el.thickness * 0.6))
          .attr("stroke-linecap", "round")
          .attr("filter", "url(#p65-glow)")
          .attr("stroke-dasharray", `0 ${arcLength}`)
          .attr("opacity", 0);
        trail.transition().duration(450).attr("opacity", 0.55);

        const planeWrap = planeRoot.append("g").attr("opacity", 0);
        const plane = planeWrap.append("g");
        plane.append("ellipse")
          .attr("cx", 0).attr("cy", 7)
          .attr("rx", 7).attr("ry", 1.4)
          .attr("fill", "rgba(0,0,0,0.25)");
        plane.append("path")
          .attr("d", PLANE_PATH)
          .attr("fill", el.color)
          .attr("stroke", "rgba(255,255,255,0.9)")
          .attr("stroke-width", 0.6)
          .attr("filter", "url(#p65-glow)");
        planeWrap.transition().delay(k * 200).duration(450).attr("opacity", vis.planeOpacity);

        el.planes.push({
          planeNode: planeWrap.node() as SVGGElement,
          trailNode: trail.node() as SVGPathElement,
          trailLength: arcLength,
          samples,
          sampleCount: SAMPLE_COUNT,
          // Spread phases evenly so multiple planes on the same arc don't overlap.
          phase: (k / Math.max(1, wantPlanes)) + ((idx * 0.07) % 1),
          // Faster baseline + a bigger volume bonus so heavy corridors
          // (Mexico / India / China) visibly outpace the rest.
          speed: 0.22 + (state === "current" ? 0.08 : 0.02) + (corridor.maxCount / maxOverallCount) * 0.08,
          flow: tooltipFlow,
          isNew: false,
        });
      }
      // Tween existing planes' opacity if state changed.
      if (el.lastState !== state) {
        el.planes.forEach((p) => {
          d3.select(p.planeNode).transition().duration(500).attr("opacity", vis.planeOpacity);
        });
      }

      el.lastState = state;
      el.lastPlaneCount = wantPlanes;
    });

    // --- 3. Flatten plane list for the RAF tick ---
    const all: ArcPlane[] = [];
    elsMap.forEach((el) => el.planes.forEach((p) => all.push(p)));
    planesStateRef.current = all;
  }, [corridors, year, worldVersion]);

  // ----------------------------- counterfactual arcs -----------------------------
  // Redrawn from scratch each year — the dataset is small (~8 flows) so the
  // diff machinery isn't worth it here. Only renders when compareMode is on.
  useEffect(() => {
    const arcsNode = counterArcsRef.current;
    const planesNode = counterPlanesRef.current;
    const projection = projectionRef.current;
    if (!arcsNode || !planesNode || !projection || !renderedRef.current) return;

    const arcsSel = d3.select(arcsNode);
    const planeSel = d3.select(planesNode);
    arcsSel.selectAll("*").remove();
    planeSel.selectAll("*").remove();
    counterPlanesStateRef.current = [];

    if (!compareMode) return;

    const flows = counterfactualSourcesFor(year);
    const maxCount = Math.max(1, ...flows.map((f) => f.count));

    flows.forEach((flow, i) => {
      const origin = COUNTRY_COORDS[flow.country];
      const gate = GATEWAYS[flow.gateway];
      if (!origin || !gate) return;
      const start = projection([origin.lng, origin.lat]);
      const end = projection([gate.lng, gate.lat]);
      if (!start || !end) return;

      const dx = end[0] - start[0];
      const dy = end[1] - start[1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      const liftSeed = (flow.country.charCodeAt(0) + flow.country.charCodeAt(flow.country.length - 1)) % 5;
      const lift = Math.min(180, dist * (0.28 + 0.08 * (liftSeed / 4)));
      const cx = (start[0] + end[0]) / 2;
      const cy = (start[1] + end[1]) / 2 - lift;
      const dStr = `M ${start[0].toFixed(2)},${start[1].toFixed(2)} Q ${cx.toFixed(2)},${cy.toFixed(2)} ${end[0].toFixed(2)},${end[1].toFixed(2)}`;

      const color = REGION_COLOR[flow.region];
      const thickness = 0.7 + (flow.count / maxCount) * 3.2;

      const g = arcsSel.append("g").attr("class", "counter-arc");

      g.append("path")
        .attr("d", dStr).attr("fill", "none")
        .attr("stroke", color).attr("stroke-opacity", 0.32)
        .attr("stroke-width", Math.max(0.5, thickness * 0.45))
        .attr("stroke-dasharray", "1 4")
        .attr("stroke-linecap", "round");

      const stroke = g.append("path")
        .attr("d", dStr).attr("fill", "none")
        .attr("stroke", color).attr("stroke-opacity", 0.85)
        .attr("stroke-width", thickness)
        .attr("stroke-linecap", "round")
        .attr("filter", "url(#p65-glow)");
      const len = (stroke.node() as SVGPathElement).getTotalLength();
      stroke
        .attr("stroke-dasharray", `${len} ${len}`)
        .attr("stroke-dashoffset", len)
        .transition()
        .delay((i % 6) * 60)
        .duration(900)
        .ease(d3.easeCubicOut)
        .attr("stroke-dashoffset", 0)
        .on("end", function () {
          d3.select(this).attr("stroke-dasharray", null).attr("stroke-dashoffset", null);
        });

      g.append("circle")
        .attr("cx", start[0]).attr("cy", start[1])
        .attr("r", 3).attr("fill", color)
        .attr("stroke", "rgba(255,255,255,0.6)").attr("stroke-width", 0.5)
        .attr("filter", "url(#p65-glow)");
      g.append("circle")
        .attr("cx", end[0]).attr("cy", end[1])
        .attr("r", 1.8).attr("fill", rgb("--museum-text"))
        .attr("stroke", color).attr("stroke-width", 1);
      g.append("text")
        .attr("x", start[0]).attr("y", start[1] - 8)
        .attr("text-anchor", "middle")
        .attr("font-size", 10)
        .attr("font-family", "Inter, sans-serif")
        .attr("font-weight", 600)
        .attr("fill", rgb("--museum-text"))
        .attr("paint-order", "stroke")
        .attr("stroke", rgba("--museum-bg", 0.75))
        .attr("stroke-width", 3)
        .attr("opacity", 0)
        .text(flow.country)
        .transition()
        .delay((i % 6) * 60 + 400)
        .duration(450)
        .attr("opacity", 1);

      // One plane per counterfactual corridor — fewer, slower than reality.
      const trail = planeSel.append("path")
        .attr("d", dStr)
        .attr("fill", "none")
        .attr("stroke", "rgba(255, 255, 255, 0.7)")
        .attr("stroke-width", Math.max(1.0, thickness * 0.55))
        .attr("stroke-linecap", "round")
        .attr("filter", "url(#p65-glow)")
        .attr("stroke-dasharray", `0 ${len}`)
        .attr("opacity", 0.5);
      const planeWrap = planeSel.append("g").attr("opacity", 0);
      planeWrap.transition().delay((i % 6) * 60 + 500).duration(400).attr("opacity", 0.95);
      const plane = planeWrap.append("g");
      plane.append("ellipse")
        .attr("cx", 0).attr("cy", 7).attr("rx", 6).attr("ry", 1.2)
        .attr("fill", "rgba(0,0,0,0.25)");
      plane.append("path")
        .attr("d", PLANE_PATH)
        .attr("fill", color)
        .attr("stroke", "rgba(255,255,255,0.9)")
        .attr("stroke-width", 0.6)
        .attr("filter", "url(#p65-glow)");

      counterPlanesStateRef.current.push({
        planeNode: planeWrap.node() as SVGGElement,
        trailNode: trail.node() as SVGPathElement,
        trailLength: len,
        samples: sampleArc(stroke.node() as SVGPathElement),
        sampleCount: SAMPLE_COUNT,
        phase: (i / Math.max(1, flows.length)),
        speed: 0.18,
        flow,
        isNew: false,
      });
    });
  }, [compareMode, year, worldVersion]);

  // ----------------------------- splitter clip update -----------------------------
  // Drives the clipPath rects whenever the splitter moves or compareMode
  // toggles. No re-render of arcs; only clip rect dimensions change.
  useEffect(() => {
    const realityRect = realityClipRef.current;
    const counterRect = counterClipRef.current;
    const arcs = arcsRef.current;
    const planes = planesRef.current;
    const counterArcs = counterArcsRef.current;
    const counterPlanes = counterPlanesRef.current;
    if (!realityRect || !counterRect || !arcs || !planes || !counterArcs || !counterPlanes) return;

    if (compareMode) {
      const splitterX = (splitterPct / 100) * W;
      realityRect.setAttribute("x", String(splitterX));
      realityRect.setAttribute("width", String(Math.max(0, W - splitterX)));
      counterRect.setAttribute("x", "0");
      counterRect.setAttribute("width", String(splitterX));
      arcs.setAttribute("clip-path", "url(#p65-reality-clip)");
      planes.setAttribute("clip-path", "url(#p65-reality-clip)");
      counterArcs.setAttribute("clip-path", "url(#p65-counter-clip)");
      counterPlanes.setAttribute("clip-path", "url(#p65-counter-clip)");
    } else {
      arcs.removeAttribute("clip-path");
      planes.removeAttribute("clip-path");
      counterArcs.removeAttribute("clip-path");
      counterPlanes.removeAttribute("clip-path");
    }
  }, [compareMode, splitterPct, worldVersion]);

  // Persistent RAF loop — drives plane positions from planesStateRef.
  // Not torn down when planes are added/removed; it just iterates whatever
  // is in the current array.
  useEffect(() => {
    if (!renderedRef.current) return;
    const startedAt = performance.now();
    const driveFleet = (fleet: ArcPlane[], elapsed: number) => {
      // Tight loop — pure arithmetic only. No SVG queries inside; positions
      // come from each plane's pre-sampled `samples` array (computed once
      // at creation in `sampleArc`).
      for (let pi = 0; pi < fleet.length; pi++) {
        const p = fleet[pi];
        const len = p.trailLength;
        if (!len) continue;
        const s = p.samples;
        const N = p.sampleCount;
        // Skip any plane whose samples buffer is missing or short of what
        // sampleCount claims. This can happen for a single frame after Fast
        // Refresh hot-swaps the code in dev — the array reference is still
        // a pre-refresh shape.
        if (!s || !N || s.length < N * 3) continue;
        const t = (elapsed * p.speed + p.phase) % 1;
        const tt = t * (N - 1);
        let idx = tt | 0;
        if (idx < 0) idx = 0;
        else if (idx > N - 1) idx = N - 1;
        const next = idx + 1 < N ? idx + 1 : idx;
        const frac = tt - idx;
        const i3 = idx * 3;
        const n3 = next * 3;
        const sx = s[i3];
        const sy = s[i3 + 1];
        const sa = s[i3 + 2];
        if (sx === undefined || sy === undefined || sa === undefined) continue;
        const x = sx + (s[n3] - sx) * frac;
        const y = sy + (s[n3 + 1] - sy) * frac;
        p.planeNode.setAttribute(
          "transform",
          `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${sa.toFixed(1)})`
        );
        const dashWin = t * len;
        const visible = dashWin < 55 ? dashWin : 55;
        p.trailNode.setAttribute("stroke-dasharray", `${visible.toFixed(0)} ${len.toFixed(0)}`);
        p.trailNode.setAttribute("stroke-dashoffset", `${(-Math.max(0, dashWin - 55)).toFixed(0)}`);
      }
    };
    const tick = (now: number) => {
      const elapsed = (now - startedAt) / 1000;
      driveFleet(planesStateRef.current, elapsed);
      driveFleet(counterPlanesStateRef.current, elapsed);
      animRef.current = requestAnimationFrame(tick);
    };
    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [worldVersion]);

  // ----------------------------- autoplay -----------------------------
  useEffect(() => {
    if (!playing) return;
    const dwell = yearData.event ? PLAY_MS_PER_YEAR_EVENT : PLAY_MS_PER_YEAR_DEFAULT;
    const t = setTimeout(() => {
      setYear((y) => {
        if (y >= YEAR_MAX) {
          setPlaying(false);
          return y;
        }
        return y + 1;
      });
    }, dwell);
    return () => clearTimeout(t);
  }, [playing, year, yearData.event]);

  const togglePlay = useCallback(() => {
    if (year >= YEAR_MAX) setYear(YEAR_MIN);
    setPlaying((p) => !p);
  }, [year]);

  const onScrub = useCallback((y: number) => {
    setPlaying(false);
    setYear(y);
  }, []);

  const goPrev = useCallback(() => onScrub(Math.max(YEAR_MIN, year - 1)), [year, onScrub]);
  const goNext = useCallback(() => onScrub(Math.min(YEAR_MAX, year + 1)), [year, onScrub]);

  const ERAS = useMemo(
    () => [
      { start: 1965, end: 1980, label: "Quotas end · refugees arrive" },
      { start: 1980, end: 1990, label: "Refugee Act · IRCA" },
      { start: 1990, end: 2001, label: "Diversity visa · IT boom" },
      { start: 2001, end: 2013, label: "Post-9/11 security era" },
      { start: 2013, end: 2020, label: "China surpasses Mexico" },
      { start: 2020, end: YEAR_MAX, label: "Pandemic · humanitarian surge" },
    ],
    []
  );

  const currentEra = ERAS.find((e) => year >= e.start && year < e.end) ?? ERAS[ERAS.length - 1];
  const progressPct = ((year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100;

  // Counts for the "growing network" indicator.
  const activeCorridorCount = useMemo(() => {
    let n = 0;
    corridors.forEach((c) => { if (year - c.lastYear <= ACTIVE_CORRIDOR_WINDOW) n++; });
    return n;
  }, [corridors, year]);
  const totalCorridorCount = corridors.size;

  return (
    <div className="space-y-5">
      {/* Header — always rendered. When the map enters native fullscreen
          the browser hides everything outside the fullscreen target, so
          this disappears for free. */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="folio">Plate II · Six Decades of Arrival</p>
          <h3 className="mt-2 font-display text-3xl text-museum-text md:text-4xl">
            How America&apos;s gates opened
          </h3>
          <p className="mt-2 max-w-2xl font-serif text-sm leading-relaxed text-museum-muted">
            The 1965 Hart–Celler Act abolished national-origin quotas. Press
            play to watch the corridors accumulate: every year adds new
            routes, and planes keep flying along the ones still active.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            className="border border-museum-border/20 bg-museum-bg/70 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-museum-muted transition hover:border-gold/50 hover:text-gold disabled:opacity-40"
            aria-label="Previous year"
            disabled={year <= YEAR_MIN}
          >
            ‹ Prev
          </button>
          <button
            type="button"
            onClick={togglePlay}
            className="inline-flex items-center gap-2 border border-gold/50 bg-gold/[0.08] px-4 py-2 text-xs uppercase tracking-[0.22em] text-gold transition hover:border-gold hover:bg-gold/[0.16]"
            aria-label={playing ? "Pause replay" : "Play replay"}
          >
            <span aria-hidden className="text-base leading-none">{playing ? "❚❚" : "▶"}</span>
            <span>{playing ? "Pause" : "Play replay"}</span>
          </button>
          <button
            type="button"
            onClick={goNext}
            className="border border-museum-border/20 bg-museum-bg/70 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-museum-muted transition hover:border-gold/50 hover:text-gold disabled:opacity-40"
            aria-label="Next year"
            disabled={year >= YEAR_MAX}
          >
            Next ›
          </button>
          <button
            type="button"
            onClick={() => onScrub(YEAR_MIN)}
            className="ml-2 border border-museum-border/20 bg-museum-bg/70 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-museum-muted transition hover:border-gold/50 hover:text-gold"
            aria-label="Reset to 1965"
          >
            ↺ {YEAR_MIN}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCompareMode((v) => !v);
            }}
            className={`ml-2 inline-flex items-center gap-2 border px-3 py-2 text-[10px] uppercase tracking-[0.22em] transition ${
              compareMode
                ? "border-gold bg-gold/[0.16] text-gold"
                : "border-museum-border/20 bg-museum-bg/70 text-museum-muted hover:border-gold/50 hover:text-gold"
            }`}
            aria-pressed={compareMode}
            title="Compare what the map would look like if the 1965 Act hadn't passed"
          >
            <span aria-hidden>⇆</span>
            <span>{compareMode ? "Exit compare" : "Compare 1965"}</span>
          </button>
        </div>
      </div>

      {/* Year context banner — always rendered; hidden by browser during
          native fullscreen because it sits outside the map container. */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`ctx-${year}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-[auto_1fr_auto] items-center gap-5 border border-museum-border/15 bg-museum-bg/60 px-5 py-4 backdrop-blur"
        >
          <div className="flex items-baseline gap-3">
            <p className="font-display text-5xl leading-none text-museum-text md:text-6xl">{year}</p>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-museum-muted">
              {currentEra.label}
            </p>
          </div>
          <div className="min-w-0">
            {yearData.event ? (
              <>
                <p className="folio">Event of the year</p>
                <p className="mt-0.5 truncate font-display text-lg leading-snug text-museum-text">
                  {yearData.event}
                </p>
                {yearData.context && (
                  <p className="mt-0.5 truncate font-serif text-xs text-museum-muted">
                    {yearData.context}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="folio">No headline policy</p>
                <p className="mt-0.5 font-serif text-sm text-museum-muted">
                  A working year — corridors deepen, families reunite, the
                  composition of America keeps shifting.
                </p>
              </>
            )}
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl text-museum-text">
              {formatThousands(yearData.total)}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-museum-faint">
              new permanent residents
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ============================================================== */}
      {/* MAP CONTAINER — this is the element handed to the browser's     */}
      {/* Fullscreen API. The browser sizes it to the screen on its own.  */}
      {/* ============================================================== */}
      <div
        ref={mapContainerRef}
        className={`group relative overflow-hidden ${
          isFullscreen
            ? "h-full w-full cursor-default bg-museum-bg"
            : "cursor-zoom-in border border-museum-border/[0.12] bg-museum-bg-soft/40 shadow-[var(--shadow-card)]"
        }`}
        onClick={!isFullscreen ? enterFullscreen : undefined}
        role={!isFullscreen ? "button" : undefined}
        aria-label={!isFullscreen ? "Expand the world map to fullscreen" : undefined}
        tabIndex={!isFullscreen ? 0 : undefined}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !isFullscreen) {
            e.preventDefault();
            enterFullscreen();
          }
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          // In fullscreen, anchor the map content to the TOP of the SVG so
          // any aspect-ratio letterboxing falls at the bottom (where the
          // control panel covers it). Otherwise the map gets centered and
          // the top edge of Russia/Canada is pushed into an empty bar at
          // the top of the viewport.
          preserveAspectRatio={isFullscreen ? "xMidYMin meet" : "xMidYMid meet"}
          className={isFullscreen ? "block h-full w-full" : "block h-auto w-full"}
          role="img"
          aria-label={`Immigration to the United States in ${year}`}
        />

        {/* Region legend — normal mode only. In fullscreen, region breakdown
            lives inside the bottom panel. */}
        {!isFullscreen && (
          <div className="absolute right-4 top-4 z-10 max-w-[230px] border border-museum-border/15 bg-museum-bg/85 p-3 text-[10px] uppercase tracking-[0.18em] backdrop-blur">
            <p className="text-museum-muted">Region of origin · {year}</p>
            <div className="mt-2 grid grid-cols-1 gap-1">
              {regionBreakdown.map(({ region, count }) => (
                <div key={region} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: REGION_COLOR[region] }}
                    />
                    <span className="text-museum-text">{regionLabel(region)}</span>
                  </span>
                  <span className="font-mono normal-case tracking-normal text-museum-muted">
                    {Math.round(count)}K
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Growing-network indicator — bottom-left, normal mode only.
            In fullscreen this would cover Latin America. */}
        {!isFullscreen && (
          <div className="absolute left-4 bottom-4 z-10 border-l-2 border-gold bg-museum-bg/85 px-3 py-2 backdrop-blur">
            <p className="folio">Corridors on the map</p>
            <p className="mt-1 font-display text-2xl text-museum-text">
              <span className="text-gold">{activeCorridorCount}</span>
              <span className="mx-1 text-museum-faint">/</span>
              <span className="text-museum-muted">{totalCorridorCount}</span>
            </p>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-museum-faint">
              active · cumulative since {YEAR_MIN}
            </p>
          </div>
        )}

        {/* Speed indicator — bottom-right, normal mode only. */}
        {!isFullscreen && (
          <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2 border border-museum-border/15 bg-museum-bg/85 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-museum-muted backdrop-blur">
            <span className="opacity-60">Dwell</span>
            <span className="font-mono text-museum-text">
              {(yearData.event ? PLAY_MS_PER_YEAR_EVENT : PLAY_MS_PER_YEAR_DEFAULT) / 1000}s
            </span>
            {yearData.event && (
              <span className="rounded-sm bg-gold/[0.18] px-1.5 py-0.5 text-[9px] tracking-[0.18em] text-gold">
                event hold
              </span>
            )}
          </div>
        )}

        {/* Hover tooltip */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              key={hovered.country + year}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 border border-gold/40 bg-museum-bg/90 px-4 py-2 backdrop-blur"
            >
              <p className="folio">{regionLabel(hovered.region)}</p>
              <p className="mt-1 font-display text-lg text-museum-text">
                {hovered.country} → {GATEWAYS[hovered.gateway].label}
              </p>
              <p className="font-mono text-xs text-museum-muted">
                {Math.round(hovered.count)}K arrivals · {year}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live progress bar */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-museum-border/10">
          <motion.div
            initial={false}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="h-full bg-gradient-to-r from-gold via-gold to-brick"
          />
        </div>

        {/* Expand button — normal mode only. */}
        {!isFullscreen && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              enterFullscreen();
            }}
            className="absolute left-1/2 top-4 z-30 inline-flex -translate-x-1/2 items-center gap-2 rounded-sm border border-gold/60 bg-museum-bg/90 px-3.5 py-2 text-[10px] uppercase tracking-[0.22em] text-gold shadow-[var(--shadow-card)] backdrop-blur transition hover:border-gold hover:bg-gold/[0.16]"
            aria-label="Expand the world map to fullscreen"
          >
            <span aria-hidden className="text-sm leading-none">⤢</span>
            <span>Expand map</span>
          </button>
        )}

        {/* Close button — fullscreen mode only. Lives inside the map
            container so it's visible when the browser fullscreens us. */}
        {isFullscreen && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              exitFullscreen();
            }}
            className="absolute right-5 top-5 z-[70] inline-flex items-center gap-2 border border-museum-border/30 bg-museum-bg/95 px-4 py-2 text-xs uppercase tracking-[0.22em] text-museum-text shadow-[var(--shadow-card)] backdrop-blur transition hover:border-gold/70 hover:text-gold md:right-10 md:top-10"
            aria-label="Exit fullscreen (Esc)"
          >
            <span aria-hidden>✕</span>
            <span>Close · Esc</span>
          </button>
        )}

        {/* ----------------------------- Before/after splitter ----------------------------- */}
        {compareMode && (
          <>
            {/* Side labels — top corners. */}
            <div
              className="pointer-events-none absolute left-4 top-4 z-30 max-w-[42%] border-l-2 border-brick bg-museum-bg/85 px-3 py-2 backdrop-blur"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="folio text-brick">Counterfactual</p>
              <p className="mt-0.5 font-display text-sm leading-tight text-museum-text">
                If the 1965 Act hadn&apos;t passed
              </p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-museum-muted">
                ~{counterfactualTotalFor(year)}K · 1924 quotas continue
              </p>
            </div>
            <div
              className="pointer-events-none absolute right-4 top-[5.5rem] z-30 max-w-[42%] border-r-2 border-gold bg-museum-bg/85 px-3 py-2 text-right backdrop-blur"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="folio">Reality</p>
              <p className="mt-0.5 font-display text-sm leading-tight text-museum-text">
                What actually happened
              </p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-museum-muted">
                {formatThousands(yearData.total)} · Hart–Celler era
              </p>
            </div>

            {/* The dragger — vertical line + center handle. */}
            <div
              className="absolute inset-y-0 z-30 cursor-ew-resize"
              style={{ left: `${splitterPct}%`, width: 2, transform: "translateX(-1px)" }}
              role="separator"
              aria-orientation="vertical"
              aria-valuemin={5}
              aria-valuemax={95}
              aria-valuenow={Math.round(splitterPct)}
              aria-label="Drag to compare counterfactual and actual immigration"
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                // Snapshot the map container so we can convert mouse X to %.
                const container = (e.currentTarget as HTMLElement).parentElement;
                if (!container) return;
                const rect = container.getBoundingClientRect();
                const move = (ev: MouseEvent) => {
                  const pct = ((ev.clientX - rect.left) / rect.width) * 100;
                  setSplitterPct(Math.max(5, Math.min(95, pct)));
                };
                const up = () => {
                  document.removeEventListener("mousemove", move);
                  document.removeEventListener("mouseup", up);
                  document.body.style.cursor = "";
                  document.body.style.userSelect = "";
                };
                document.body.style.cursor = "ew-resize";
                document.body.style.userSelect = "none";
                document.addEventListener("mousemove", move);
                document.addEventListener("mouseup", up);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                const container = (e.currentTarget as HTMLElement).parentElement;
                if (!container) return;
                const rect = container.getBoundingClientRect();
                const move = (ev: TouchEvent) => {
                  if (!ev.touches[0]) return;
                  const pct = ((ev.touches[0].clientX - rect.left) / rect.width) * 100;
                  setSplitterPct(Math.max(5, Math.min(95, pct)));
                };
                const up = () => {
                  document.removeEventListener("touchmove", move);
                  document.removeEventListener("touchend", up);
                };
                document.addEventListener("touchmove", move, { passive: true });
                document.addEventListener("touchend", up);
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="absolute inset-y-0 left-1/2 block w-px -translate-x-1/2 bg-gold shadow-[0_0_16px_rgba(201,162,74,0.6)]" />
              {/* Center handle */}
              <span
                aria-hidden
                className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-gold bg-museum-bg/95 text-gold shadow-[0_0_0_4px_rgba(201,162,74,0.18),var(--shadow-card)] backdrop-blur"
              >
                <span className="font-mono text-lg leading-none">⇆</span>
              </span>
            </div>
          </>
        )}

        {/* ============== Fullscreen-only overlays ============== */}
        {/* All info lives in the BOTTOM panel — the top of the map (Russia,
            Canada, Greenland) stays completely clear except for the small
            close button at top-right. */}
        {isFullscreen && (
          <>

            {/* Bottom panel — single home for year/event readout + controls + scrubber. */}
            <div
              className="absolute inset-x-5 bottom-5 z-40 border border-museum-border/15 bg-museum-bg/85 px-5 py-4 backdrop-blur md:inset-x-10 md:bottom-10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top row: year + event + controls */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Live year + total + event headline */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`fs-ctx-${year}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -3 }}
                    transition={{ duration: 0.25 }}
                    className="flex min-w-0 flex-1 items-baseline gap-3"
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-museum-faint">
                      Year
                    </span>
                    <span className="font-display text-3xl leading-none text-museum-text">
                      {year}
                    </span>
                    <span className="border-l border-museum-border/25 pl-3 font-display text-lg leading-none text-gold">
                      {formatThousands(yearData.total)}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-museum-faint">
                      arrivals
                    </span>
                    {yearData.event && (
                      <span className="ml-3 hidden min-w-0 items-baseline gap-2 border-l-2 border-gold pl-3 md:flex">
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-museum-faint">
                          Event
                        </span>
                        <span className="truncate font-display text-sm leading-snug text-museum-text">
                          {yearData.event}
                        </span>
                      </span>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Replay controls */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={goPrev}
                    className="border border-museum-border/20 bg-museum-bg/70 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-museum-muted transition hover:border-gold/50 hover:text-gold disabled:opacity-40"
                    aria-label="Previous year"
                    disabled={year <= YEAR_MIN}
                  >
                    ‹ Prev
                  </button>
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="inline-flex items-center gap-2 border border-gold/50 bg-gold/[0.08] px-4 py-2 text-xs uppercase tracking-[0.22em] text-gold transition hover:border-gold hover:bg-gold/[0.16]"
                  >
                    <span aria-hidden className="text-base leading-none">{playing ? "❚❚" : "▶"}</span>
                    <span>{playing ? "Pause" : "Play"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="border border-museum-border/20 bg-museum-bg/70 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-museum-muted transition hover:border-gold/50 hover:text-gold disabled:opacity-40"
                    aria-label="Next year"
                    disabled={year >= YEAR_MAX}
                  >
                    Next ›
                  </button>
                </div>
              </div>

              {/* Scrubber track inside fullscreen panel */}
              <div className="relative mt-3 h-8">
                <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-museum-border/30" />
                {POST_1965_DATA.filter((d) => d.event).map((d) => {
                  const left = ((d.year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100;
                  return (
                    <button
                      key={`fs-tick-${d.year}`}
                      type="button"
                      onClick={() => onScrub(d.year)}
                      className="absolute top-1/2 z-[1] -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${left}%` }}
                      title={`${d.year}: ${d.event}`}
                      aria-label={`Jump to ${d.year}: ${d.event}`}
                    >
                      <span className="block h-3 w-px bg-gold/70 hover:bg-gold" />
                    </button>
                  );
                })}
                <motion.div
                  initial={false}
                  animate={{ left: `${progressPct}%` }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="pointer-events-none absolute top-1/2 z-[2] -translate-x-1/2 -translate-y-1/2"
                >
                  <span className="block h-5 w-[2px] bg-gold" />
                </motion.div>
                <input
                  type="range"
                  min={YEAR_MIN}
                  max={YEAR_MAX}
                  step={1}
                  value={year}
                  onChange={(e) => onScrub(Number(e.target.value))}
                  className="absolute inset-x-0 top-1/2 z-[3] h-8 w-full -translate-y-1/2 cursor-pointer appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-8 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:bg-gold [&::-webkit-slider-thumb]:shadow-[0_0_0_3px_rgba(201,162,74,0.22)] [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-2 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-sm [&::-moz-range-thumb]:bg-gold"
                  aria-label="Year"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Timeline scrubber — always rendered; browser hides during fullscreen. */}
      <div className="space-y-1.5">
        {/* Row 1 — era labels (their own band, no track behind them). */}
        <div className="relative h-4">
          {ERAS.map((era) => {
            const left = ((era.start - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100;
            const width = ((era.end - era.start) / (YEAR_MAX - YEAR_MIN)) * 100;
            const isCurrent = currentEra.label === era.label;
            return (
              <div
                key={era.label}
                className={`absolute top-0 truncate border-l border-museum-border/15 pl-1.5 text-[9px] uppercase tracking-[0.16em] transition ${
                  isCurrent ? "text-gold" : "text-museum-faint"
                }`}
                style={{ left: `${left}%`, width: `${width}%` }}
              >
                {era.label}
              </div>
            );
          })}
        </div>

        {/* Row 2 — the actual slider: track + event ticks + range thumb + playhead marker. */}
        <div className="relative h-8">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-museum-border/25" />
          {POST_1965_DATA.filter((d) => d.event).map((d) => {
            const left = ((d.year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100;
            return (
              <button
                key={`tick-${d.year}`}
                type="button"
                onClick={() => onScrub(d.year)}
                className="group absolute top-1/2 z-[1] -translate-x-1/2 -translate-y-1/2 transition"
                style={{ left: `${left}%` }}
                title={`${d.year}: ${d.event}`}
                aria-label={`Jump to ${d.year}: ${d.event}`}
              >
                <span className="block h-3 w-px bg-gold/70 group-hover:bg-gold group-hover:shadow-[0_0_8px_rgba(201,162,74,0.8)]" />
              </button>
            );
          })}
          {/* Playhead vertical bar — clearly indicates current year on the track. */}
          <motion.div
            initial={false}
            animate={{ left: `${progressPct}%` }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none absolute top-1/2 z-[2] -translate-x-1/2 -translate-y-1/2"
          >
            <span className="block h-5 w-[2px] bg-gold" />
          </motion.div>
          <input
            type="range"
            min={YEAR_MIN}
            max={YEAR_MAX}
            step={1}
            value={year}
            onChange={(e) => onScrub(Number(e.target.value))}
            className="absolute inset-x-0 top-1/2 z-[3] h-8 w-full -translate-y-1/2 cursor-pointer appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-8 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:bg-gold [&::-webkit-slider-thumb]:shadow-[0_0_0_3px_rgba(201,162,74,0.22)] [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-2 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-sm [&::-moz-range-thumb]:bg-gold"
            aria-label="Year"
          />
        </div>

        {/* Row 3 — moving year readout below the playhead, plus min/max anchors. */}
        <div className="relative h-5">
          <span className="absolute left-0 top-0 font-mono text-[10px] uppercase tracking-[0.22em] text-museum-muted">
            {YEAR_MIN}
          </span>
          <span className="absolute right-0 top-0 font-mono text-[10px] uppercase tracking-[0.22em] text-museum-muted">
            {YEAR_MAX}
          </span>
          <motion.div
            initial={false}
            animate={{ left: `${progressPct}%` }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none absolute top-0 -translate-x-1/2"
          >
            <span className="block font-mono text-[11px] text-gold">{year}</span>
          </motion.div>
        </div>

        <p className="pt-1 text-center text-[10px] uppercase tracking-[0.22em] text-museum-faint">
          Drag to scrub · click a tick for a key year
        </p>
      </div>

      {/* Composition chart — always rendered; browser hides during fullscreen. */}
      <CompositionChart year={year} onScrub={onScrub} />

      {/* Top sources + composition tables — always rendered; browser hides during fullscreen. */}
      <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
        <div className="border border-museum-border/12 bg-museum-surface/[0.03] p-4">
          <div className="flex items-center justify-between">
            <p className="folio">Top sources · {year}</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-museum-faint">
              Largest origin: <span className="text-museum-text">{yearData.sources[0]?.country}</span>
            </p>
          </div>
          <div className="mt-3 space-y-1.5">
            {yearData.sources.map((s) => {
              const max = Math.max(...yearData.sources.map((x) => x.count));
              const w = (s.count / max) * 100;
              return (
                <button
                  key={s.country}
                  type="button"
                  onMouseEnter={() => setHovered(s)}
                  onMouseLeave={() => setHovered(null)}
                  className="grid w-full grid-cols-[140px_1fr_70px] items-center gap-3 text-left"
                >
                  <span className="truncate text-sm text-museum-text">{s.country}</span>
                  <span className="relative h-2 overflow-hidden bg-museum-surface/[0.04]">
                    <motion.span
                      key={year + s.country}
                      initial={{ width: 0 }}
                      animate={{ width: `${w}%` }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-y-0 left-0 block"
                      style={{ background: REGION_COLOR[s.region] }}
                    />
                  </span>
                  <span className="text-right font-mono text-xs text-museum-muted">
                    {Math.round(s.count)}K
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border border-museum-border/12 bg-museum-surface/[0.03] p-4">
          <p className="folio">Composition</p>
          <div className="mt-3 space-y-2">
            {regionBreakdown.map(({ region, count }) => {
              const pct = (count / yearData.total) * 100;
              return (
                <div key={region}>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-museum-text">{regionLabel(region)}</span>
                    <span className="font-mono text-museum-muted">{pct.toFixed(0)}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden bg-museum-surface/[0.04]">
                    <motion.span
                      key={year + region}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                      className="block h-full"
                      style={{ background: REGION_COLOR[region] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-museum-faint">
            Leading region: <span className="text-museum-text">{regionLabel(topByRegion.region)}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
