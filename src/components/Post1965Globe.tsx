import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import type { FeatureCollection } from "geojson";
import type { Topology } from "topojson-specification";
import { motion, AnimatePresence } from "framer-motion";
import {
  COUNTRY_COORDS,
  GATEWAYS,
  getYear,
  regionLabel,
  supplementalFlowsForYear,
  type Region,
  type SourceFlow,
} from "@/data/post-1965-flows";

// ============================================================================
// The Living Globe — a 3D orthographic projection of the post-1965 data. The
// same corridors you've been watching on the flat map are now great-circle
// arcs draped over a rotating Earth. Planes carry actual (lng, lat) trajec-
// tories; we re-project them every frame so they smoothly disappear behind
// the curve of the globe and reappear on the far side as the planet spins.
// ============================================================================

const W = 900;
const H = 900;
const RADIUS = 360;
const SAMPLE_COUNT = 64;

const PLANE_PATH =
  "M0 -8 L1 -2 L8 2 L8 3.5 L1 2.6 L0.6 7 L2.5 9 L2.5 10 L-2.5 10 L-2.5 9 L-0.6 7 L-1 2.6 L-8 3.5 L-8 2 L-1 -2 Z";

const REGION_COLOR: Record<Region, string> = {
  "latin-america": "#C9A24A",
  "asia":          "#D87B4A",
  "europe":        "#9FB1C2",
  "africa":        "#7FA67F",
  "caribbean":     "#E8B14A",
  "north-america": "#B8A285",
  "middle-east":   "#B36E8A",
  "oceania":       "#6B8FAA",
};

type Plane = {
  /** Pre-sampled [lng0, lat0, lng1, lat1, ...] in spherical coords. We
   *  re-project on every frame so the plane follows whatever rotation
   *  the user has dragged the globe to. */
  ll: Float32Array;
  sampleCount: number;
  phase: number;
  speed: number;
  flow: SourceFlow;
  planeNode: SVGGElement;
  color: string;
};

type ArcDatum = { type: "LineString"; coordinates: [number, number][] };

type Props = {
  /** Year to render. Globe state is controlled by the parent so the flat-map
   *  scrubber and play button drive both views simultaneously. */
  year: number;
};

