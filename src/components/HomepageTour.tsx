import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import { YEAR_MAX, YEAR_MIN, POST_1965_DATA } from "@/data/post-1965-flows";

// Heavy visualizations — loaded only when the slide that needs them is
// active, so opening the tour doesn't shove the entire d3 / topojson /
// world-atlas chunk at the user on slide 1.
const Post1965Replay = dynamic(() => import("./Post1965Replay"), {
  ssr: false,
  loading: () => <SlideLoader label="Building the map" />,
});
const Post1965Globe = dynamic(() => import("./Post1965Globe"), {
  ssr: false,
  loading: () => <SlideLoader label="Building the planet" />,
});
const CompositionChart = dynamic(() => import("./CompositionChart"), {
  ssr: false,
  loading: () => <SlideLoader label="Stacking the years" />,
});

const ease = [0.22, 1, 0.36, 1] as const;

type Figure = {
  href: string;
  name: string;
  dates: string;
  route: string;
  note: string;
  /** Hero arrival year highlighted in the preview. */
  arrived: string;
  /** 2–3 sentence narrative shown in the preview. */
  summary: string;
  /** 4–5 key moments shown as a mini timeline. */
  moments: { year: string; label: string }[];
};

const FEATURED: Figure[] = [
  {
    href: "/journey?firstName=Marie&surname=Curie",
    name: "Marie Skłodowska-Curie",
    dates: "1867 – 1934",
    route: "Warsaw → Paris",
    note: "Physicist · two-time Nobel laureate",
    arrived: "Paris, 1891",
    summary:
      "From Russian-occupied Warsaw to the laboratories of Paris. Marie crossed Europe at 23 to attend the Sorbonne — Polish women were barred from Russian-controlled universities. She would become the first person ever to win two Nobel Prizes, in two different sciences.",
    moments: [
      { year: "1867", label: "Born in Russian Warsaw" },
      { year: "1885", label: "Joins the clandestine ‘Flying University’" },
      { year: "1891", label: "Arrives in Paris; enrolls at the Sorbonne" },
      { year: "1903", label: "First Nobel Prize (Physics)" },
      { year: "1911", label: "Second Nobel Prize (Chemistry)" },
    ],
  },
  {
    href: "/journey?firstName=Albert&surname=Einstein",
    name: "Albert Einstein",
    dates: "1879 – 1955",
    route: "Ulm → Berlin → Princeton",
    note: "Refugee from Nazi Germany, 1933",
    arrived: "Princeton, 1933",
    summary:
      "Born in newly-unified Germany, Einstein renounced his citizenship at sixteen and lived stateless for five years. He was on a US lecture tour when Hitler took power in 1933 — and never returned to Germany. He spent his final 22 years at Princeton's Institute for Advanced Study.",
    moments: [
      { year: "1879", label: "Born in Ulm, Württemberg" },
      { year: "1905", label: "Annus mirabilis — four physics papers" },
      { year: "1921", label: "Nobel Prize in Physics" },
      { year: "1933", label: "Flees Germany for the Institute for Advanced Study" },
      { year: "1940", label: "Becomes a US citizen" },
    ],
  },
  {
    href: "/journey?firstName=Hannah&surname=Arendt",
    name: "Hannah Arendt",
    dates: "1906 – 1975",
    route: "Hanover → Paris → New York",
    note: "Stateless 1937 – 1951; interned at Gurs",
    arrived: "New York, 1941",
    summary:
      "Arrested by the Gestapo in 1933, Arendt fled Germany the same week. After eight years across Czechoslovakia, France, and Camp Gurs in Vichy France, she reached New York via Lisbon on emergency visas. She was stateless for 18 years.",
    moments: [
      { year: "1906", label: "Born in Hanover" },
      { year: "1929", label: "PhD under Karl Jaspers in Heidelberg" },
      { year: "1933", label: "Flees Germany via Czechoslovakia" },
      { year: "1940", label: "Interned by Vichy France at Camp Gurs" },
      { year: "1941", label: "Reaches New York via Marseille and Lisbon" },
      { year: "1951", label: "US citizen; The Origins of Totalitarianism" },
    ],
  },
  {
    href: "/journey?firstName=Madeleine&surname=Albright",
    name: "Madeleine Albright",
    dates: "1937 – 2022",
    route: "Prague → London → Denver",
    note: "First woman U.S. Secretary of State",
    arrived: "New York, 1948",
    summary:
      "Born in Prague three years before the Nazi invasion, she fled twice as a child — from Hitler in 1939, then from the Communists in 1948. She became a US citizen at 20, Secretary of State at 59, and learned only in middle age that three of her grandparents had died at Terezín and Auschwitz.",
    moments: [
      { year: "1937", label: "Born Marie Jana Korbelová in Prague" },
      { year: "1939", label: "Family escapes Nazi invasion to London" },
      { year: "1948", label: "Family flees Communist coup to the US" },
      { year: "1957", label: "Becomes a US citizen; enrolls at Wellesley" },
      { year: "1997", label: "First woman US Secretary of State" },
    ],
  },
  {
    href: "/journey?firstName=Andrew&surname=Carnegie",
    name: "Andrew Carnegie",
    dates: "1835 – 1919",
    route: "Dunfermline → Pittsburgh",
    note: "Steel king · arrived 1848 at age 12",
    arrived: "New York, 1848",
    summary:
      "When power looms destroyed his weaver father's livelihood in Scotland, twelve-year-old Andrew crossed the Atlantic in steerage. He worked his way up from bobbin boy to telegrapher to railroad executive to steel king. By his death in 1919 he had given away ~$350 million to build 2,500 public libraries.",
    moments: [
      { year: "1835", label: "Born in Dunfermline, Scotland" },
      { year: "1848", label: "Family sails from Glasgow to New York" },
      { year: "1865", label: "Founds Keystone Bridge Company" },
      { year: "1873", label: "Builds the Edgar Thomson Steel Works" },
      { year: "1901", label: "Sells Carnegie Steel for $480M to JP Morgan" },
      { year: "1919", label: "Dies having given away ~90% of his fortune" },
    ],
  },
  {
    href: "/journey?firstName=Sergey&surname=Brin",
    name: "Sergey Brin",
    dates: "born 1973",
    route: "Moscow → Maryland → Stanford",
    note: "Soviet-Jewish refugee, 1979 · co-founded Google",
    arrived: "Maryland, 1979",
    summary:
      "Six-year-old Sergey Brin landed in College Park, Maryland in 1979 as one of ~28,000 Soviet-Jewish refugees admitted under the Jackson-Vanik amendment — a Cold-War immigration deal that conditioned US trade on the right of Soviet Jews to leave. Two decades later he co-founded Google.",
    moments: [
      { year: "1973", label: "Born in Moscow to mathematician parents" },
      { year: "1979", label: "Family flees USSR via Vienna and Rome" },
      { year: "1990", label: "Enters University of Maryland at 17" },
      { year: "1995", label: "Meets Larry Page at Stanford" },
      { year: "1998", label: "Google incorporated in a Menlo Park garage" },
    ],
  },
];

