import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
} from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";
import AnimatedCounter from "./AnimatedCounter";

// Heavy d3 + topojson + world-atlas runtime — load client-only so the page
// shell renders instantly and SSR can't trip on the world map.
const Post1965Replay = dynamic(() => import("./Post1965Replay"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] items-center justify-center border border-museum-border/[0.12] bg-museum-bg-soft/40">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-museum-muted">
        Loading cartography…
      </p>
    </div>
  ),
});

type Props = {
  onStart: () => void;
};

const ease = [0.22, 1, 0.36, 1] as const;

const SOURCES = ["FamilySearch", "WikiTree", "Wikidata", "U.S. Census", "Ellis Island"];

// The six fully-curated figures in src/data/curated-figures.ts. Each has a
// complete family tree, migration log, timeline, and place-coord dictionary
// so the journey page renders end-to-end without a single API call.
const FEATURED = [
  {
    href: "/journey?firstName=Marie&surname=Curie",
    name: "Marie Skłodowska-Curie",
    dates: "1867 – 1934",
    route: "Warsaw → Paris",
    note: "Physicist · two-time Nobel laureate",
  },
  {
    href: "/journey?firstName=Albert&surname=Einstein",
    name: "Albert Einstein",
    dates: "1879 – 1955",
    route: "Ulm → Bern → Berlin → Princeton",
    note: "Refugee from Nazi Germany, 1933",
  },
  {
    href: "/journey?firstName=Hannah&surname=Arendt",
    name: "Hannah Arendt",
    dates: "1906 – 1975",
    route: "Hanover → Paris → New York",
    note: "Stateless 1937 – 1951 · interned at Gurs",
  },
  {
    href: "/journey?firstName=Madeleine&surname=Albright",
    name: "Madeleine Albright",
    dates: "1937 – 2022",
    route: "Prague → London → Denver",
    note: "First woman U.S. Secretary of State",
  },
  {
    href: "/journey?firstName=Andrew&surname=Carnegie",
    name: "Andrew Carnegie",
    dates: "1835 – 1919",
    route: "Dunfermline → Pittsburgh",
    note: "Steel industrialist · arrived 1848 at age 12",
  },
  {
    href: "/journey?firstName=Sergey&surname=Brin",
    name: "Sergey Brin",
    dates: "born 1973",
    route: "Moscow → Vienna → Maryland → Stanford",
    note: "Soviet-Jewish refugee, 1979 · co-founder of Google",
  },
];

