import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import type { FeatureCollection } from "geojson";
import type { Topology } from "topojson-specification";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  resolvePlace,
  shortPlaceLabel,
  toGeoJsonPoint,
  type LatLng,
} from "@/lib/mapGeo";
import { useTheme } from "@/lib/theme";
import type { MigrationEvent } from "@/types";

// Leaflet pulls in `window`/`document` at import time, so this must be
// client-only.
const InsetMap = dynamic(() => import("./InsetMap"), { ssr: false });

function cssVar(name: string): string {
  if (typeof document === "undefined") return "0 0 0";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function rgb(name: string): string {
  return `rgb(${cssVar(name)})`;
}
function rgba(name: string, alpha: number): string {
  return `rgb(${cssVar(name)} / ${alpha})`;
}

type Props = {
  migrations: MigrationEvent[];
  /** LLM-geocoded coordinates for places not in the local dictionary. */
  extraCoords?: Record<string, LatLng>;
};

function makeResolver(extra?: Record<string, LatLng>) {
  return (place: string): LatLng | null => {
    if (extra) {
      const direct = extra[place];
      if (direct) return direct;
      const lower = place.toLowerCase();
      const ciKey = Object.keys(extra).find((k) => k.toLowerCase() === lower);
      if (ciKey) return extra[ciKey];
    }
    return resolvePlace(place);
  };
}

type StoryStep = {
  index: number;
  migration: MigrationEvent;
  from: LatLng;
  to?: LatLng | null;
  isPin: boolean;
};

// Colors resolved at render time from CSS variables so light mode adapts.
const COLOR_VAR = {
  route: "--museum-glow",
  dest: "--museum-violet",
  pin: "--museum-amber",
} as const;

const MAP_WIDTH = 1100;
const MAP_HEIGHT = 560;
const AUTOPLAY_MS = 6000;

function buildStorySteps(
  migrations: MigrationEvent[],
  resolver: (place: string) => LatLng | null
): StoryStep[] {
  const steps: StoryStep[] = [];
  migrations.forEach((m, idx) => {
    const from = resolver(m.from);
    if (!from) return;
    const to = m.to ? resolver(m.to) : null;
    const sameSpot = !to ||
      d3.geoDistance(toGeoJsonPoint(from), toGeoJsonPoint(to)) < 0.02;
    const isPin = m.kind === "pin" || sameSpot;
    steps.push({
      index: idx,
      migration: m,
      from,
      to: isPin ? null : to,
      isPin,
    });
  });
  // Chronological order, with year=0 (unknown) sinking to the bottom.
  return steps.sort((a, b) => {
    const ay = a.migration.year || 9999;
    const by = b.migration.year || 9999;
    return ay - by;
  });
}

function buildArcPath(
  projection: d3.GeoProjection,
  from: LatLng,
  to: LatLng
): string | null {
  const start = toGeoJsonPoint(from);
  const end = toGeoJsonPoint(to);
  const interpolate = d3.geoInterpolate(start, end);
  const points: [number, number][] = [];
  for (let i = 0; i <= 64; i++) {
    const t = i / 64;
    const coord = interpolate(t);
    const projected = projection(coord);
    if (!projected) continue;
    const lift = Math.sin(t * Math.PI) * 0.18;
    points.push([projected[0], projected[1] - lift * 90]);
  }
  if (points.length < 2) return null;
  return d3.line<[number, number]>().curve(d3.curveBasis)(points);
}

export default function MigrationMap({ migrations, extraCoords }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const worldGroupRef = useRef<SVGGElement | null>(null);
  const projectionRef = useRef<d3.GeoProjection | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(
    null
  );
  const elementsRef = useRef<
    Map<number, { kind: "route" | "pin"; group: SVGGElement; path?: SVGPathElement }>
  >(new Map());

  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const { resolved: theme } = useTheme();

  const resolver = useMemo(() => makeResolver(extraCoords), [extraCoords]);
  const steps = useMemo(
    () => buildStorySteps(migrations, resolver),
    [migrations, resolver]
  );

  // Reset story when migration set changes.
  useEffect(() => {
    setActiveStep(null);
    setIsPlaying(false);
  }, [migrations]);

  // Autoplay.
  useEffect(() => {
    if (!isPlaying || steps.length === 0) return;
    const t = setInterval(() => {
      setActiveStep((prev) => {
        if (prev === null) return steps[0].index;
        const currentPos = steps.findIndex((s) => s.index === prev);
        const nextPos = (currentPos + 1) % steps.length;
        return steps[nextPos].index;
      });
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [isPlaying, steps]);

  // Map render.
  useEffect(() => {
    if (!svgRef.current) return;
    let cancelled = false;
    let animFrame = 0;
    const particles: {
      el: d3.Selection<SVGCircleElement, unknown, null, undefined>;
      path: SVGPathElement;
      phase: number;
      stepIndex: number;
    }[] = [];

    async function render() {
      const [{ feature: topoFeature }, { default: worldAtlas }] =
        await Promise.all([
          import("topojson-client"),
          // 50m has visibly more border detail at the zoom levels the
          // life-story guide uses (~3–6×).
          import("world-atlas/countries-50m.json"),
        ]);

      if (cancelled || !svgRef.current) return;

      // Resolve theme-aware palette at render time.
      const ROUTE_COLOR = rgb(COLOR_VAR.route);
      const ROUTE_DEST = rgb(COLOR_VAR.dest);
      const PIN_COLOR = rgb(COLOR_VAR.pin);
      const ACTIVE_COLOR = rgb("--museum-text");
      const OCEAN_FROM = rgb("--map-ocean-from");
      const OCEAN_TO = rgb("--map-ocean-to");
      const LAND_FILL = rgb("--map-land");
      const GRATICULE = rgba("--map-graticule", 0.08);
      const LAND_STROKE = rgba("--map-border", 0.12);
      const LABEL_FILL = rgb("--museum-text");
      const LABEL_STROKE = rgba("--museum-bg", 0.85);
      const PIN_LABEL_FILL = rgb("--museum-amber");

      const width = MAP_WIDTH;
      const height = MAP_HEIGHT;
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();
      svg.attr("viewBox", `0 0 ${width} ${height}`);
      elementsRef.current.clear();

      const topology = worldAtlas as unknown as Topology;
      const countries = topoFeature(
        topology,
        topology.objects.countries
      ) as FeatureCollection;

      const projection = d3
        .geoNaturalEarth1()
        .precision(0.1)
        .fitExtent(
          [
            [40, 40],
            [width - 40, height - 60],
          ],
          countries
        );
      projectionRef.current = projection;
      const path = d3.geoPath().projection(projection);

      const defs = svg.append("defs");

      const oceanGrad = defs
        .append("radialGradient")
        .attr("id", "ocean-grad")
        .attr("cx", "50%")
        .attr("cy", "42%")
        .attr("r", "75%");
      oceanGrad.append("stop").attr("offset", "0%").attr("stop-color", OCEAN_FROM);
      oceanGrad.append("stop").attr("offset", "100%").attr("stop-color", OCEAN_TO);

      const glow = defs.append("filter").attr("id", "soft-glow");
      glow.append("feGaussianBlur").attr("stdDeviation", "2.5").attr("result", "blur");
      const merge = glow.append("feMerge");
      merge.append("feMergeNode").attr("in", "blur");
      merge.append("feMergeNode").attr("in", "SourceGraphic");

      const activeGlow = defs.append("filter").attr("id", "active-glow");
      activeGlow.append("feGaussianBlur").attr("stdDeviation", "5").attr("result", "blur");
      const activeMerge = activeGlow.append("feMerge");
      activeMerge.append("feMergeNode").attr("in", "blur");
      activeMerge.append("feMergeNode").attr("in", "SourceGraphic");

      const routeGrad = defs
        .append("linearGradient")
        .attr("id", "route-grad")
        .attr("gradientUnits", "userSpaceOnUse");
      routeGrad.append("stop").attr("offset", "0%").attr("stop-color", ROUTE_COLOR).attr("stop-opacity", 0.0);
      routeGrad.append("stop").attr("offset", "30%").attr("stop-color", ROUTE_COLOR).attr("stop-opacity", 1.0);
      routeGrad.append("stop").attr("offset", "100%").attr("stop-color", ROUTE_DEST).attr("stop-opacity", 1.0);

      svg
        .append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "url(#ocean-grad)");

      // IMPORTANT: do NOT set transform-origin here. Modern browsers honor
      // CSS transform-origin for the SVG `transform` attribute, which would
      // re-anchor scale() around the world group's bounding-box center and
      // throw off the math in the active-step pan/zoom effect by
      // (width/2, height/2) * (scale - 1) pixels — pushing the camera into
      // the south Pacific instead of, say, Warsaw.
      const world = svg.append("g").attr("class", "world");
      worldGroupRef.current = world.node();

      // d3-zoom: lets the user drag-to-pan and wheel-to-zoom. The chapter
      // pan/zoom effect uses the SAME zoom behavior (svg.call(zoom.transform))
      // so the user's manual position is the new starting point for any
      // subsequent gesture — no jarring jumps back to identity.
      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([1, 16])
        .translateExtent([
          [0, 0],
          [width, height],
        ])
        .on("zoom", (event) => {
          world.attr("transform", event.transform.toString());
        });
      zoomBehaviorRef.current = zoom;
      svg
        .call(zoom)
        .on("dblclick.zoom", null) // dbl-click would zoom in by default; we prefer not to
        .style("touch-action", "none")
        .style("cursor", "grab");
      // Distinguish grab vs. grabbing cursor while a drag is in flight.
      svg.on("pointerdown", () => svg.style("cursor", "grabbing"));
      svg.on("pointerup pointerleave", () => svg.style("cursor", "grab"));

      const graticule = d3.geoGraticule10();
      world
        .append("path")
        .datum(graticule)
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", GRATICULE)
        .attr("stroke-width", 0.4);

      world
        .append("g")
        .attr("class", "land")
        .selectAll("path")
        .data(countries.features)
        .join("path")
        .attr("d", path)
        .attr("fill", LAND_FILL)
        .attr("stroke", LAND_STROKE)
        .attr("stroke-width", 0.4);

      const layer = world.append("g").attr("class", "events");

      const stepsLocal = buildStorySteps(migrations, resolver);

      stepsLocal.forEach((step, ordinal) => {
        if (step.isPin) {
          const pt = projection(toGeoJsonPoint(step.from));
          if (!pt) return;
          const g = layer.append("g").attr("opacity", 0).style("cursor", "pointer");
          g.transition()
            .delay(ordinal * 120)
            .duration(450)
            .attr("opacity", 1);

          g.append("circle")
            .attr("class", "halo")
            .attr("cx", pt[0])
            .attr("cy", pt[1])
            .attr("r", 14)
            .attr("fill", PIN_COLOR)
            .attr("fill-opacity", 0.1);
          g.append("circle")
            .attr("class", "ring")
            .attr("cx", pt[0])
            .attr("cy", pt[1])
            .attr("r", 7)
            .attr("fill", PIN_COLOR)
            .attr("fill-opacity", 0.22);
          g.append("circle")
            .attr("class", "dot")
            .attr("cx", pt[0])
            .attr("cy", pt[1])
            .attr("r", 3)
            .attr("fill", PIN_COLOR)
            .attr("stroke", "#fff")
            .attr("stroke-width", 1)
            .attr("filter", "url(#soft-glow)");

          const placeAbove = pt[1] > height / 2;
          g.append("text")
            .attr("class", "label")
            .attr("x", pt[0])
            .attr("y", pt[1] + (placeAbove ? -14 : 20))
            .attr("text-anchor", "middle")
            .attr("fill", PIN_LABEL_FILL)
            .attr("font-size", 11)
            .attr("font-family", "Inter, sans-serif")
            .attr("font-weight", 500)
            .attr("paint-order", "stroke")
            .attr("stroke", LABEL_STROKE)
            .attr("stroke-width", 3)
            .text(shortPlaceLabel(step.migration.from));

          g.on("click", () => setActiveStep(step.index));
          g.on("mouseenter", () => setActiveStep(step.index));

          elementsRef.current.set(step.index, {
            kind: "pin",
            group: g.node() as SVGGElement,
          });
        } else if (step.to) {
          const d = buildArcPath(projection, step.from, step.to);
          if (!d) return;

          const g = layer.append("g");
          const pathNode = g
            .append("path")
            .attr("class", "arc")
            .attr("d", d)
            .attr("fill", "none")
            .attr("stroke", "url(#route-grad)")
            .attr("stroke-width", 2)
            .attr("stroke-linecap", "round")
            .attr("opacity", 0);

          const len = (pathNode.node() as SVGPathElement).getTotalLength();
          pathNode
            .attr("stroke-dasharray", `${len} ${len}`)
            .attr("stroke-dashoffset", len)
            .transition()
            .delay(ordinal * 240)
            .duration(2000)
            .ease(d3.easeCubicOut)
            .attr("stroke-dashoffset", 0)
            .attr("opacity", 0.85);

          const hit = g
            .append("path")
            .attr("d", d)
            .attr("fill", "none")
            .attr("stroke", "transparent")
            .attr("stroke-width", 16)
            .style("cursor", "pointer");

          const pathEl = pathNode.node() as SVGPathElement;
          const particle = g
            .append("circle")
            .attr("class", "particle")
            .attr("r", 3)
            .attr("fill", ACTIVE_COLOR)
            .attr("filter", "url(#soft-glow)")
            .attr("opacity", 0);

          particle
            .transition()
            .delay(ordinal * 240 + 400)
            .duration(300)
            .attr("opacity", 0.9);

          particles.push({
            el: particle,
            path: pathEl,
            phase: ordinal * 0.4,
            stepIndex: step.index,
          });

          [
            { coord: step.from, color: ROUTE_COLOR, label: step.migration.from },
            { coord: step.to, color: ROUTE_DEST, label: step.migration.to },
          ].forEach((p, j) => {
            const pt = projection(toGeoJsonPoint(p.coord));
            if (!pt) return;
            const pinG = g.append("g").attr("opacity", 0);
            pinG.transition()
              .delay(ordinal * 240 + j * 200)
              .duration(500)
              .attr("opacity", 1);

            pinG.append("circle")
              .attr("cx", pt[0])
              .attr("cy", pt[1])
              .attr("r", 5)
              .attr("fill", p.color)
              .attr("fill-opacity", 0.18);
            pinG.append("circle")
              .attr("cx", pt[0])
              .attr("cy", pt[1])
              .attr("r", 2.5)
              .attr("fill", p.color)
              .attr("stroke", "#fff")
              .attr("stroke-width", 1);

            const placeAbove = pt[1] > height / 2;
            pinG.append("text")
              .attr("x", pt[0])
              .attr("y", pt[1] + (placeAbove ? -10 : 16))
              .attr("text-anchor", "middle")
              .attr("fill", LABEL_FILL)
              .attr("font-size", 11)
              .attr("font-family", "Inter, sans-serif")
              .attr("font-weight", 500)
              .attr("paint-order", "stroke")
              .attr("stroke", LABEL_STROKE)
              .attr("stroke-width", 3)
              .text(shortPlaceLabel(p.label));
          });

          hit.on("click", () => setActiveStep(step.index));
          hit.on("mouseenter", () => setActiveStep(step.index));

          elementsRef.current.set(step.index, {
            kind: "route",
            group: g.node() as SVGGElement,
            path: pathEl,
          });
        }
      });

      const startTime = performance.now();
      const tick = (now: number) => {
        if (cancelled) return;
        const elapsed = (now - startTime) / 1000;
        particles.forEach(({ el, path, phase }) => {
          const len = path.getTotalLength();
          if (!len) return;
          const t = ((elapsed + phase) % 4) / 4;
          const pt = path.getPointAtLength(t * len);
          el.attr("cx", pt.x).attr("cy", pt.y);
          el.attr("opacity", Math.sin(t * Math.PI) * 0.9);
        });
        animFrame = requestAnimationFrame(tick);
      };
      animFrame = requestAnimationFrame(tick);
    }

    render();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animFrame);
    };
  }, [migrations, resolver, theme]);

  // Pan + zoom + highlight on active step change.
  useEffect(() => {
    const world = worldGroupRef.current;
    const projection = projectionRef.current;
    const zoom = zoomBehaviorRef.current;
    const svgEl = svgRef.current;
    if (!world || !projection || !zoom || !svgEl) return;

    const svgSel = d3.select(svgEl);
    const elements = elementsRef.current;

    // Dim all events.
    elements.forEach((el) => {
      d3.select(el.group)
        .transition()
        .duration(400)
        .style("opacity", activeStep === null ? 1 : 0.3);
    });

    if (activeStep === null) {
      // Reset to full view — via the zoom behavior so internal state stays in sync.
      svgSel
        .transition()
        .duration(900)
        .ease(d3.easeCubicInOut)
        .call(zoom.transform, d3.zoomIdentity);
      return;
    }

    const el = elements.get(activeStep);
    if (!el) return;

    // Highlight active.
    d3.select(el.group)
      .transition()
      .duration(400)
      .style("opacity", 1);

    if (el.kind === "route" && el.path) {
      d3.select(el.path)
        .transition()
        .duration(400)
        .attr("stroke-width", 3.5)
        .attr("filter", "url(#active-glow)");
    } else {
      d3.select(el.group)
        .select(".halo")
        .transition()
        .duration(400)
        .attr("r", 22)
        .attr("fill-opacity", 0.25);
      d3.select(el.group)
        .select(".ring")
        .transition()
        .duration(400)
        .attr("r", 10);
    }

    // Compute the focus point for pan/zoom.
    const step = steps.find((s) => s.index === activeStep);
    if (!step) return;
    const fromPt = projection(toGeoJsonPoint(step.from));
    const toPt = step.to ? projection(toGeoJsonPoint(step.to)) : null;
    if (!fromPt) return;
    const cx = toPt ? (fromPt[0] + toPt[0]) / 2 : fromPt[0];
    const cy = toPt ? (fromPt[1] + toPt[1]) / 2 : fromPt[1];

    // Zoom in further when the place is a pin (we're staring at one city);
    // zoom out somewhat for routes so both endpoints stay in frame. Bias the
    // center slightly upward so the bottom-docked guide panel doesn't cover
    // the actual point.
    const scale = step.isPin ? 5.5 : 3.2;
    const viewCx = MAP_WIDTH / 2;
    const viewCy = MAP_HEIGHT * 0.42; // a bit above true center
    const tx = viewCx - cx * scale;
    const ty = viewCy - cy * scale;

    // Route through d3-zoom so subsequent manual drags start from this
    // position, not from identity.
    svgSel
      .transition()
      .duration(1100)
      .ease(d3.easeCubicInOut)
      .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));

    return () => {
      // Reset visual highlights when leaving this step.
      elements.forEach((maybe) => {
        if (maybe.kind === "route" && maybe.path) {
          d3.select(maybe.path)
            .interrupt()
            .attr("stroke-width", 2)
            .attr("filter", null);
        }
      });
      const cur = elements.get(activeStep);
      if (cur?.kind === "pin") {
        d3.select(cur.group).select(".halo").interrupt().attr("r", 14).attr("fill-opacity", 0.1);
        d3.select(cur.group).select(".ring").interrupt().attr("r", 7);
      }
    };
  }, [activeStep, steps]);

  const hasAnything = steps.length > 0;
  const activeStepObj = activeStep !== null
    ? steps.find((s) => s.index === activeStep) ?? null
    : null;
  const activePos = activeStepObj
    ? steps.findIndex((s) => s.index === activeStep)
    : -1;

  const goPrev = useCallback(() => {
    if (steps.length === 0) return;
    if (activePos <= 0) {
      setActiveStep(steps[steps.length - 1].index);
    } else {
      setActiveStep(steps[activePos - 1].index);
    }
  }, [steps, activePos]);

  const goNext = useCallback(() => {
    if (steps.length === 0) return;
    if (activePos === -1) {
      setActiveStep(steps[0].index);
    } else {
      setActiveStep(steps[(activePos + 1) % steps.length].index);
    }
  }, [steps, activePos]);

  const togglePlay = useCallback(() => {
    if (steps.length === 0) return;
    if (activeStep === null) {
      setActiveStep(steps[0].index);
    }
    setIsPlaying((p) => !p);
  }, [steps, activeStep]);

  const stopStory = useCallback(() => {
    setIsPlaying(false);
    setActiveStep(null);
  }, []);

  // Programmatic zoom helpers — used by the on-canvas +/− and reset buttons.
  const zoomBy = useCallback((factor: number) => {
    const zoom = zoomBehaviorRef.current;
    const svgEl = svgRef.current;
    if (!zoom || !svgEl) return;
    d3.select(svgEl)
      .transition()
      .duration(350)
      .ease(d3.easeCubicInOut)
      .call(zoom.scaleBy, factor);
  }, []);

  const resetView = useCallback(() => {
    const zoom = zoomBehaviorRef.current;
    const svgEl = svgRef.current;
    if (!zoom || !svgEl) return;
    setActiveStep(null);
    d3.select(svgEl)
      .transition()
      .duration(700)
      .ease(d3.easeCubicInOut)
      .call(zoom.transform, d3.zoomIdentity);
  }, []);

  return (
    <div className="space-y-3">
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative w-full overflow-hidden rounded-none border border-museum-border/[0.12] bg-museum-bg-soft/40 shadow-[var(--shadow-card)]"
      >
        <svg
          ref={svgRef}
          viewBox="0 0 1100 560"
          className="block h-auto w-full"
          role="img"
          aria-label="World map showing places and migration routes for this family"
        />

        {!hasAnything && (
          <p className="absolute inset-0 flex items-center justify-center text-museum-muted">
            No geographic data available for this person.
          </p>
        )}

        {/* Legend pill */}
        <div className="absolute right-4 top-4 flex flex-col gap-1.5 rounded-lg border border-museum-border/10 bg-museum-bg/70 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-museum-muted backdrop-blur">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-gold" />
            Migration route
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-gold" />
            Place of life
          </span>
        </div>

        {/* Pan / zoom controls */}
        <div className="absolute right-4 bottom-4 z-20 flex flex-col items-stretch border border-museum-border/15 bg-museum-bg/85 backdrop-blur">
          <button
            type="button"
            onClick={() => zoomBy(1.5)}
            className="flex h-9 w-9 items-center justify-center border-b border-museum-border/15 text-lg text-museum-muted transition hover:bg-museum-surface/[0.06] hover:text-gold focus:outline-none focus:ring-1 focus:ring-gold/40"
            aria-label="Zoom in"
            title="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => zoomBy(1 / 1.5)}
            className="flex h-9 w-9 items-center justify-center border-b border-museum-border/15 text-lg text-museum-muted transition hover:bg-museum-surface/[0.06] hover:text-gold focus:outline-none focus:ring-1 focus:ring-gold/40"
            aria-label="Zoom out"
            title="Zoom out"
          >
            −
          </button>
          <button
            type="button"
            onClick={resetView}
            className="flex h-9 w-9 items-center justify-center text-[9px] uppercase tracking-[0.18em] text-museum-muted transition hover:bg-museum-surface/[0.06] hover:text-gold focus:outline-none focus:ring-1 focus:ring-gold/40"
            aria-label="Reset view"
            title="Reset view"
          >
            Reset
          </button>
        </div>

        {/* Gesture hint — only when nothing is active so it doesn't clutter the story view */}
        {hasAnything && activeStep === null && (
          <div className="pointer-events-none absolute bottom-4 left-4 z-10 text-[10px] uppercase tracking-[0.22em] text-museum-faint">
            Drag to pan · scroll to zoom
          </div>
        )}

        {/* Top-left life-story affordance when idle */}
        {hasAnything && activeStep === null && (
          <button
            type="button"
            onClick={togglePlay}
            className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-museum-bg/70 px-4 py-2 text-xs uppercase tracking-[0.25em] text-glow backdrop-blur transition hover:border-gold hover:bg-gold/[0.08]"
          >
            <span
              aria-hidden
              className="flex h-5 w-5 items-center justify-center rounded-full bg-gold/20 text-glow"
            >
              ▶
            </span>
            Play life story · {steps.length} chapter{steps.length === 1 ? "" : "s"}
          </button>
        )}

        {/* Story guide panel */}
        <AnimatePresence>
          {activeStepObj && (
            <motion.div
              key="guide"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-3 bottom-3 z-10 overflow-hidden rounded-none border border-museum-border/10 bg-museum-bg/85 shadow-[0_24px_64px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl md:inset-x-5 md:bottom-5"
            >
              {/* Progress bar */}
              <div className="h-px w-full bg-museum-surface/[0.06]">
                <motion.div
                  key={`${activeStep}-${isPlaying}`}
                  initial={{ width: isPlaying ? "0%" : "100%" }}
                  animate={{ width: isPlaying ? "100%" : "100%" }}
                  transition={{
                    duration: isPlaying ? AUTOPLAY_MS / 1000 : 0,
                    ease: "linear",
                  }}
                  className="h-px bg-gradient-to-r from-gold via-gold to-brick"
                />
              </div>

              <div className="grid gap-4 p-5 md:grid-cols-[auto_1fr_auto] md:gap-6 md:p-6">
                {(() => {
                  const fromPlace = activeStepObj.migration.from;
                  const toPlace = activeStepObj.migration.to;
                  const fromCoord = resolver(fromPlace);
                  const toCoord = !activeStepObj.isPin && toPlace
                    ? resolver(toPlace)
                    : null;
                  const width = activeStepObj.migration.image
                    ? "w-48 md:w-56"
                    : "w-56 md:w-72";
                  return (
                    <div className="flex shrink-0 flex-col gap-2">
                      {/* Photo crossfades on chapter change */}
                      <AnimatePresence mode="wait">
                        {activeStepObj.migration.image && (
                          <motion.a
                            key={`${activeStep}-img`}
                            href={activeStepObj.migration.image.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="group relative block h-32 w-48 shrink-0 overflow-hidden rounded-lg border border-museum-border/10 bg-museum-bg-soft md:h-32 md:w-56"
                            title={activeStepObj.migration.image.caption ?? ""}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={activeStepObj.migration.image.url}
                              alt={activeStepObj.migration.image.caption ?? "Chapter image"}
                              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-museum-bg/95 to-transparent px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-museum-muted">
                              {activeStepObj.migration.image.credit ?? "Wikipedia"}
                            </div>
                          </motion.a>
                        )}
                      </AnimatePresence>
                      {/* InsetMap PERSISTS across chapters — only its props change.
                          This avoids the Leaflet "0×0 container at mount → Africa
                          default" failure mode that happens when AnimatePresence
                          remounts the Leaflet container before layout completes. */}
                      {fromCoord && (
                        <div className={`${width} shrink-0`}>
                          <InsetMap
                            height={activeStepObj.migration.image ? 140 : 200}
                            {...(toCoord
                              ? {
                                  route: {
                                    from: { ...fromCoord, label: shortPlaceLabel(fromPlace) },
                                    to: { ...toCoord, label: shortPlaceLabel(toPlace) },
                                  },
                                }
                              : {
                                  point: {
                                    ...fromCoord,
                                    label: shortPlaceLabel(fromPlace),
                                  },
                                })}
                          />
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="min-w-0">
                  <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.25em] text-museum-muted">
                    <span className="text-glow">
                      Chapter {activePos + 1} of {steps.length}
                    </span>
                    {activeStepObj.migration.year > 0 && (
                      <>
                        <span className="text-museum-text/20">·</span>
                        <span className="font-mono text-museum-text">
                          {activeStepObj.migration.year}
                        </span>
                      </>
                    )}
                    <span className="text-museum-text/20">·</span>
                    <span
                      className={
                        activeStepObj.isPin
                          ? "text-accent-amber"
                          : "text-glow"
                      }
                    >
                      {activeStepObj.isPin ? "Place" : "Migration"}
                    </span>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeStep}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.25 }}
                    >
                      <h3 className="mt-2 font-display text-2xl leading-tight text-museum-text">
                        {activeStepObj.migration.label ??
                          (activeStepObj.isPin
                            ? activeStepObj.migration.from
                            : `${shortPlaceLabel(activeStepObj.migration.from)} → ${shortPlaceLabel(activeStepObj.migration.to)}`)}
                      </h3>
                      {activeStepObj.migration.source && (
                        <p className="mt-2 max-w-prose text-sm leading-relaxed text-museum-muted">
                          {activeStepObj.migration.source}
                        </p>
                      )}
                      <p className="mt-2 font-mono text-xs text-museum-muted/80">
                        {activeStepObj.isPin
                          ? activeStepObj.migration.from
                          : `${activeStepObj.migration.from}  →  ${activeStepObj.migration.to}`}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={goPrev}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-museum-border/15 bg-museum-surface/[0.04] text-museum-muted transition hover:border-gold/40 hover:bg-museum-surface/[0.08] hover:text-museum-text"
                      aria-label="Previous chapter"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 bg-gold/[0.1] text-glow transition hover:border-gold hover:bg-gold/[0.18]"
                      aria-label={isPlaying ? "Pause autoplay" : "Play autoplay"}
                    >
                      {isPlaying ? "❚❚" : "▶"}
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-museum-border/15 bg-museum-surface/[0.04] text-museum-muted transition hover:border-gold/40 hover:bg-museum-surface/[0.08] hover:text-museum-text"
                      aria-label="Next chapter"
                    >
                      ›
                    </button>
                    <button
                      type="button"
                      onClick={stopStory}
                      className="ml-1 rounded-full border border-museum-border/10 bg-museum-surface/[0.02] px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-museum-muted transition hover:border-museum-border/30 hover:text-museum-text"
                      aria-label="Exit story"
                    >
                      Exit
                    </button>
                  </div>

                  {/* Stepper dots */}
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {steps.map((s, i) => {
                      const isActive = s.index === activeStep;
                      return (
                        <button
                          key={s.index}
                          type="button"
                          onClick={() => setActiveStep(s.index)}
                          className={`group relative h-2.5 transition-all ${
                            isActive ? "w-6" : "w-2.5"
                          }`}
                          aria-label={`Go to chapter ${i + 1}: ${s.migration.label ?? s.migration.from}`}
                        >
                          <span
                            className={`block h-full w-full rounded-full transition ${
                              isActive
                                ? s.isPin
                                  ? "bg-gold"
                                  : "bg-gold"
                                : s.isPin
                                  ? "bg-gold/30 group-hover:bg-gold/60"
                                  : "bg-gold/30 group-hover:bg-gold/60"
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Chronological event chips below the map */}
      {hasAnything && (
        <div className="flex flex-wrap gap-1.5 text-xs">
          {steps.map((s, i) => {
            const m = s.migration;
            const active = activeStep === s.index;
            return (
              <button
                key={`${m.year}-${m.from}-${m.to}-${s.index}`}
                type="button"
                onMouseEnter={() => setActiveStep(s.index)}
                onClick={() => setActiveStep(s.index)}
                className={`group flex items-center gap-1.5 rounded-lg border px-2.5 py-1 transition ${
                  active
                    ? s.isPin
                      ? "border-gold/50 bg-gold/[0.08]"
                      : "border-gold/50 bg-gold/[0.08]"
                    : "border-museum-border/10 bg-museum-surface/[0.03] hover:border-museum-border/20"
                }`}
                title={m.label ?? m.source ?? ""}
                aria-label={`Chapter ${i + 1}`}
              >
                <span
                  aria-hidden
                  className={`h-1.5 w-1.5 rounded-full ${
                    s.isPin ? "bg-gold" : "bg-gold"
                  }`}
                />
                {m.year > 0 && (
                  <>
                    <span className="font-mono text-glow">{m.year}</span>
                    <span className="text-museum-muted">·</span>
                  </>
                )}
                <span className="text-museum-text">
                  {shortPlaceLabel(m.from)}
                </span>
                {!s.isPin && m.to && (
                  <>
                    <span className="text-glow/70">→</span>
                    <span className="text-museum-text">
                      {shortPlaceLabel(m.to)}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