export default function Post1965Globe({ year }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const projectionRef = useRef<d3.GeoProjection | null>(null);
  const pathFnRef = useRef<d3.GeoPath | null>(null);
  const rotationRef = useRef<[number, number, number]>([-95, -20, 0]);
  // d3 selections — typed loosely (any) because their datums differ
  // (graticule = MultiLineString, land = FeatureCollection, US = Feature).
  // The selections are only used to call `.attr("d", path)` so the strict
  // datum type doesn't earn us anything here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const landSelRef = useRef<d3.Selection<SVGPathElement, any, any, any> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graticuleSelRef = useRef<d3.Selection<SVGPathElement, any, any, any> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usaSelRef = useRef<d3.Selection<SVGPathElement, any, any, any> | null>(null);
  const arcsLayerRef = useRef<SVGGElement | null>(null);
  const planesLayerRef = useRef<SVGGElement | null>(null);
  const planesRef = useRef<Plane[]>([]);
  const animRef = useRef(0);
  const dragActiveRef = useRef(false);
  const autoRotateRef = useRef(true);
  const renderedRef = useRef(false);

  const [autoRotate, setAutoRotate] = useState(true);
  const [hovered, setHovered] = useState<SourceFlow | null>(null);

  // Keep refs synced so the RAF can read latest values without restarting.
  useEffect(() => { autoRotateRef.current = autoRotate; }, [autoRotate]);

  const yearData = useMemo(() => getYear(year), [year]);
  // Combined corridor list — the top-N headline sources for the year PLUS
  // the long-tail supplemental flows (Pakistan, Iran, Colombia, Nigeria,
  // Greece in 1965, etc.). Without these, early years like 1965 looked
  // sparse — only the headline 8 corridors had planes. Now every active
  // corridor for the year is in flight.
  const flows = useMemo(() => {
    const seen = new Set<string>();
    const combined: SourceFlow[] = [];
    for (const f of yearData.sources) {
      const k = `${f.country}__${f.gateway}`;
      seen.add(k);
      combined.push(f);
    }
    for (const f of supplementalFlowsForYear(year)) {
      const k = `${f.country}__${f.gateway}`;
      if (!seen.has(k)) {
        seen.add(k);
        combined.push(f);
      }
    }
    return combined;
  }, [yearData, year]);

  // -------------------------------------------------------------------------
  // World render (mount).
  // -------------------------------------------------------------------------
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

      const topo = worldAtlas as unknown as Topology;
      const countries = topoFeature(topo, topo.objects.countries) as FeatureCollection;

      const projection = d3
        .geoOrthographic()
        .scale(RADIUS)
        .translate([W / 2, H / 2])
        .rotate(rotationRef.current)
        .clipAngle(90);
      projectionRef.current = projection;

      const path = d3.geoPath().projection(projection);
      pathFnRef.current = path;

      const defs = svg.append("defs");

      // Deep-space radial — darker at the edges than at the disc center, so
      // the planet feels lit from a point source.
      const oceanGrad = defs
        .append("radialGradient")
        .attr("id", "globe-ocean")
        .attr("cx", "38%").attr("cy", "32%").attr("r", "65%");
      oceanGrad.append("stop").attr("offset", "0%").attr("stop-color", "rgb(38, 56, 84)");
      oceanGrad.append("stop").attr("offset", "60%").attr("stop-color", "rgb(20, 30, 48)");
      oceanGrad.append("stop").attr("offset", "100%").attr("stop-color", "rgb(8, 14, 26)");

      // Soft halo around the globe — gives it presence in space.
      const haloGrad = defs
        .append("radialGradient")
        .attr("id", "globe-halo")
        .attr("cx", "50%").attr("cy", "50%").attr("r", "50%");
      haloGrad.append("stop").attr("offset", "60%").attr("stop-color", "rgba(201, 162, 74, 0)");
      haloGrad.append("stop").attr("offset", "82%").attr("stop-color", "rgba(201, 162, 74, 0.10)");
      haloGrad.append("stop").attr("offset", "100%").attr("stop-color", "rgba(201, 162, 74, 0)");

      const glow = defs
        .append("filter").attr("id", "globe-glow")
        .attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
      glow.append("feGaussianBlur").attr("stdDeviation", 3).attr("result", "blur");
      const m = glow.append("feMerge");
      m.append("feMergeNode").attr("in", "blur");
      m.append("feMergeNode").attr("in", "SourceGraphic");

      // Star field (outside the disc).
      const stars = svg.append("g").attr("class", "stars");
      for (let i = 0; i < 260; i++) {
        const cx = Math.random() * W;
        const cy = Math.random() * H;
        const dist = Math.hypot(cx - W / 2, cy - H / 2);
        if (dist < RADIUS + 22) continue;
        const r = Math.random() * 1.4 + 0.25;
        const o = 0.25 + Math.random() * 0.55;
        stars
          .append("circle")
          .attr("cx", cx).attr("cy", cy)
          .attr("r", r)
          .attr("fill", `rgba(255, 255, 255, ${o.toFixed(2)})`);
      }

      // Atmospheric halo — drawn as a slightly larger circle behind the disc.
      svg.append("circle")
        .attr("cx", W / 2).attr("cy", H / 2)
        .attr("r", RADIUS + 28)
        .attr("fill", "url(#globe-halo)");

      // The disc / ocean.
      svg.append("circle")
        .attr("cx", W / 2).attr("cy", H / 2)
        .attr("r", RADIUS)
        .attr("fill", "url(#globe-ocean)");

      // Graticule.
      const graticule = d3.geoGraticule10();
      graticuleSelRef.current = svg
        .append("path")
        .datum(graticule)
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", "rgba(255,255,255,0.05)")
        .attr("stroke-width", 0.5) as unknown as d3.Selection<SVGPathElement, unknown, null, undefined>;

      // Land.
      landSelRef.current = svg
        .append("g")
        .attr("class", "land")
        .selectAll("path")
        .data(countries.features)
        .join("path")
        .attr("d", path)
        .attr("fill", "rgb(var(--map-land))")
        .attr("stroke", "rgba(255,255,255,0.07)")
        .attr("stroke-width", 0.4) as unknown as d3.Selection<SVGPathElement, unknown, null, undefined>;

      // Highlight the U.S.
      const usa = countries.features.find((f) => (f as { id?: string }).id === "840");
      if (usa) {
        usaSelRef.current = svg
          .append("path")
          .datum(usa)
          .attr("class", "usa-highlight")
          .attr("d", path)
          .attr("fill", "rgba(201, 162, 74, 0.16)")
          .attr("stroke", "rgba(201, 162, 74, 0.55)")
          .attr("stroke-width", 0.8) as unknown as d3.Selection<SVGPathElement, unknown, null, undefined>;
      }

      // Layers for arcs and planes.
      arcsLayerRef.current = svg.append("g").attr("class", "arcs").node();
      planesLayerRef.current = svg.append("g").attr("class", "planes").node();

      // Sphere outline (front edge of disc) — drawn last so it sits on top.
      svg.append("circle")
        .attr("cx", W / 2).attr("cy", H / 2)
        .attr("r", RADIUS)
        .attr("fill", "none")
        .attr("stroke", "rgba(201, 162, 74, 0.35)")
        .attr("stroke-width", 1)
        .attr("pointer-events", "none");

      // Drag-to-rotate. Same gesture as Google Earth.
      const drag = d3
        .drag<SVGSVGElement, unknown>()
        .on("start", () => {
          dragActiveRef.current = true;
          svg.style("cursor", "grabbing");
        })
        .on("drag", (event) => {
          const rot = projectionRef.current!.rotate();
          rotationRef.current = [
            rot[0] + event.dx * 0.5,
            Math.max(-89, Math.min(89, rot[1] - event.dy * 0.5)),
            0,
          ];
          projectionRef.current!.rotate(rotationRef.current);
          redrawGeometry();
        })
        .on("end", () => {
          dragActiveRef.current = false;
          svg.style("cursor", "grab");
        });
      svg.call(drag).style("cursor", "grab");

      renderedRef.current = true;
    }

    render();
    return () => {
      cancelled = true;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  // Re-project static geometry (land, graticule, US, city dots) on every
  // rotation change (drag or auto-rotate). Planes are driven separately by
  // the RAF loop because they also move along their great-circle path.
  const redrawGeometry = useCallback(() => {
    const path = pathFnRef.current;
    const projection = projectionRef.current;
    if (!path || !projection) return;
    landSelRef.current?.attr("d", path as unknown as (d: unknown) => string | null);
    graticuleSelRef.current?.attr("d", path as unknown as (d: unknown) => string | null);
    usaSelRef.current?.attr("d", path as unknown as (d: unknown) => string | null);
    // Origin + gateway city dots — each stores its lng/lat as its datum.
    // We re-project on each frame and hide whatever is on the back of the
    // globe so dots don't bleed across the horizon.
    if (arcsLayerRef.current) {
      d3.select(arcsLayerRef.current)
        .selectAll<SVGCircleElement, [number, number]>("circle.city-dot")
        .each(function (d) {
          const proj = projection(d);
          if (!proj) {
            this.setAttribute("opacity", "0");
          } else {
            this.setAttribute("opacity", "1");
            this.setAttribute("cx", proj[0].toFixed(1));
            this.setAttribute("cy", proj[1].toFixed(1));
          }
        });
    }
  }, []);

  // -------------------------------------------------------------------------
  // Build arcs + planes for the current year.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!renderedRef.current) return;
    const projection = projectionRef.current;
    const path = pathFnRef.current;
    const arcsLayer = arcsLayerRef.current;
    const planesLayer = planesLayerRef.current;
    if (!projection || !path || !arcsLayer || !planesLayer) return;

    d3.select(arcsLayer).selectAll("*").remove();
    d3.select(planesLayer).selectAll("*").remove();
    planesRef.current = [];

    const maxCount = Math.max(1, ...flows.map((s) => s.count));

    flows.forEach((flow, idx) => {
      const origin = COUNTRY_COORDS[flow.country];
      const gate = GATEWAYS[flow.gateway];
      if (!origin || !gate) return;

      const from: [number, number] = [origin.lng, origin.lat];
      const to: [number, number] = [gate.lng, gate.lat];
      const interp = d3.geoInterpolate(from, to);

      // Sample the great-circle in lng/lat — d3.geoPath will project these
      // and (because clipAngle=90) the parts on the back of the globe get
      // clipped automatically. The arc bends across the sphere correctly.
      const coords: [number, number][] = [];
      for (let i = 0; i <= 80; i++) coords.push(interp(i / 80));
      const arcGeo: ArcDatum = { type: "LineString", coordinates: coords };

      const color = REGION_COLOR[flow.region];

      // No more drawn arc lines — just the planes themselves, the way real
      // air traffic looks from space. We keep tiny city dots at origin and
      // gateway so the user has anchors for where each plane is flying
      // from and to, but the arc path itself is invisible. We still pass
      // arcGeo through `redrawGeometry` because origin/gateway dots store
      // their lng/lat datums for re-projection on rotation.
      void arcGeo; // path geometry used only for sample positions below

      // Origin "city" dot — a small glowing point with the corridor's color.
      const originPt = projection(from);
      if (originPt) {
        d3.select(arcsLayer)
          .append("circle")
          .datum(from)
          .attr("class", "city-dot origin")
          .attr("cx", originPt[0])
          .attr("cy", originPt[1])
          .attr("r", 3.2)
          .attr("fill", color)
          .attr("fill-opacity", 0.95)
          .attr("stroke", "rgba(255,255,255,0.55)")
          .attr("stroke-width", 0.6)
          .attr("filter", "url(#globe-glow)");
      }

      // Gateway "arrival" dot — slightly bigger, museum-text fill so it
      // reads as a destination separate from the colored origin.
      const gatePt = projection(to);
      if (gatePt) {
        d3.select(arcsLayer)
          .append("circle")
          .datum(to)
          .attr("class", "city-dot gateway")
          .attr("cx", gatePt[0])
          .attr("cy", gatePt[1])
          .attr("r", 2.6)
          .attr("fill", "rgb(var(--museum-text))")
          .attr("fill-opacity", 0.9)
          .attr("stroke", color)
          .attr("stroke-width", 1.2)
          .attr("filter", "url(#globe-glow)");
      }

      // Pre-sample plane positions in lng/lat — re-projected each frame.
      const ll = new Float32Array(SAMPLE_COUNT * 2);
      for (let i = 0; i < SAMPLE_COUNT; i++) {
        const [lng, lat] = interp(i / (SAMPLE_COUNT - 1));
        ll[i * 2] = lng;
        ll[i * 2 + 1] = lat;
      }

      // Denser fleet — scales by both relative share and absolute volume so
      // a few mega-corridors (Mexico, India) get heavy traffic but every
      // small flow still puts at least two planes in the air. This is what
      // makes 1965 read as "busy" instead of "two flights."
      const share = flow.count / maxCount;
      const abs = flow.count;
      let planeCount = 2;
      if (share > 0.7 || abs > 200) planeCount = 6;
      else if (share > 0.45 || abs > 110) planeCount = 5;
      else if (share > 0.25 || abs > 55) planeCount = 4;
      else if (share > 0.12 || abs > 25) planeCount = 3;

      for (let k = 0; k < planeCount; k++) {
        const wrap = d3.select(planesLayer).append("g").style("cursor", "pointer");
        // Larger, more "real" plane: scale up + add a soft engine glow
        // behind the fuselage so the planes read as objects, not dots,
        // now that the line paths are gone.
        const inner = wrap.append("g").attr("transform", "scale(1.5)");
        // Engine halo — a soft, blurred ellipse trailing the fuselage.
        inner.append("ellipse")
          .attr("cx", 0)
          .attr("cy", 10)
          .attr("rx", 4)
          .attr("ry", 1.6)
          .attr("fill", color)
          .attr("fill-opacity", 0.55)
          .attr("filter", "url(#globe-glow)");
        // Plane body.
        inner.append("path")
          .attr("d", PLANE_PATH)
          .attr("fill", color)
          .attr("stroke", "rgba(255,255,255,0.92)")
          .attr("stroke-width", 0.55)
          .attr("filter", "url(#globe-glow)");
        wrap
          .on("mouseenter", () => setHovered(flow))
          .on("mouseleave", () => setHovered(null));

        planesRef.current.push({
          ll,
          sampleCount: SAMPLE_COUNT,
          phase: (k / planeCount) + ((idx * 0.09) % 1),
          speed: 0.14 + (flow.count / maxCount) * 0.06,
          flow,
          planeNode: wrap.node() as SVGGElement,
          color,
        });
      }
    });
  }, [flows]);

  // -------------------------------------------------------------------------
  // RAF loop — auto-rotate the globe and re-project planes.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!renderedRef.current) return;
    const startedAt = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      frame++;
      const elapsed = (now - startedAt) / 1000;
      const projection = projectionRef.current;
      const path = pathFnRef.current;
      if (!projection || !path) {
        animRef.current = requestAnimationFrame(tick);
        return;
      }

      // Slow planetary spin when the user isn't dragging.
      if (autoRotateRef.current && !dragActiveRef.current) {
        const rot = projection.rotate();
        rotationRef.current = [rot[0] + 0.10, rot[1], 0];
        projection.rotate(rotationRef.current);
        // Land + graticule only need redraw every other frame at this speed.
        if (frame % 2 === 0) redrawGeometry();
      }

      // Re-project every plane from (lng, lat) → (x, y). Planes whose great-
      // circle position is on the back hemisphere come back as null from the
      // clipped projection — we just hide them for those frames.
      for (let pi = 0; pi < planesRef.current.length; pi++) {
        const p = planesRef.current[pi];
        const s = p.ll;
        const N = p.sampleCount;
        const t = (elapsed * p.speed + p.phase) % 1;
        const tt = t * (N - 1);
        let idx = tt | 0;
        if (idx < 0) idx = 0;
        else if (idx > N - 1) idx = N - 1;
        const next = idx + 1 < N ? idx + 1 : idx;
        const frac = tt - idx;
        const i2 = idx * 2;
        const n2 = next * 2;
        const lng = s[i2] + (s[n2] - s[i2]) * frac;
        const lat = s[i2 + 1] + (s[n2 + 1] - s[i2 + 1]) * frac;

        const proj = projection([lng, lat]);
        if (!proj) {
          p.planeNode.setAttribute("opacity", "0");
          continue;
        }

        // Tangent angle — sample slightly ahead for the heading.
        const aheadTT = Math.min(N - 1, tt + 0.6);
        const ai = aheadTT | 0;
        const af = aheadTT - ai;
        const an = ai + 1 < N ? ai + 1 : ai;
        const lng2 = s[ai * 2] + (s[an * 2] - s[ai * 2]) * af;
        const lat2 = s[ai * 2 + 1] + (s[an * 2 + 1] - s[ai * 2 + 1]) * af;
        const aheadProj = projection([lng2, lat2]);
        let angle = 0;
        if (aheadProj) {
          angle = (Math.atan2(aheadProj[1] - proj[1], aheadProj[0] - proj[0]) * 180) / Math.PI + 90;
        }

        p.planeNode.setAttribute("opacity", "1");
        p.planeNode.setAttribute(
          "transform",
          `translate(${proj[0].toFixed(1)},${proj[1].toFixed(1)}) rotate(${angle.toFixed(1)})`,
        );
      }

      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [redrawGeometry]);

  // Snap-back to a default rotation.
  const recenter = useCallback(() => {
    if (!projectionRef.current) return;
    rotationRef.current = [-95, -20, 0];
    projectionRef.current.rotate(rotationRef.current);
    redrawGeometry();
  }, [redrawGeometry]);

  // Used in the in-globe "X corridors aloft" badge.
  const totalFlows = flows.length;

  return (
    <div className="relative h-full w-full bg-museum-bg">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full touch-none"
        role="img"
        aria-label={`Three-dimensional immigration globe for ${year}`}
      />

      {/* Year + corridor count + event — top-left in the empty space outside the disc. */}
      <div className="pointer-events-none absolute left-5 top-5 z-10">
        <p className="folio">In flight</p>
        <AnimatePresence mode="wait">
          <motion.p
            key={`yr-${year}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.3 }}
            className="font-display text-5xl leading-none text-museum-text md:text-6xl"
          >
            {year}
          </motion.p>
        </AnimatePresence>
        <p className="mt-2 font-mono text-xs uppercase tracking-[0.22em] text-gold">
          {totalFlows} corridors aloft
        </p>
        {yearData.event && (
          <p className="mt-3 max-w-[260px] border-l-2 border-gold pl-2 font-display text-sm leading-snug text-museum-text">
            {yearData.event}
          </p>
        )}
      </div>

      {/* Globe-only controls — top-right. */}
      <div className="absolute right-5 top-5 z-10 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setAutoRotate((v) => !v); }}
          className={`inline-flex items-center gap-2 border px-3 py-2 text-[10px] uppercase tracking-[0.22em] backdrop-blur transition ${
            autoRotate
              ? "border-gold bg-gold/[0.12] text-gold"
              : "border-museum-border/20 bg-museum-bg/85 text-museum-muted hover:border-gold/50 hover:text-gold"
          }`}
          aria-pressed={autoRotate}
          title="Auto-spin the globe"
        >
          <span aria-hidden>⟲</span>
          <span>{autoRotate ? "Spinning" : "Stopped"}</span>
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); recenter(); }}
          className="border border-museum-border/20 bg-museum-bg/85 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-museum-muted backdrop-blur transition hover:border-gold/50 hover:text-gold"
          title="Re-center the globe over the Pacific"
        >
          ◎ Recenter
        </button>
      </div>

      {/* Drag hint — top center. */}
      <p className="pointer-events-none absolute left-1/2 top-5 z-10 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.22em] text-museum-faint">
        Drag the globe to rotate
      </p>

      {/* Hover tooltip — bottom-left so it never overlaps the controls. */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            key={`${hovered.country}-${year}`}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none absolute left-5 bottom-5 z-10 max-w-[280px] border border-gold/40 bg-museum-bg/90 px-3 py-2 backdrop-blur"
          >
            <p className="folio">{regionLabel(hovered.region)}</p>
            <p className="mt-1 font-display text-base leading-snug text-museum-text">
              {hovered.country} → {GATEWAYS[hovered.gateway].label}
            </p>
            <p className="font-mono text-xs text-museum-muted">
              {Math.round(hovered.count)}K arrivals · {year}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