const SLIDES = [
  { label: "Welcome", folio: "Volume I" },
  { label: "Six lives", folio: "Station I" },
  { label: "1965", folio: "Station II" },
  { label: "The map", folio: "Station III" },
  { label: "The globe", folio: "Station IV" },
  { label: "Composition over time", folio: "Station V" },
  { label: "Stacked annual arrivals", folio: "Station VI" },
  { label: "What could have been", folio: "Station VII" },
  { label: "Your turn", folio: "Station VIII" },
] as const;

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called when the user picks "Trace a surname" on the final slide. */
  onTraceSurname?: () => void;
};

export default function HomepageTour({ open, onClose, onTraceSurname }: Props) {
  const [slide, setSlide] = useState(0);
  const [direction, setDirection] = useState(1);

  const goTo = useCallback((i: number) => {
    setDirection(i > slide ? 1 : -1);
    setSlide(Math.max(0, Math.min(SLIDES.length - 1, i)));
  }, [slide]);

  const next = useCallback(() => goTo(slide + 1), [slide, goTo]);
  const prev = useCallback(() => goTo(slide - 1), [slide, goTo]);

  // Reset to slide 0 each time the tour opens.
  useEffect(() => {
    if (open) {
      setSlide(0);
      setDirection(1);
    }
  }, [open]);

  // Keyboard navigation + body scroll lock while the tour is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      // Don't hijack keys while the user is typing in an input.
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (e.key === "Escape") { e.preventDefault(); onClose(); }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, next, prev, onClose]);

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? "8%" : "-8%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? "-8%" : "8%", opacity: 0 }),
  } as const;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[80] flex flex-col bg-museum-bg"
          role="dialog"
          aria-modal="true"
          aria-label="Immigration Journey tour"
        >
          {/* ----- Top bar — folio + counter + close ----- */}
          <header className="flex shrink-0 items-center justify-between border-b border-museum-border/15 bg-museum-bg/95 px-6 py-3 backdrop-blur md:px-10">
            <div className="flex items-baseline gap-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-museum-faint">
                {SLIDES[slide].folio} · {SLIDES[slide].label}
              </p>
            </div>
            <p className="font-mono text-xs text-museum-muted">
              <span className="text-gold">{String(slide + 1).padStart(2, "0")}</span>
              <span className="mx-1">/</span>
              <span>{String(SLIDES.length).padStart(2, "0")}</span>
            </p>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 border border-museum-border/25 bg-museum-bg/90 px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-museum-muted transition hover:border-gold/60 hover:text-gold"
              aria-label="Exit tour (Esc)"
            >
              <span aria-hidden>✕</span>
              <span>Exit · Esc</span>
            </button>
          </header>

          {/* Top progress rule */}
          <div className="h-px shrink-0 bg-museum-border/15">
            <motion.div
              initial={false}
              animate={{ width: `${((slide + 1) / SLIDES.length) * 100}%` }}
              transition={{ duration: 0.5, ease }}
              className="h-full bg-gold"
            />
          </div>

          {/* ----- Slide content area ----- */}
          <main className="relative flex-1 overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={slide}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.45, ease }}
                className="absolute inset-0 overflow-y-auto"
              >
                {renderSlide(slide, { onClose, onTraceSurname, next })}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* ----- Bottom bar — prev / dots / next ----- */}
          <footer className="flex shrink-0 items-center justify-between border-t border-museum-border/15 bg-museum-bg/95 px-6 py-3 backdrop-blur md:px-10">
            <button
              type="button"
              onClick={prev}
              disabled={slide === 0}
              className="inline-flex items-center gap-2 border border-museum-border/20 bg-museum-bg/70 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-museum-muted transition hover:border-gold/50 hover:text-gold disabled:opacity-30"
              aria-label="Previous slide"
            >
              <span aria-hidden>‹</span><span className="hidden sm:inline">Prev</span>
            </button>

            <div className="flex items-center gap-2" role="tablist" aria-label="Tour slides">
              {SLIDES.map((s, i) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => goTo(i)}
                  className="group relative"
                  role="tab"
                  aria-selected={slide === i}
                  aria-label={`Go to ${s.label}`}
                  title={`${s.folio} · ${s.label}`}
                >
                  <span
                    className={`block h-1.5 transition-all ${
                      slide === i
                        ? "w-8 bg-gold"
                        : "w-2 bg-gold/25 group-hover:bg-gold/60"
                    }`}
                  />
                </button>
              ))}
            </div>

            {slide < SLIDES.length - 1 ? (
              <button
                type="button"
                onClick={next}
                className="inline-flex items-center gap-2 border border-gold/50 bg-gold/[0.08] px-4 py-2 text-xs uppercase tracking-[0.22em] text-gold transition hover:border-gold hover:bg-gold/[0.16]"
                aria-label="Next slide"
              >
                <span className="hidden sm:inline">Next</span><span aria-hidden>›</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 border border-gold/50 bg-gold/[0.08] px-4 py-2 text-xs uppercase tracking-[0.22em] text-gold transition hover:border-gold hover:bg-gold/[0.16]"
              >
                <span>Finish tour</span><span aria-hidden>✓</span>
              </button>
            )}
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ----------------------------------------------------------------------------
// Slide router
// ----------------------------------------------------------------------------

