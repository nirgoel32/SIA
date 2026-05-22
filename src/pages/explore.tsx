import { useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import SectionHeader from "@/components/SectionHeader";
import historicalFigures from "@/data/historical-figures.json";
import type { HistoricalFigure } from "@/types";

const figures = historicalFigures as HistoricalFigure[];

export default function ExplorePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<HistoricalFigure | null>(null);

  const exploreFigure = (fig: HistoricalFigure) => {
    const params = new URLSearchParams({
      surname: fig.lastName,
      firstName: fig.firstName,
      country: fig.originCountry,
    });
    router.push(`/journey?${params.toString()}`);
  };

  return (
    <Layout title="Historical Figures">
      <div className="mx-auto max-w-7xl px-6 pb-20 pt-16">
        <SectionHeader
          eyebrow="Curated archive"
          title="Historical figures"
          description="Real people whose lives intersect with major immigration moments. Select an entry and the project will construct their migration map, timeline, family network, and demographic context."
        />

        <div className="mt-14 grid gap-px bg-museum-border/15 md:grid-cols-2 lg:grid-cols-3">
          {figures.map((fig, i) => {
            const isSelected = selected?.id === fig.id;
            return (
              <motion.article
                key={fig.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.4 }}
                className={`group relative cursor-pointer p-7 transition ${
                  isSelected
                    ? "bg-museum-surface/[0.06]"
                    : "bg-museum-bg hover:bg-museum-surface/[0.03]"
                }`}
                onClick={() => setSelected(fig)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(fig);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
              >
                {/* Selected indicator — gold left rule */}
                {isSelected && (
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 w-[2px] bg-gold"
                  />
                )}
                <div className="flex items-baseline justify-between">
                  <span className="folio">No. {String(i + 1).padStart(2, "0")}</span>
                  <span className="font-mono text-[10px] text-museum-faint">
                    {fig.birthYear}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-2xl font-medium leading-tight text-museum-text">
                  {fig.firstName} {fig.lastName}
                </h3>
                <p className="mt-1 text-sm italic text-museum-muted">
                  {fig.originCountry} → {fig.settlement}
                </p>
                <p className="mt-5 font-serif text-sm leading-relaxed text-museum-muted">
                  {fig.description}
                </p>
              </motion.article>
            );
          })}
        </div>

        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-16 flex flex-col items-center gap-4 border-t border-museum-border/15 pt-10"
          >
            <p className="eyebrow-gold">Selected</p>
            <p className="font-display text-3xl font-medium text-museum-text">
              {selected.firstName} {selected.lastName}
            </p>
            <button
              type="button"
              onClick={() => exploreFigure(selected)}
              className="btn-primary mt-2"
            >
              Construct {selected.firstName}&rsquo;s journey
            </button>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
