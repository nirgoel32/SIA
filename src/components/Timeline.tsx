import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { TimelineEvent } from "@/types";

type Props = {
  events: TimelineEvent[];
};

const typeColors: Record<TimelineEvent["type"], string> = {
  immigration: "bg-gold",
  law: "bg-gold",
  census: "bg-museum-muted",
  family: "bg-brick",
  historical: "bg-brick",
};

export default function Timeline({ events }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (events.length === 0) return;
    const interval = setInterval(() => {
      setActiveIndex((i) => (i + 1) % events.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [events.length]);

  if (events.length === 0) {
    return (
      <p className="text-center text-museum-muted">No timeline events to display.</p>
    );
  }

  const active = events[activeIndex];
  const minYear = Math.min(...events.map((e) => e.year));
  const maxYear = Math.max(...events.map((e) => e.year));

  return (
    <div ref={containerRef} className="w-full">
      <div className="relative mb-8 h-2 overflow-hidden rounded-full bg-museum-surface/10">
        <motion.div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-gold to-brick"
          animate={{
            width: `${((active.year - minYear) / (maxYear - minYear || 1)) * 100}%`,
          }}
          transition={{ duration: 0.8 }}
        />
      </div>

      <div className="flex gap-1 overflow-x-auto pb-4">
        {events.map((e, i) => (
          <button
            key={`${e.year}-${e.title}-${i}`}
            type="button"
            onClick={() => setActiveIndex(i)}
            className={`shrink-0 rounded px-2 py-1 text-xs transition ${
              i === activeIndex
                ? "bg-museum-surface/15 text-glow"
                : "text-museum-muted hover:text-white"
            }`}
          >
            {e.year}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.article
          key={`${active.year}-${active.title}`}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.5 }}
          className="rounded-none border border-museum-border/10 bg-museum-surface/5 p-6 backdrop-blur"
        >
          <div className="flex items-center gap-3">
            <span
              className={`h-3 w-3 rounded-full ${typeColors[active.type]}`}
            />
            <span className="font-mono text-2xl text-glow">{active.year}</span>
            <span className="rounded bg-museum-surface/10 px-2 py-0.5 text-xs uppercase tracking-wider text-museum-muted">
              {active.type}
            </span>
          </div>
          <h3 className="mt-3 font-display text-2xl">{active.title}</h3>
          <p className="mt-2 text-museum-muted">{active.description}</p>
        </motion.article>
      </AnimatePresence>
    </div>
  );
}