type SlideCtx = {
  onClose: () => void;
  onTraceSurname?: () => void;
  next: () => void;
};

function renderSlide(idx: number, ctx: SlideCtx) {
  switch (idx) {
    case 0: return <WelcomeSlide next={ctx.next} />;
    case 1: return <SixLivesSlide onClose={ctx.onClose} />;
    case 2: return <HartCellerSlide />;
    case 3: return <MapSlide />;
    case 4: return <GlobeSlide />;
    case 5: return <CompositionSlide />;
    case 6: return <StackedArrivalsSlide />;
    case 7: return <CounterfactualSlide />;
    case 8: return <YourTurnSlide onClose={ctx.onClose} onTraceSurname={ctx.onTraceSurname} />;
    default: return null;
  }
}

// ----------------------------------------------------------------------------
// SLIDE 0 · Welcome
// ----------------------------------------------------------------------------

function WelcomeSlide({ next }: { next: () => void }) {
  return (
    <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
      {/* Decorative orbit ring behind the title */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 0.18, scale: 1 }}
        transition={{ duration: 1.4, ease }}
        className="pointer-events-none absolute h-[520px] w-[520px] rounded-full border border-gold/30"
      />
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: 0.10, scale: 1 }}
        transition={{ duration: 1.6, ease, delay: 0.1 }}
        className="pointer-events-none absolute h-[260px] w-[260px] rounded-full border border-gold/40"
      />

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease, delay: 0.1 }}
        className="folio relative"
      >
        Volume I · A 5-minute tour
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease, delay: 0.2 }}
        className="font-display relative mt-6 text-5xl font-medium leading-[1.02] tracking-tight text-museum-text md:text-7xl lg:text-[6rem]"
      >
        Every American story
        <br />
        <span className="italic text-gold">begins somewhere.</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, ease, delay: 0.5 }}
        className="relative mt-8 max-w-2xl font-serif text-lg text-museum-muted md:text-xl"
      >
        Seven stations through 60 years of American immigration — six real
        lives, a turning Earth, and the law that opened the gates.
      </motion.p>

      <motion.button
        type="button"
        onClick={next}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease, delay: 0.8 }}
        className="relative mt-12 inline-flex items-center gap-3 border border-gold/50 bg-gold/[0.08] px-6 py-3 text-sm uppercase tracking-[0.22em] text-gold transition hover:border-gold hover:bg-gold/[0.16]"
      >
        <span>Begin</span>
        <motion.span
          aria-hidden
          animate={{ x: [0, 4, 0] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
        >
          →
        </motion.span>
      </motion.button>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="relative mt-8 font-mono text-[10px] uppercase tracking-[0.22em] text-museum-faint"
      >
        Or press → / Space to advance · Esc to exit
      </motion.p>
    </div>
  );
}

