import { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import { motion, AnimatePresence } from "framer-motion";
import {
  POST_1965_DATA,
  YEAR_MAX,
  YEAR_MIN,
  regionLabel,
  type Region,
  getYear,
} from "@/data/post-1965-flows";

const W = 1400;
const H = 320;

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

// Layer order — bottom of stack first. The most-impactful regions go at the
// bottom so the eye lands on Latin America + Caribbean as the baseline,
// then watches Asia and the Middle East ride up over the decades.
const LAYER_ORDER: Region[] = [
  "latin-america",
  "caribbean",
  "asia",
  "middle-east",
  "europe",
  "africa",
  "north-america",
  "oceania",
];

type StackPoint = { year: number } & Record<Region, number>;

type Props = {
  /** Active year — playhead moves to this position with a tween. */
  year: number;
  /** Click to scrub to a year. */
  onScrub: (y: number) => void;
};

export default function CompositionChart({ year, onScrub }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Pre-compute the stacked layout once. The data is static, so there's no
  // reason to recompute on every year change.
  const { stacked, x, yScale, area, totalLine, margin, totalSeries } = useMemo(() => {
    const data: StackPoint[] = POST_1965_DATA.map((yr) => {
      const counts: Record<Region, number> = {
        "latin-america": 0, "caribbean": 0, "asia": 0, "middle-east": 0,
        "europe": 0, "africa": 0, "north-america": 0, "oceania": 0,
      };
      for (const s of yr.sources) counts[s.region] += s.count;
      return { year: yr.year, ...counts };
    });

    const stack = d3.stack<StackPoint, Region>().keys(LAYER_ORDER);
    const stacked = stack(data);

    const margin = { top: 18, right: 18, bottom: 30, left: 48 };
    const x = d3.scaleLinear().domain([YEAR_MIN, YEAR_MAX]).range([margin.left, W - margin.right]);

    // The top of the topmost layer = total in any year. Add 10% headroom.
    const yMax = d3.max(stacked[stacked.length - 1], (d) => d[1]) ?? 1500;
    const yScale = d3.scaleLinear().domain([0, yMax * 1.08]).range([H - margin.bottom, margin.top]);

    const area = d3
      .area<d3.SeriesPoint<StackPoint>>()
      .x((d) => x(d.data.year))
      .y0((d) => yScale(d[0]))
      .y1((d) => yScale(d[1]))
      .curve(d3.curveCatmullRom.alpha(0.5));

    const totalSeries = data.map((d) => ({
      year: d.year,
      total: POST_1965_DATA.find((y) => y.year === d.year)?.total ?? 0,
    }));
    const totalLine = d3.line<{ year: number; total: number }>()
      .x((d) => x(d.year))
      .y((d) => yScale(d.total))
      .curve(d3.curveCatmullRom.alpha(0.5));

    return { stacked, x, yScale, area, totalLine, margin, totalSeries };
  }, []);

  // ---- one-time render of the static chart ----
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${W} ${H}`);

    const defs = svg.append("defs");
    const fade = defs.append("linearGradient")
      .attr("id", "chart-fade")
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", margin.left).attr("x2", W - margin.right).attr("y1", 0).attr("y2", 0);
    fade.append("stop").attr("offset", "0%").attr("stop-color", "rgba(0,0,0,0)");
    fade.append("stop").attr("offset", "100%").attr("stop-color", "rgba(0,0,0,0)");

    // Y grid lines — tnum monospace ticks at 0, 500K, 1M, 1.5M.
    const grid = svg.append("g").attr("class", "grid");
    yScale.ticks(4).forEach((t) => {
      grid.append("line")
        .attr("x1", margin.left).attr("x2", W - margin.right)
        .attr("y1", yScale(t)).attr("y2", yScale(t))
        .attr("stroke", "rgb(var(--museum-border) / 0.10)")
        .attr("stroke-dasharray", t === 0 ? null : "2 4");
      grid.append("text")
        .attr("x", margin.left - 8).attr("y", yScale(t) + 3)
        .attr("text-anchor", "end")
        .attr("font-family", "JetBrains Mono, ui-monospace, monospace")
        .attr("font-size", 11)
        .attr("fill", "rgb(var(--museum-faint))")
        .text(t === 0 ? "0" : t >= 1000 ? `${(t / 1000).toFixed(1)}M` : `${t}K`);
    });

    // X axis — sparse year ticks every 10 years.
    const axisG = svg.append("g").attr("class", "x-axis");
    [1965, 1970, 1975, 1980, 1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020, 2024].forEach((yr) => {
      axisG.append("line")
        .attr("x1", x(yr)).attr("x2", x(yr))
        .attr("y1", H - margin.bottom).attr("y2", H - margin.bottom + 4)
        .attr("stroke", "rgb(var(--museum-border) / 0.3)");
      axisG.append("text")
        .attr("x", x(yr)).attr("y", H - margin.bottom + 14)
        .attr("text-anchor", "middle")
        .attr("font-family", "JetBrains Mono, ui-monospace, monospace")
        .attr("font-size", 11)
        .attr("fill", "rgb(var(--museum-muted))")
        .text(String(yr));
    });

    // Stacked areas.
    const layerG = svg.append("g").attr("class", "layers");
    stacked.forEach((layer) => {
      const region = layer.key as Region;
      const path = layerG.append("path")
        .datum(layer)
        .attr("d", area)
        .attr("fill", REGION_COLOR[region])
        .attr("fill-opacity", 0.78)
        .attr("stroke", REGION_COLOR[region])
        .attr("stroke-opacity", 0.5)
        .attr("stroke-width", 0.6)
        .style("cursor", "pointer")
        .on("mouseenter", function () {
          d3.select(this).attr("fill-opacity", 0.95).attr("stroke-opacity", 0.8);
        })
        .on("mouseleave", function () {
          d3.select(this).attr("fill-opacity", 0.78).attr("stroke-opacity", 0.5);
        });
      path.append("title").text(regionLabel(region));
    });

    // Total line on top.
    svg.append("path")
      .datum(totalSeries)
      .attr("d", totalLine)
      .attr("fill", "none")
      .attr("stroke", "rgb(var(--museum-text) / 0.55)")
      .attr("stroke-width", 1.2)
      .attr("stroke-dasharray", "2 3");

    // Year-event ticks — tiny vertical hashes at the top.
    const eventG = svg.append("g").attr("class", "events");
    POST_1965_DATA.filter((d) => d.event).forEach((d) => {
      eventG.append("line")
        .attr("x1", x(d.year)).attr("x2", x(d.year))
        .attr("y1", margin.top).attr("y2", margin.top + 6)
        .attr("stroke", "rgb(var(--museum-gold) / 0.85)")
        .attr("stroke-width", 1.4);
    });

    // Click-to-scrub hit area covering the plot.
    svg.append("rect")
      .attr("x", margin.left)
      .attr("y", margin.top)
      .attr("width", W - margin.left - margin.right)
      .attr("height", H - margin.top - margin.bottom)
      .attr("fill", "transparent")
      .style("cursor", "pointer")
      .on("click", function (event) {
        const [mx] = d3.pointer(event, this);
        const yr = Math.round(x.invert(mx));
        if (yr >= YEAR_MIN && yr <= YEAR_MAX) onScrub(yr);
      });
  }, [stacked, area, totalSeries, totalLine, x, yScale, margin, onScrub]);

  // Position of the playhead in chart coords.
  const playheadX = x(year);
  const yearData = getYear(year);
  const totalAtYear = yearData.total;
  const playheadY = yScale(totalAtYear);

  // Composition breakdown for tooltip card.
  const counts = useMemo(() => {
    const c: Record<Region, number> = {
      "latin-america": 0, "caribbean": 0, "asia": 0, "middle-east": 0,
      "europe": 0, "africa": 0, "north-america": 0, "oceania": 0,
    };
    for (const s of yearData.sources) c[s.region] += s.count;
    return c;
  }, [yearData]);
  const sortedRegions = useMemo(
    () => Object.entries(counts)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]) as Array<[Region, number]>,
    [counts]
  );

  // X position as percent of the rendered SVG — used for the floating
  // playhead labels that live in HTML overlay.
  const xPct = ((playheadX) / W) * 100;
  const yPct = ((playheadY) / H) * 100;

  const totalDisplay = totalAtYear >= 1000 ? `${(totalAtYear / 1000).toFixed(2)}M` : `${totalAtYear}K`;
  const topRegions = sortedRegions.slice(0, 3);

  return (
    <div className="space-y-3">
      {/* ----------------------------- Header row ----------------------------- */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <p className="folio">Plate II · b — Composition over time</p>
          <p className="mt-1 font-display text-xl text-museum-text">
            Stacked annual arrivals by region, {YEAR_MIN} — {YEAR_MAX}
          </p>
        </div>
        {/* Live readout — replaces the old floating tooltip card. */}
        <div className="flex items-baseline gap-3">
          <AnimatePresence mode="wait">
            <motion.span
              key={`y-${year}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{ duration: 0.25 }}
              className="font-mono text-xs uppercase tracking-[0.22em] text-gold"
            >
              {year}
            </motion.span>
          </AnimatePresence>
          <AnimatePresence mode="wait">
            <motion.span
              key={`t-${year}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{ duration: 0.25 }}
              className="font-display text-2xl leading-none text-museum-text"
            >
              {totalDisplay}
            </motion.span>
          </AnimatePresence>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-museum-faint">
            arrivals · live
          </span>
        </div>
      </div>

      {/* ----------------------------- Inline legend ----------------------------- */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] uppercase tracking-[0.18em] text-museum-muted">
        {LAYER_ORDER
          .filter((r) => POST_1965_DATA.some((y) => y.sources.some((s) => s.region === r)))
          .map((r) => (
            <span key={r} className="flex items-center gap-1.5">
              <span aria-hidden className="inline-block h-2 w-3" style={{ background: REGION_COLOR[r] }} />
              <span className="text-museum-text">{regionLabel(r)}</span>
            </span>
          ))}
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-0 w-4"
            style={{ borderTop: "1px dashed rgb(var(--museum-text) / 0.6)" }}
          />
          <span>Total LPRs</span>
        </span>
      </div>

      {/* ----------------------------- Chart ----------------------------- */}
      <div className="relative overflow-hidden border border-museum-border/[0.12] bg-museum-bg-soft/40 shadow-[var(--shadow-card)]">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full"
          role="img"
          aria-label="Stacked area chart of U.S. immigration by region of origin, 1965 to today"
        />

        {/* Playhead — vertical line + dot anchored to total. */}
        <motion.div
          className="pointer-events-none absolute inset-y-0"
          initial={false}
          animate={{ left: `${xPct}%` }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          style={{ width: 0 }}
        >
          <span className="absolute inset-y-0 left-0 block w-px bg-gold/85" />
          <span className="absolute -top-[7px] left-0 -translate-x-1/2 rounded-sm border border-gold/40 bg-museum-bg/95 px-1.5 py-0.5 font-mono text-[10px] text-gold backdrop-blur">
            {year}
          </span>
          <motion.span
            initial={false}
            animate={{ top: `${yPct}%` }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="absolute -ml-[5px] block h-2.5 w-2.5 rounded-full border border-gold bg-museum-bg shadow-[0_0_0_3px_rgba(201,162,74,0.18)]"
          />
        </motion.div>

        <p className="pointer-events-none absolute right-3 top-3 font-mono text-[10px] uppercase tracking-[0.18em] text-museum-faint">
          Click anywhere to scrub
        </p>
      </div>

      {/* ----------------------------- Top-3 regions for current year ----------------------------- */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px]">
        <p className="font-mono uppercase tracking-[0.18em] text-museum-faint">
          In {year}, the mix is:
        </p>
        {topRegions.map(([region, count]) => {
          const pct = (count / totalAtYear) * 100;
          return (
            <motion.span
              key={`tr-${year}-${region}`}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2"
            >
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: REGION_COLOR[region] }}
              />
              <span className="text-museum-text">{regionLabel(region)}</span>
              <span className="font-mono text-museum-muted">{pct.toFixed(0)}%</span>
            </motion.span>
          );
        })}
      </div>
    </div>
  );
}
