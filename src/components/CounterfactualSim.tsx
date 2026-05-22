import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { motion } from "framer-motion";
import { useTheme } from "@/lib/theme";
import type { DemographicPoint } from "@/types";
import DisclaimerBanner from "./DisclaimerBanner";

function readCssRgb(name: string, fallback: string): string {
  if (typeof document === "undefined") return `rgb(${fallback})`;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return `rgb(${v || fallback})`;
}

type Props = {
  actual: DemographicPoint[];
  projected: DemographicPoint[];
  country?: string;
};

export default function CounterfactualSim({
  actual,
  projected,
  country,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { resolved } = useTheme();

  useEffect(() => {
    if (!svgRef.current || actual.length === 0) return;
    const actualColor = readCssRgb("--museum-glow", "56 189 248");
    const projectedColor = readCssRgb("--museum-violet", "167 139 250");
    const axisColor = readCssRgb("--museum-muted", "148 163 184");

    const margin = { top: 20, right: 24, bottom: 40, left: 70 };
    const width = 600 - margin.left - margin.right;
    const height = 280 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", "0 0 600 280");

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const allYears = [...actual, ...projected].map((d) => d.year);
    const x = d3
      .scaleLinear()
      .domain(d3.extent(allYears) as [number, number])
      .range([0, width]);

    const maxPop = Math.max(
      d3.max(actual, (d) => d.population) ?? 0,
      d3.max(projected, (d) => d.population) ?? 0
    );
    const y = d3.scaleLinear().domain([0, maxPop]).nice().range([height, 0]);

    const line = d3
      .line<DemographicPoint>()
      .x((d) => x(d.year))
      .y((d) => y(d.population))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(actual)
      .attr("fill", "none")
      .attr("stroke", actualColor)
      .attr("stroke-width", 2.5)
      .attr("d", line);

    g.append("path")
      .datum(projected)
      .attr("fill", "none")
      .attr("stroke", projectedColor)
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "6 4")
      .attr("d", line);

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")))
      .attr("color", axisColor);

    g.append("g")
      .call(
        d3
          .axisLeft(y)
          .ticks(5)
          .tickFormat((d) => d3.format(".2s")(d as number))
      )
      .attr("color", axisColor);

    const legend = g
      .append("g")
      .attr("transform", `translate(${width - 180}, 8)`);
    legend
      .append("line")
      .attr("x1", 0)
      .attr("x2", 24)
      .attr("y1", 0)
      .attr("y2", 0)
      .attr("stroke", actualColor)
      .attr("stroke-width", 2);
    legend
      .append("text")
      .attr("x", 30)
      .attr("y", 4)
      .text("Actual (post-1965)")
      .attr("fill", axisColor)
      .attr("font-size", 11);
    legend
      .append("line")
      .attr("x1", 0)
      .attr("x2", 24)
      .attr("y1", 18)
      .attr("y2", 18)
      .attr("stroke", projectedColor)
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "6 4");
    legend
      .append("text")
      .attr("x", 30)
      .attr("y", 22)
      .text("Modeled without 1965 Act")
      .attr("fill", axisColor)
      .attr("font-size", 11);
  }, [actual, projected, resolved]);

  const latestActual = actual[actual.length - 1];
  const latestProjected = projected[projected.length - 1];
  const diff =
    latestActual && latestProjected
      ? latestActual.population - latestProjected.population
      : 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <h2 className="font-display text-2xl text-glow md:text-3xl">
        What if the 1965 Act never passed?
      </h2>
      <p className="text-museum-muted">
        Educational simulation comparing observed demographic growth for{" "}
        {country ?? "selected ancestry"} communities with a modeled scenario of
        reduced post-1965 immigration flows.
      </p>

      <DisclaimerBanner variant="simulation">
        This is historical modeling for education — not a political forecast.
        Population figures use simplified assumptions.
      </DisclaimerBanner>

      <div className="rounded-none border border-museum-border/10 bg-museum-surface/5 p-4">
        <svg
          ref={svgRef}
          className="h-auto w-full"
          role="img"
          aria-label="Counterfactual demographic comparison chart"
        />
      </div>

      {latestActual && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="stat-card">
            <p className="text-sm text-museum-muted">2020 actual population</p>
            <p className="font-mono text-2xl text-glow">
              {d3.format(",")(latestActual.population)}
            </p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-museum-muted">Modeled without 1965 Act</p>
            <p className="font-mono text-2xl text-accent-violet">
              {latestProjected
                ? d3.format(",")(latestProjected.population)
                : "—"}
            </p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-museum-muted">Estimated difference</p>
            <p className="font-mono text-2xl text-accent-amber">
              {diff > 0 ? `+${d3.format(",")(diff)}` : d3.format(",")(diff)}
            </p>
          </div>
        </div>
      )}
    </motion.section>
  );
}
