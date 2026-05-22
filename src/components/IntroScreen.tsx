import { motion } from "framer-motion";
import Link from "next/link";

type Props = {
  onStart: () => void;
};

const ease = [0.22, 1, 0.36, 1] as const;

const SOURCES = ["FamilySearch", "WikiTree", "Wikidata", "U.S. Census", "Ellis Island"];

export default function IntroScreen({ onStart }: Props) {
  return (
    <section className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col px-6 pb-24 pt-16 md:pt-24">
      {/* Folio identifier line */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease }}
        className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-museum-faint"
      >
        <span>Volume I · An Interactive Public-History Project</span>
        <span>Edition {new Date().getFullYear()}</span>
      </motion.div>

      <hr className="rule-gold mt-4" />

      <div className="grid flex-1 grid-cols-1 gap-12 pt-16 md:pt-24 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-8">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease }}
            className="eyebrow-gold"
          >
            Issue No. 01 · The American Migration
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease, delay: 0.1 }}
            className="font-display mt-6 text-5xl font-medium leading-[1.02] tracking-tight text-museum-text md:text-7xl lg:text-[5.5rem]"
          >
            Every American story
            <br />
            <span className="italic text-gold">begins somewhere.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8, ease }}
            className="mt-10 max-w-2xl font-serif text-lg leading-relaxed text-museum-muted md:text-xl"
          >
            An interactive public-history project that traces immigration
            through the lives of individuals — their migration paths, their
            families, and the demographic forces their journeys helped shape.
            Built from open archives, with sources cited throughout.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.7, ease }}
            className="mt-12 flex flex-wrap items-center gap-3"
          >
            <button type="button" onClick={onStart} className="btn-primary">
              Begin a journey
            </button>
            <Link href="/my-family" className="btn-secondary">
              Upload your family tree
            </Link>
            <Link href="/explore" className="btn-secondary">
              Browse historical figures
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.7, ease }}
            className="mt-16"
          >
            <p className="eyebrow">Primary sources</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-museum-muted">
              {SOURCES.map((src, i) => (
                <span key={src} className="flex items-center gap-6">
                  <span>{src}</span>
                  {i < SOURCES.length - 1 && (
                    <span aria-hidden className="text-museum-faint">·</span>
                  )}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Featured profile card — museum object label */}
        <motion.aside
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8, ease }}
          className="lg:col-span-4"
        >
          <div className="border border-museum-border/15 bg-museum-surface/[0.03] p-7">
            <p className="folio">Plate I · Featured Profile</p>
            <div className="mt-5 flex items-baseline gap-3 border-b border-museum-border/15 pb-5">
              <span className="font-mono text-xs text-museum-faint">1867 – 1934</span>
            </div>
            <h2 className="mt-5 font-display text-3xl leading-tight text-museum-text">
              Marie Skłodowska-Curie
            </h2>
            <p className="mt-2 text-sm italic text-museum-muted">
              Warsaw → Paris
            </p>
            <p className="mt-5 font-serif text-sm leading-relaxed text-museum-muted">
              Physicist, chemist, and two-time Nobel laureate. Trace her
              journey from partitioned Poland to the laboratories of Paris —
              with her family network, the places that shaped her, and the
              broader demographic context of her era.
            </p>
            <Link
              href="/journey?firstName=Marie&surname=Curie"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-gold transition hover:text-museum-text"
            >
              <span className="border-b border-gold/60 pb-0.5">
                Open this journey
              </span>
              <span aria-hidden>→</span>
            </Link>
          </div>

          <p className="mt-4 text-[10px] uppercase tracking-[0.22em] text-museum-faint">
            Curated edition · verified sources
          </p>
        </motion.aside>
      </div>
    </section>
  );
}