// ----------------------------------------------------------------------------
// SLIDE 1 · Six Lives — clicking a tile opens an IN-TOUR preview, not a new
// page. The user reads the figure's story right here without leaving the
// tour, and only opens the full journey (in a new tab) if they want depth.
// ----------------------------------------------------------------------------

function SixLivesSlide({ onClose: _onClose }: { onClose: () => void }) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // Local Esc handler — closes the preview overlay (not the whole tour).
  // The tour's outer keyboard listener also responds to Esc but that one
  // is intercepted here because this fires first via stopPropagation.
  useEffect(() => {
    if (selectedIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setSelectedIdx(null);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [selectedIdx]);

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col px-6 py-8 md:py-12">
      <AnimatePresence mode="wait">
        {selectedIdx === null ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex h-full flex-col"
          >
            <div className="text-center">
              <p className="folio">Station I · Six Real Lives</p>
              <h2 className="mt-3 font-display text-4xl leading-tight text-museum-text md:text-5xl">
                Start with a story.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl font-serif text-base leading-relaxed text-museum-muted">
                Six immigrants, six routes across the modern map. Click any
                tile to read their story right here — you can open the full
                interactive journey afterward.
              </p>
            </div>

            <motion.ul
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.07 } },
              }}
              className="mt-10 grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              {FEATURED.map((fig, idx) => (
                <motion.li
                  key={fig.href}
                  variants={{
                    hidden: { opacity: 0, y: 14 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.45, ease }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedIdx(idx)}
                    className="group flex h-full w-full flex-col border border-museum-border/15 bg-museum-surface/[0.03] p-5 text-left transition hover:-translate-y-0.5 hover:border-gold/60 hover:bg-museum-surface/[0.06]"
                  >
                    <div className="flex items-baseline justify-between">
                      <p className="folio">Plate {String(idx + 1).padStart(2, "0")}</p>
                      <span className="font-mono text-[10px] tracking-normal text-museum-faint">{fig.dates}</span>
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
                    <p className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[11px] font-medium uppercase tracking-[0.18em] text-gold">
                      <span className="border-b border-gold/60 pb-0.5">Read the story</span>
                      <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
                    </p>
                  </button>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
        ) : (
          <FigurePreview
            key={`preview-${selectedIdx}`}
            figure={FEATURED[selectedIdx]}
            onBack={() => setSelectedIdx(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// In-tour preview for a single figure. Renders inside the Six Lives slide
// instead of navigating away. "See full interactive journey" opens the
// journey page in a new tab so the tour stays open in the original tab.
function FigurePreview({ figure, onBack }: { figure: Figure; onBack: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.35, ease }}
      className="flex h-full flex-col"
    >
      {/* Back row */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 border border-museum-border/20 bg-museum-bg/70 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-museum-muted transition hover:border-gold/60 hover:text-gold"
        >
          <span aria-hidden>←</span>
          <span>Back to six lives</span>
        </button>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-museum-faint">
          One of six
        </p>
      </div>

      {/* Hero */}
      <div className="mt-8 grid grid-cols-1 gap-10 md:grid-cols-[3fr_2fr]">
        <div>
          <p className="folio">{figure.dates}</p>
          <h2 className="mt-3 font-display text-4xl leading-tight text-museum-text md:text-5xl">
            {figure.name}
          </h2>
          <p className="mt-3 font-mono text-xs uppercase tracking-[0.22em] text-gold">
            {figure.route}
          </p>
          <p className="mt-6 font-serif text-base leading-relaxed text-museum-muted">
            {figure.summary}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={figure.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-gold/50 bg-gold/[0.08] px-4 py-2 text-xs uppercase tracking-[0.22em] text-gold transition hover:border-gold hover:bg-gold/[0.16]"
              title="Opens the full interactive journey in a new tab"
            >
              <span>See full interactive journey</span>
              <span aria-hidden>↗</span>
            </a>
            <button
              type="button"
              onClick={onBack}
              className="text-xs uppercase tracking-[0.22em] text-museum-muted underline-offset-4 transition hover:text-gold hover:underline"
            >
              Or continue the tour →
            </button>
          </div>

          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-museum-faint">
            ↗ Opens in a new tab so the tour stays open here.
          </p>
        </div>

        {/* Mini timeline of key moments */}
        <div className="border border-museum-border/15 bg-museum-surface/[0.03] p-5">
          <p className="folio">Arrived {figure.arrived}</p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-museum-muted">
            Key moments
          </p>
          <ol className="mt-4 space-y-3 border-l border-museum-border/20">
            {figure.moments.map((m, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i + 0.15, duration: 0.4, ease }}
                className="relative pl-4"
              >
                <span
                  aria-hidden
                  className="absolute left-[-4px] top-1.5 block h-1.5 w-1.5 rounded-full bg-gold"
                />
                <p className="font-mono text-xs text-gold">{m.year}</p>
                <p className="mt-0.5 font-serif text-sm leading-snug text-museum-text">
                  {m.label}
                </p>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </motion.div>
  );
}

// ----------------------------------------------------------------------------
// SLIDE 2 · 1965 / Hart-Celler
// ----------------------------------------------------------------------------

function HartCellerSlide() {
  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col items-center justify-center px-6 py-12 text-center">
      <p className="folio">Station II · The Act</p>

      <motion.p
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease }}
        className="font-display mt-6 text-[8rem] leading-none tracking-tight text-gold md:text-[12rem]"
      >
        1965
      </motion.p>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease, delay: 0.3 }}
        className="mt-2 font-display text-xl text-museum-text md:text-2xl"
      >
        October 3 · Hart–Celler signed at the foot of the Statue of Liberty.
      </motion.p>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.15, delayChildren: 0.55 } } }}
        className="mt-12 grid w-full grid-cols-1 gap-6 md:grid-cols-3"
      >
        {[
          { folio: "Before", color: "border-brick", title: "Quotas", body: "92% of immigration slots reserved for Northern and Western Europe under the 1924 National Origins Act." },
          { folio: "After", color: "border-gold", title: "Opened", body: "First-come / first-served, family reunification, and skilled workers — open to every country." },
          { folio: "Result", color: "border-museum-border/40", title: "60 years on", body: "From a 9-in-10 European immigration system to a flow that draws from every continent." },
        ].map((c) => (
          <motion.div
            key={c.folio}
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.55, ease }}
            className={`${c.color} border-l-2 pl-4 text-left`}
          >
            <p className="folio">{c.folio}</p>
            <p className="mt-2 font-display text-2xl text-museum-text">{c.title}</p>
            <p className="mt-2 font-serif text-sm leading-relaxed text-museum-muted">{c.body}</p>
          </motion.div>
        ))}
      </motion.div>

      <motion.blockquote
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.7 }}
        className="mt-12 max-w-2xl font-serif text-base italic leading-relaxed text-museum-muted md:text-lg"
      >
        &ldquo;This bill that we sign today is not a revolutionary bill… Yet it does repair a very deep and painful flaw in the fabric of American justice.&rdquo;
        <footer className="mt-3 text-[10px] uppercase tracking-[0.22em] not-italic text-museum-faint">
          — Lyndon B. Johnson, signing speech
        </footer>
      </motion.blockquote>
    </div>
  );
}

