import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { motion } from "framer-motion";
import { useTheme } from "@/lib/theme";
import type { DemographicPoint } from "@/types";

type Props = {
  data: DemographicPoint[];
  title: string;
  color?: string;
};

function readCssRgb(name: string, fallback = "148 163 184"): string {
  if (typeof document === "undefined") return `rgb(${fallback})`;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return `rgb(${v || fallback})`;
}

export default function DemographicChart({
  data,
  title,
  color,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { resolved } = useTheme();

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;
    const lineColor = color ?? readCssRgb("--museum-glow", "56 189 248");
    const axisColor = readCssRgb("--museum-muted", "148 163 184");

    const margin = { top: 20, right: 24, bottom: 40, left: 70 };
    const width = 600 - margin.left - margin.right;
    const height = 280 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 600 280`);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleLinear()
      .domain(d3.extent(data, (d) => d.year) as [number, number])
      .range([0, width]);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.population) ?? 0])
      .nice()
      .range([height, 0]);

    const area = d3
      .area<DemographicPoint>()
      .x((d) => x(d.year))
      .y0(height)
      .y1((d) => y(d.population))
      .curve(d3.curveMonotoneX);

    const line = d3
      .line<DemographicPoint>()
      .x((d) => x(d.year))
      .y((d) => y(d.population))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(data)
      .attr("fill", lineColor)
      .attr("fill-opacity", 0.15)
      .attr("d", area);

    const path = g
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", lineColor)
      .attr("stroke-width", 2.5)
      .attr("d", line);

    const totalLength = path.node()?.getTotalLength() ?? 0;
    path
      .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .duration(2000)
      .attr("stroke-dashoffset", 0);

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

    g.selectAll("circle")
      .data(data)
      .join("circle")
      .attr("cx", (d) => x(d.year))
      .attr("cy", (d) => y(d.population))
      .attr("r", 0)
      .attr("fill", lineColor)
      .transition()
      .delay((_, i) => i * 150)
      .duration(400)
      .attr("r", 4);
  }, [data, color, resolved]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-none border border-museum-border/10 bg-museum-surface/5 p-4"
    >
      <h3 className="font-display text-lg text-glow">{title}</h3>
      <svg ref={svgRef} className="mt-2 h-auto w-full" role="img" aria-label={title} />
    </motion.div>
  );
}