export default function IntroScreen({ onStart }: Props) {
  const heroRef = useRef<HTMLDivElement>(null);
  const [featuredIdx, setFeaturedIdx] = useState(0);

  // Cursor-tracked tilt for the featured card.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(useTransform(my, [-0.5, 0.5], [4, -4]), { stiffness: 120, damping: 14 });
  const rotY = useSpring(useTransform(mx, [-0.5, 0.5], [-4, 4]), { stiffness: 120, damping: 14 });

  // Scroll-driven parallax on the hero title.
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const titleY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0.2]);
  const subtitleY = useTransform(scrollYProgress, [0, 1], [0, -40]);

  // Rotate the featured profile every 7s.
  useEffect(() => {
    const t = setInterval(() => setFeaturedIdx((i) => (i + 1) % FEATURED.length), 7000);
    return () => clearInterval(t);
  }, []);

  const featured = FEATURED[featuredIdx];

  return (
    <section className="relative mx-auto flex max-w-7xl flex-col px-6 pb-24">
      {/* Folio identifier line */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease }}
        className="flex items-center justify-between pt-12 text-[10px] uppercase tracking-[0.3em] text-museum-faint"
      >
        <span>Volume I · An Interactive Public-History Project</span>
        <span>Edition {new Date().getFullYear()}</span>
      </motion.div>

      <hr className="rule-gold mt-4" />

      {/* ------------------------------------------------------------------ */}
      {/* HERO — animated headline + cursor-tracking featured card           */}
      {/* ------------------------------------------------------------------ */}
      <div
        ref={heroRef}
        className="grid flex-1 grid-cols-1 gap-12 pt-16 md:pt-24 lg:grid-cols-12 lg:gap-16"
      >
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
            style={{ y: titleY, opacity: titleOpacity }}
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
            style={{ y: subtitleY }}
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
            <button type="button" onClick={onStart} className="btn-primary group relative overflow-hidden">
              <span className="relative z-10">Begin a journey</span>
            </button>
            <Link href="/my-family" className="btn-secondary">
              Upload your family tree
            </Link>
            <Link href="/explore" className="btn-secondary">
              Browse historical figures
            </Link>
            <a href="#replay" className="ml-auto hidden text-xs uppercase tracking-[0.22em] text-museum-muted transition hover:text-gold md:inline">
              ↓ Watch the 1965–today replay
            </a>
          </motion.div>

          {/* Live stat counters — animate on scroll-into-view */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.7, ease }}
            className="mt-12 grid grid-cols-2 gap-6 border-t border-museum-border/15 pt-8 md:grid-cols-4"
          >
            <Stat label="Years of post-1965 record" value={60} />
            <Stat
              label="Foreign-born U.S. residents"
              value={47.8}
              suffix="M"
              format={(n) => n.toFixed(1)}
            />
            <StaticStat label="Top single-year source · 2024" value="India" />
            <Stat label="Countries reshaped by 1965 law" value={140} suffix="+" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.7, ease }}
            className="mt-12"
          >
            <p className="eyebrow">Primary sources</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-museum-muted">
              {SOURCES.map((src, i) => (
                <span key={src} className="flex items-center gap-6">
                  <span className="transition hover:text-gold">{src}</span>
                  {i < SOURCES.length - 1 && (
                    <span aria-hidden className="text-museum-faint">·</span>
                  )}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Featured profile card — rotates through curated figures with mouse tilt */}
        <motion.aside
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8, ease }}
          className="lg:col-span-4"
          onMouseMove={(e) => {
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
            mx.set((e.clientX - r.left) / r.width - 0.5);
            my.set((e.clientY - r.top) / r.height - 0.5);
          }}
          onMouseLeave={() => { mx.set(0); my.set(0); }}
        >
          <motion.div
            style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d" }}
            className="relative border border-museum-border/15 bg-museum-surface/[0.03] p-7 transition-colors"
          >
            <div className="flex items-center justify-between">
              <p className="folio">Plate I · Featured Profile</p>
              <div className="flex gap-1">
                {FEATURED.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setFeaturedIdx(i)}
                    className={`h-1.5 transition-all ${i === featuredIdx ? "w-5 bg-gold" : "w-1.5 bg-gold/30 hover:bg-gold/60"}`}
                    aria-label={`Show profile ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            <motion.div
              key={featured.name}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease }}
            >
              <div className="mt-5 flex items-baseline gap-3 border-b border-museum-border/15 pb-5">
                <span className="font-mono text-xs text-museum-faint">{featured.dates}</span>
              </div>
              <h2 className="mt-5 font-display text-3xl leading-tight text-museum-text">
                {featured.name}
              </h2>
              <p className="mt-2 text-sm italic text-museum-muted">{featured.route}</p>
              <p className="mt-5 font-serif text-sm leading-relaxed text-museum-muted">
                {featured.note}. Trace this journey, the people connected to
                it, and the broader migration current of the era.
              </p>
              <Link
                href={featured.href}
                className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-gold transition hover:text-museum-text"
              >
                <span className="border-b border-gold/60 pb-0.5">
                  Open this journey
                </span>
                <span aria-hidden>→</span>
              </Link>
            </motion.div>
          </motion.div>

          <p className="mt-4 text-[10px] uppercase tracking-[0.22em] text-museum-faint">
            Curated edition · auto-rotating every seven seconds
          </p>
        </motion.aside>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION DIVIDER                                                     */}
      {/* ------------------------------------------------------------------ */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-15% 0px" }}
        transition={{ duration: 0.8 }}
        className="mt-24 md:mt-32"
        id="replay"
      >
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-museum-faint">
          <span>Section II · Cartography of arrival</span>
          <span>1965 — {new Date().getFullYear()}</span>
        </div>
        <hr className="rule-gold mt-4" />
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/* THE REPLAY — animated map of post-1965 immigration                 */}
      {/* ------------------------------------------------------------------ */}
      {/* IMPORTANT: opacity-only animation. A `y` translate would set a
          non-identity transform on this element, which per CSS spec creates
          a containing block for any `position: fixed` descendants — that
          would scope the replay's fullscreen overlay to this section's box
          instead of the viewport. */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-10% 0px" }}
        transition={{ duration: 0.9, ease }}
        className="mt-10"
      >
        <Post1965Replay />
      </motion.section>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION III · Begin your own journey                                */}
      {/* ------------------------------------------------------------------ */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-10% 0px" }}
        transition={{ duration: 0.6 }}
        className="mt-28"
      >
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-museum-faint">
          <span>Section III · Begin</span>
          <span>Enter your family</span>
        </div>
        <hr className="rule-gold mt-4" />

        <div className="mt-10 grid grid-cols-1 items-start gap-10 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: 0.7, ease }}
          >
            <p className="folio">Plate III</p>
            <h3 className="mt-2 font-display text-4xl leading-tight text-museum-text md:text-5xl">
              Find yourself on the map.
            </h3>
            <p className="mt-4 max-w-md font-serif text-base leading-relaxed text-museum-muted">
              Enter a surname and the rough decade your family arrived. We will
              try to match passenger manifests, census records, and family
              trees — then draw the same kind of replay above, but anchored to
              one specific name.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={onStart} className="btn-primary">
                Trace a surname
              </button>
              <Link href="/explore" className="btn-secondary">
                Or browse 200+ figures
              </Link>
            </div>
          </motion.div>

          <motion.ul
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: 0.7, ease, delay: 0.1 }}
            className="space-y-3"
          >
            {[
              { title: "1. Passenger manifests", body: "Ellis Island and west-coast arrivals (1820 – 1957), searchable by surname and year." },
              { title: "2. Family trees", body: "WikiTree, FamilySearch, and your own GEDCOM upload — merged into one place-aware view." },
              { title: "3. Census demographics", body: "U.S. and state-level series so each individual story has a comparable national backdrop." },
            ].map((step) => (
              <li key={step.title} className="group border border-museum-border/15 bg-museum-surface/[0.03] p-5 transition hover:border-gold/40">
                <p className="font-display text-xl text-museum-text">{step.title}</p>
                <p className="mt-1 font-serif text-sm leading-relaxed text-museum-muted">
                  {step.body}
                </p>
              </li>
            ))}
          </motion.ul>
        </div>
      </motion.div>
    </section>
  );
}

// ----------------------------------------------------------------------------
// Local helpers
// ----------------------------------------------------------------------------

function Stat({
  label,
  value,
  suffix = "",
  prefix = "",
  format,
}: {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  format?: (n: number) => string;
}) {
  return (
    <div>
      <p className="font-display text-3xl text-museum-text md:text-4xl">
        <AnimatedCounter
          to={value}
          prefix={prefix}
          suffix={suffix}
          format={format}
        />
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-museum-faint">
        {label}
      </p>
    </div>
  );
}

function StaticStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-3xl text-museum-text md:text-4xl">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-museum-faint">
        {label}
      </p>
    </div>
  );
}

