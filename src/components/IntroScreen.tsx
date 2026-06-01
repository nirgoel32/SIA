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
import HomepageTour from "./HomepageTour";

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
  const [tourOpen, setTourOpen] = useState(false);

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
    <>
    <HomepageTour
      open={tourOpen}
      onClose={() => setTourOpen(false)}
      onTraceSurname={onStart}
    />
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
            <button
              type="button"
              onClick={() => setTourOpen(true)}
              className="btn-primary group relative overflow-hidden"
              aria-label="Open the guided tour"
            >
              <span className="relative z-10">▶ Take the tour</span>
            </button>
            <Link href="/explore" className="btn-secondary">
              Browse 200+ figures
            </Link>
            <button
              type="button"
              onClick={onStart}
              className="ml-auto text-xs uppercase tracking-[0.22em] text-museum-muted underline-offset-4 transition hover:text-gold hover:underline"
              title="Trace your family by entering a surname"
            >
              Or trace your own surname →
            </button>
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

      {/* ================================================================== */}
      {/* STATION I · Six Journeys — prominent demo grid                     */}
      {/* ================================================================== */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-15% 0px" }}
        transition={{ duration: 0.8 }}
        className="mt-24 md:mt-32"
        id="journeys"
      >
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-museum-faint">
          <span>Station I · Six Journeys</span>
          <span>Click any to open</span>
        </div>
        <hr className="rule-gold mt-4" />

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-[2fr_3fr] md:gap-10">
          <div>
            <p className="folio">What you&apos;re looking at</p>
            <h2 className="mt-2 font-display text-3xl leading-tight text-museum-text md:text-4xl">
              Start with a story.
            </h2>
            <p className="mt-4 max-w-md font-serif text-base leading-relaxed text-museum-muted">
              Six lives, six routes across the modern map of American
              immigration. Each profile is fully traced — family tree,
              migration log, historical context — built from open archives.
              Click any tile to follow that person&apos;s journey.
            </p>
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-museum-faint">
              ↓ Then keep scrolling to see the bigger picture
            </p>
          </div>

          <motion.ul
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-10% 0px" }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.08 } },
            }}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            {FEATURED.map((fig, idx) => (
              <motion.li
                key={fig.href}
                variants={{
                  hidden: { opacity: 0, y: 14 },
                  visible: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.5, ease }}
              >
                <Link
                  href={fig.href}
                  className="group block h-full border border-museum-border/15 bg-museum-surface/[0.03] p-5 transition hover:-translate-y-0.5 hover:border-gold/60 hover:bg-museum-surface/[0.06]"
                >
                  <div className="flex items-baseline justify-between">
                    <p className="folio">Plate {String(idx + 1).padStart(2, "0")}</p>
                    <span className="font-mono text-[10px] tracking-normal text-museum-faint">
                      {fig.dates}
                    </span>
                  </div>
                  <h3 className="mt-3 font-display text-xl leading-tight text-museum-text transition-colors group-hover:text-gold">
                    {fig.name}
                  </h3>
                  <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-gold/90">
                    {fig.route}
                  </p>
                  <p className="mt-3 font-serif text-xs leading-relaxed text-museum-muted">
                    {fig.note}.
                  </p>
                  <p className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-gold">
                    <span className="border-b border-gold/60 pb-0.5">Open journey</span>
                    <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
                  </p>
                </Link>
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </motion.div>

      {/* ================================================================== */}
      {/* STATION II · The Map — tour callout + the visualization             */}
      {/* ================================================================== */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-15% 0px" }}
        transition={{ duration: 0.8 }}
        className="mt-24 md:mt-32"
        id="replay"
      >
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-museum-faint">
          <span>Station II · The Map</span>
          <span>1965 — {new Date().getFullYear()}</span>
        </div>
        <hr className="rule-gold mt-4" />

        {/* Tour callout — what you're seeing + what each control does. */}
        <div className="mt-10 border border-museum-border/15 bg-museum-surface/[0.03] p-6 md:p-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[2fr_3fr] md:gap-10">
            <div>
              <p className="folio">What you&apos;re looking at</p>
              <h3 className="mt-2 font-display text-2xl leading-tight text-museum-text md:text-3xl">
                Then zoom out to 60 years.
              </h3>
              <p className="mt-3 font-serif text-sm leading-relaxed text-museum-muted">
                Every major immigration corridor to the United States from
                1965 to today, drawn as a glowing arc from origin to U.S.
                gateway city. Planes carry the year&apos;s flows; the network
                grows cumulatively as time advances.
              </p>
            </div>
            <div>
              <p className="folio">Try the controls</p>
              <ul className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {[
                  { key: "▶", title: "Play replay", body: "Watch six decades of corridors light up year by year." },
                  { key: "◐", title: "Globe view", body: "Switch to a 3D rotating Earth. Drag to spin it." },
                  { key: "⇆", title: "Compare 1965", body: "See what immigration would look like if the Act hadn't passed. Drag the splitter." },
                  { key: "⤢", title: "Expand map", body: "Open the full map in browser fullscreen." },
                ].map((c) => (
                  <li key={c.title} className="border-l-2 border-gold/70 pl-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
                      <span className="mr-2" aria-hidden>{c.key}</span>{c.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-snug text-museum-muted">
                      {c.body}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </motion.div>

      {/* The replay itself.
          IMPORTANT: opacity-only animation. A `y` translate would set a
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

      {/* ================================================================== */}
      {/* STATION III · A small footer invitation to enter your own surname.   */}
      {/* Deliberately compact — the tour's emphasis is on the curated         */}
      {/* journeys above, not on the surname-tracing feature.                  */}
      {/* ================================================================== */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-10% 0px" }}
        transition={{ duration: 0.6 }}
        className="mt-24"
      >
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-museum-faint">
          <span>Station III · Optional · Bring your own</span>
          <span>One more step</span>
        </div>
        <hr className="rule-gold mt-4" />

        <div className="mt-8 grid grid-cols-1 items-center gap-6 border border-museum-border/15 bg-museum-surface/[0.03] p-6 md:grid-cols-[2fr_1fr] md:gap-10 md:p-8">
          <div>
            <p className="folio">Have a family story?</p>
            <h3 className="mt-2 font-display text-2xl leading-tight text-museum-text md:text-3xl">
              Try entering your own surname.
            </h3>
            <p className="mt-3 max-w-xl font-serif text-sm leading-relaxed text-museum-muted">
              We&apos;ll search passenger manifests, census records, and
              public family trees, then draw a replay anchored to your name.
              Works best for an Ellis-Island-era surname, but anything goes.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <button type="button" onClick={onStart} className="btn-secondary">
              Trace a surname →
            </button>
            <Link
              href="/my-family"
              className="text-xs uppercase tracking-[0.22em] text-museum-muted underline-offset-4 transition hover:text-gold hover:underline"
            >
              Or upload a GEDCOM file
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
    </>
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