// ----------------------------------------------------------------------------
// SLIDE 3 · The Map
// ----------------------------------------------------------------------------

function MapSlide() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8 md:py-10">
      <div className="text-center">
        <p className="folio">Station III · The Map</p>
        <h2 className="mt-3 font-display text-3xl leading-tight text-museum-text md:text-4xl">
          How America&apos;s gates opened.
        </h2>
        <p className="mx-auto mt-3 max-w-2xl font-serif text-sm leading-relaxed text-museum-muted">
          Six decades of immigration corridors. Press <span className="text-gold">▶ Play replay</span> to
          watch the network accumulate, then try{" "}
          <span className="text-gold">◐ Globe</span>,{" "}
          <span className="text-gold">⇆ Compare 1965</span>, or{" "}
          <span className="text-gold">⤢ Expand</span>.
        </p>
      </div>
      <div className="mt-6">
        <Post1965Replay />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// SLIDE 4 · The Globe (slide-local year + play state)
// ----------------------------------------------------------------------------

function GlobeSlide() {
  const [year, setYear] = useState(YEAR_MIN);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      setYear((y) => (y >= YEAR_MAX ? YEAR_MIN : y + 1));
    }, 1800);
    return () => clearTimeout(t);
  }, [playing, year]);

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col px-6 py-8">
      <div className="text-center">
        <p className="folio">Station IV · The Living Globe</p>
        <h2 className="mt-3 font-display text-3xl leading-tight text-museum-text md:text-4xl">
          A planet in motion.
        </h2>
        <p className="mx-auto mt-3 max-w-2xl font-serif text-sm leading-relaxed text-museum-muted">
          The same data on a turning Earth. Each plane follows a real
          great-circle path; when it crosses the back of the globe it
          disappears and reappears as the planet rotates into view.{" "}
          <span className="text-gold">Grab the globe and drag.</span>
        </p>
      </div>

      <div className="mt-4 grid flex-1 grid-cols-1 gap-4 md:grid-cols-[3fr_2fr]">
        <div className="relative min-h-[420px] overflow-hidden border border-museum-border/[0.12] bg-museum-bg shadow-[var(--shadow-card)]">
          <Post1965Globe year={year} />
        </div>
        <div className="space-y-4 border border-museum-border/[0.12] bg-museum-surface/[0.03] p-5">
          <div>
            <p className="folio">In flight</p>
            <p className="mt-1 font-display text-5xl leading-none text-museum-text">{year}</p>
            <p className="mt-1 font-mono text-xs uppercase tracking-[0.22em] text-gold">
              {getEventForYear(year)?.event ?? "—"}
            </p>
          </div>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="inline-flex w-full items-center justify-center gap-2 border border-gold/50 bg-gold/[0.08] px-4 py-2 text-xs uppercase tracking-[0.22em] text-gold transition hover:border-gold hover:bg-gold/[0.16]"
            >
              <span aria-hidden>{playing ? "❚❚" : "▶"}</span>
              <span>{playing ? "Pause replay" : "Play replay"}</span>
            </button>
            <input
              type="range"
              min={YEAR_MIN}
              max={YEAR_MAX}
              step={1}
              value={year}
              onChange={(e) => { setPlaying(false); setYear(Number(e.target.value)); }}
              className="h-2 w-full cursor-pointer appearance-none bg-museum-border/30 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:bg-gold [&::-webkit-slider-thumb]:shadow-[0_0_0_3px_rgba(201,162,74,0.22)] [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-2 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-sm [&::-moz-range-thumb]:bg-gold"
              aria-label="Year"
            />
            <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-museum-faint">
              <span>{YEAR_MIN}</span>
              <span>{YEAR_MAX}</span>
            </div>
          </div>
          <hr className="border-museum-border/15" />
          <div className="space-y-1.5 text-[10px] uppercase tracking-[0.18em] text-museum-muted">
            <p className="text-museum-text">How to use it</p>
            <p>· <span className="text-gold">Drag</span> the globe to spin</p>
            <p>· <span className="text-gold">Scroll</span> the year slider</p>
            <p>· Planes hide behind the curve</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function getEventForYear(year: number): { event: string } | undefined {
  return POST_1965_DATA.find((d) => d.year === year && d.event) as { event: string } | undefined;
}

// ----------------------------------------------------------------------------
// SLIDE 5 · Composition over time — the stacked-area chart on its own slide.
// Slide-local year + autoplay so the playhead can sweep on its own.
// ----------------------------------------------------------------------------

function CompositionSlide() {
  const [year, setYear] = useState(YEAR_MIN);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      setYear((y) => (y >= YEAR_MAX ? YEAR_MIN : y + 1));
    }, 600);
    return () => clearTimeout(t);
  }, [playing, year]);

  const togglePlay = () => {
    if (year >= YEAR_MAX) setYear(YEAR_MIN);
    setPlaying((p) => !p);
  };

  const eventInfo = getEventForYear(year);

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col px-6 py-8">
      <div className="text-center">
        <p className="folio">Station V · Plate II · b — Composition over time</p>
        <h2 className="mt-3 font-display text-3xl leading-tight text-museum-text md:text-4xl">
          The share of every region, every year.
        </h2>
        <p className="mx-auto mt-3 max-w-2xl font-serif text-sm leading-relaxed text-museum-muted">
          Every annual cohort, stacked by region of origin. In 1965 the
          bands are nearly all <span className="text-gold">European</span>.
          By 2024, <span className="text-gold">Asia</span> and{" "}
          <span className="text-gold">Latin America</span> dominate.
          Press play to watch the playhead sweep, or click anywhere on the
          chart to jump to that year.
        </p>
      </div>

      <div className="mt-6">
        <CompositionChart
          year={year}
          onScrub={(y) => {
            setPlaying(false);
            setYear(y);
          }}
        />
      </div>

      <div className="mt-4 flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setPlaying(false); setYear(Math.max(YEAR_MIN, year - 1)); }}
            disabled={year <= YEAR_MIN}
            className="border border-museum-border/20 bg-museum-bg/70 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-museum-muted transition hover:border-gold/50 hover:text-gold disabled:opacity-30"
            aria-label="Previous year"
          >
            ‹ Prev
          </button>
          <button
            type="button"
            onClick={togglePlay}
            className="inline-flex items-center gap-2 border border-gold/50 bg-gold/[0.08] px-4 py-2 text-xs uppercase tracking-[0.22em] text-gold transition hover:border-gold hover:bg-gold/[0.16]"
          >
            <span aria-hidden>{playing ? "❚❚" : "▶"}</span>
            <span>{playing ? "Pause" : "Play through 60 years"}</span>
          </button>
          <button
            type="button"
            onClick={() => { setPlaying(false); setYear(Math.min(YEAR_MAX, year + 1)); }}
            disabled={year >= YEAR_MAX}
            className="border border-museum-border/20 bg-museum-bg/70 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-museum-muted transition hover:border-gold/50 hover:text-gold disabled:opacity-30"
            aria-label="Next year"
          >
            Next ›
          </button>
        </div>
        {eventInfo && (
          <p className="max-w-2xl text-center font-serif text-xs italic leading-snug text-museum-muted">
            <span className="text-gold">{year}:</span> {eventInfo.event}
          </p>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// SLIDE 6 · Stacked annual arrivals — the same chart, but framed around the
// magnitude story (totals, peaks, troughs) instead of the regional shift.
// Plays back from the chart's own perspective: starts at YEAR_MAX so the
// reader sees the full six-decade silhouette first, then can scrub backward.
// ----------------------------------------------------------------------------

function StackedArrivalsSlide() {
  const [year, setYear] = useState(YEAR_MAX);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      setYear((y) => (y >= YEAR_MAX ? YEAR_MIN : y + 1));
    }, 600);
    return () => clearTimeout(t);
  }, [playing, year]);

  const togglePlay = () => {
    if (year >= YEAR_MAX) setYear(YEAR_MIN);
    setPlaying((p) => !p);
  };

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col px-6 py-8">
      <div className="text-center">
        <p className="folio">Station VI · Plate II · b</p>
        <h2 className="mt-3 font-display text-3xl leading-tight text-museum-text md:text-4xl">
          Stacked annual arrivals by region, 1965 — 2024.
        </h2>
        <p className="mx-auto mt-3 max-w-2xl font-serif text-sm leading-relaxed text-museum-muted">
          The same six decades, this time read for{" "}
          <span className="text-gold">magnitude</span>. From{" "}
          <span className="text-gold">~296K</span> in 1965 to the{" "}
          <span className="text-gold">1.5M</span> IRCA peak of 1990, then a
          gradual climb back through 2024. The dashed line is the total;
          the bands show what made up each year&apos;s arrivals.
        </p>
      </div>

      <div className="mt-6">
        <CompositionChart
          year={year}
          onScrub={(y) => {
            setPlaying(false);
            setYear(y);
          }}
        />
      </div>

      <div className="mt-4 flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setPlaying(false); setYear(Math.max(YEAR_MIN, year - 1)); }}
            disabled={year <= YEAR_MIN}
            className="border border-museum-border/20 bg-museum-bg/70 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-museum-muted transition hover:border-gold/50 hover:text-gold disabled:opacity-30"
            aria-label="Previous year"
          >
            ‹ Prev
          </button>
          <button
            type="button"
            onClick={togglePlay}
            className="inline-flex items-center gap-2 border border-gold/50 bg-gold/[0.08] px-4 py-2 text-xs uppercase tracking-[0.22em] text-gold transition hover:border-gold hover:bg-gold/[0.16]"
          >
            <span aria-hidden>{playing ? "❚❚" : "▶"}</span>
            <span>{playing ? "Pause" : "Play through 60 years"}</span>
          </button>
          <button
            type="button"
            onClick={() => { setPlaying(false); setYear(Math.min(YEAR_MAX, year + 1)); }}
            disabled={year >= YEAR_MAX}
            className="border border-museum-border/20 bg-museum-bg/70 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-museum-muted transition hover:border-gold/50 hover:text-gold disabled:opacity-30"
            aria-label="Next year"
          >
            Next ›
          </button>
        </div>
        <div className="grid max-w-3xl grid-cols-2 gap-4 text-center md:grid-cols-4">
          {[
            { label: "1965 total", value: "~296K" },
            { label: "1990 peak (IRCA)", value: "~1.54M" },
            { label: "2020 pandemic floor", value: "~707K" },
            { label: "2024 total", value: "~1.28M" },
          ].map((s) => (
            <div key={s.label} className="border-l-2 border-gold/40 pl-3 text-left">
              <p className="font-display text-base leading-none text-museum-text">{s.value}</p>
              <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-museum-faint">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// SLIDE 7 · Counterfactual — what could have been
// ----------------------------------------------------------------------------

function CounterfactualSlide() {
  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col items-center justify-center px-6 py-12 text-center">
      <p className="folio">Station VII · The Counterfactual</p>
      <h2 className="mt-4 font-display text-4xl leading-tight text-museum-text md:text-5xl">
        What if 1965 hadn&apos;t passed?
      </h2>
      <p className="mx-auto mt-4 max-w-2xl font-serif text-base leading-relaxed text-museum-muted">
        Two Americas, side by side — the one we got and the one that would have
        existed under the 1924 quota system, indefinitely.
      </p>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.15 } } }}
        className="mt-10 grid w-full grid-cols-1 gap-6 md:grid-cols-2"
      >
        {/* Counterfactual side */}
        <motion.div
          variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }}
          transition={{ duration: 0.7, ease }}
          className="border-l-2 border-brick pl-5 text-left"
        >
          <p className="folio text-brick">If the Act hadn&apos;t passed</p>
          <p className="mt-3 font-display text-6xl leading-none text-museum-text">
            ~150K
            <span className="ml-2 font-mono text-base text-museum-muted">/ year</span>
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-museum-faint">
            1924 quotas continue
          </p>
          <ul className="mt-6 space-y-2 font-serif text-sm leading-relaxed text-museum-muted">
            <li>· ~70% from UK, Germany, Ireland</li>
            <li>· Effectively closed to Asia (105 slots/yr for China)</li>
            <li>· Refugee waves only — Cuban, Vietnamese, Soviet</li>
            <li>· Total over 60 years: <span className="text-museum-text">~9 million</span></li>
          </ul>
        </motion.div>

        {/* Reality side */}
        <motion.div
          variants={{ hidden: { opacity: 0, x: 10 }, visible: { opacity: 1, x: 0 } }}
          transition={{ duration: 0.7, ease }}
          className="border-l-2 border-gold pl-5 text-left"
        >
          <p className="folio">What actually happened</p>
          <p className="mt-3 font-display text-6xl leading-none text-museum-text">
            ~1.5M
            <span className="ml-2 font-mono text-base text-museum-muted">peak / yr</span>
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-museum-faint">
            Hart–Celler era
          </p>
          <ul className="mt-6 space-y-2 font-serif text-sm leading-relaxed text-museum-muted">
            <li>· India largest single-year source (2024)</li>
            <li>· Asian-American population: 1M → 24M</li>
            <li>· Hispanic population: 9M → 62M</li>
            <li>· Total over 60 years: <span className="text-museum-text">~60 million</span></li>
          </ul>
        </motion.div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.7 }}
        className="mt-10 max-w-2xl font-serif text-base italic text-museum-muted"
      >
        ~51 million additional arrivals under Hart–Celler — about <span className="text-gold not-italic">1.3 Californias</span> of people who would not otherwise have come.
      </motion.p>
    </div>
  );
}

// ----------------------------------------------------------------------------
// SLIDE 6 · Your Turn
// ----------------------------------------------------------------------------

function YourTurnSlide({ onClose, onTraceSurname }: { onClose: () => void; onTraceSurname?: () => void }) {
  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col items-center justify-center px-6 py-12 text-center">
      <p className="folio">Station VIII · Now It&apos;s Your Turn</p>
      <h2 className="mt-4 font-display text-4xl leading-tight text-museum-text md:text-5xl">
        Continue exploring.
      </h2>
      <p className="mx-auto mt-4 max-w-2xl font-serif text-base leading-relaxed text-museum-muted">
        Three ways to go deeper.
      </p>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
        className="mt-10 grid w-full grid-cols-1 gap-4 md:grid-cols-3"
      >
        {[
          { folio: "Option 1", title: "Browse the figures", body: "Search 200+ historical figures by surname, decade, or country.", action: "explore" },
          { folio: "Option 2", title: "Trace a surname", body: "Match your family against passenger manifests and census records.", action: "surname" },
          { folio: "Option 3", title: "Upload a GEDCOM", body: "Bring your own family tree — we'll overlay it on the migration map.", action: "gedcom" },
        ].map((opt, i) => (
          <motion.div
            key={opt.folio}
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.5, ease }}
          >
            {opt.action === "surname" ? (
              <button
                type="button"
                onClick={() => { onClose(); onTraceSurname?.(); }}
                className="group flex h-full w-full flex-col border border-museum-border/15 bg-museum-surface/[0.03] p-6 text-left transition hover:-translate-y-0.5 hover:border-gold/60"
              >
                <p className="folio">{opt.folio}</p>
                <h3 className="mt-3 font-display text-2xl text-museum-text transition-colors group-hover:text-gold">
                  {opt.title}
                </h3>
                <p className="mt-3 font-serif text-sm leading-relaxed text-museum-muted">{opt.body}</p>
                <p className="mt-auto pt-4 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-gold">
                  <span className="border-b border-gold/60 pb-0.5">Open</span>
                  <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
                </p>
              </button>
            ) : (
              <Link
                href={opt.action === "explore" ? "/explore" : "/my-family"}
                onClick={onClose}
                className="group flex h-full flex-col border border-museum-border/15 bg-museum-surface/[0.03] p-6 text-left transition hover:-translate-y-0.5 hover:border-gold/60"
              >
                <p className="folio">{opt.folio}</p>
                <h3 className="mt-3 font-display text-2xl text-museum-text transition-colors group-hover:text-gold">
                  {opt.title}
                </h3>
                <p className="mt-3 font-serif text-sm leading-relaxed text-museum-muted">{opt.body}</p>
                <p className="mt-auto pt-4 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-gold">
                  <span className="border-b border-gold/60 pb-0.5">Open</span>
                  <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
                </p>
              </Link>
            )}
          </motion.div>
        ))}
      </motion.div>

      <p className="mt-12 font-mono text-[10px] uppercase tracking-[0.22em] text-museum-faint">
        Thanks for taking the tour.
      </p>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Slide loader (used by next/dynamic loading state)
// ----------------------------------------------------------------------------

function SlideLoader({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-museum-bg-soft/40">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-museum-muted">
        {label}…
      </p>
    </div>
  );
}
