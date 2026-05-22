import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Act1965Analysis } from "@/services/act1965";
import type { Person } from "@/types";
import DisclaimerBanner from "@/components/DisclaimerBanner";

type Props = {
  person: Person | null;
  country: string;
  /** Decade selected by the user (e.g. "1970s"), if any — drives arrivalYear. */
  arrivalDecade?: string;
};

const FRAME_LABEL: Record<Act1965Analysis["frame"], string> = {
  "european-pre-act-settler": "European chain migration",
  "european-pre-act-homeland": "European diaspora",
  "asian-post-act-arrival": "Asian post-1965 arrival",
  "african-post-act-arrival": "African post-1965 arrival",
  "latin-restriction": "Western Hemisphere restriction",
  "lived-through-act": "Lived through the Act",
  "post-act-descendant": "Post-1965 descendant",
  indirect: "Indirect impact",
};

function yearFromDate(d?: string): number | undefined {
  if (!d) return undefined;
  const m = d.match(/(\d{4})/);
  return m ? parseInt(m[1], 10) : undefined;
}

function arrivalFromDecade(decade?: string): number | undefined {
  if (!decade) return undefined;
  const m = decade.match(/(\d{4})/);
  return m ? parseInt(m[1], 10) + 5 : undefined; // midpoint of the decade
}

export default function Act1965Impact({
  person,
  country,
  arrivalDecade,
}: Props) {
  const [analysis, setAnalysis] = useState<Act1965Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!person) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (person.firstName) params.set("firstName", person.firstName);
    if (person.lastName) params.set("lastName", person.lastName);
    const birthYear = yearFromDate(person.birthDate);
    const deathYear = yearFromDate(person.deathDate);
    if (birthYear) params.set("birthYear", String(birthYear));
    if (deathYear) params.set("deathYear", String(deathYear));
    if (country) params.set("country", country);
    if (person.birthPlace) params.set("birthPlace", person.birthPlace);
    const arr = arrivalFromDecade(arrivalDecade);
    if (arr) params.set("arrivalYear", String(arr));
    if (person.source === "curated") params.set("verified", "1");

    fetch(`/api/analysis/act-1965?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.statusText)))
      .then((data: Act1965Analysis) => {
        if (!cancelled) {
          setAnalysis(data);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(typeof e === "string" ? e : "Could not load analysis");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [person, country, arrivalDecade]);

  if (!person) return null;

  const subjectName =
    [person.firstName, person.lastName].filter(Boolean).join(" ").trim() ||
    "this person";

  // Paragraph splitting on blank line. The LLM is asked for 2–3 short
  // paragraphs separated by blank lines; the fallback returns a single
  // paragraph. Either way we render <p>s.
  const paragraphs = (analysis?.body ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="grid gap-10 border-t border-museum-border/15 pt-10 lg:grid-cols-[1fr_auto_18rem] lg:gap-14"
    >
      <article className="min-w-0">
        <p className="eyebrow-gold">
          {analysis ? FRAME_LABEL[analysis.frame] : "Unique to this profile"}
        </p>
        <h3 className="mt-4 font-display text-3xl font-medium leading-tight text-museum-text md:text-4xl">
          {analysis?.headline ??
            `What the 1965 Act meant for ${subjectName}`}
        </h3>

        {loading && (
          <p className="mt-8 font-serif italic text-museum-faint">
            Composing a personalized reading…
          </p>
        )}

        {error && (
          <div className="mt-6">
            <DisclaimerBanner variant="info">
              Could not load the personalized analysis. Refresh to try again.
            </DisclaimerBanner>
          </div>
        )}

        {paragraphs.length > 0 && (
          <div className="mt-8 space-y-5">
            {paragraphs.map((p, i) => (
              <p
                key={i}
                className={`font-serif text-base leading-relaxed text-museum-muted md:text-lg ${
                  i === 0 ? "drop-cap" : ""
                }`}
              >
                {p}
              </p>
            ))}
          </div>
        )}

        {analysis && (
          <p className="mt-8 text-[10px] uppercase tracking-[0.22em] text-museum-faint">
            {analysis.source === "generated"
              ? "Generated for this profile · grounded in verified biographical facts"
              : "Composed from a deterministic editorial template"}
          </p>
        )}
      </article>

      {/* Vertical rule on lg+ */}
      <span
        aria-hidden
        className="hidden w-px bg-museum-border/15 lg:block"
      />

      {/* Mechanisms sidebar */}
      <aside className="lg:max-w-xs">
        <p className="eyebrow">Act mechanisms in play</p>
        <ul className="mt-4 space-y-3">
          {(analysis?.mechanisms ?? []).map((m, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold"
              />
              <span className="font-serif text-sm leading-relaxed text-museum-muted">
                {m}
              </span>
            </li>
          ))}
        </ul>
        <hr className="rule-ink my-6" />
        <p className="text-xs leading-relaxed text-museum-faint">
          The Immigration & Nationality Act of 1965 (Hart-Celler) was signed
          October 3, 1965 by President Lyndon B. Johnson at the foot of the
          Statue of Liberty and took effect June 30, 1968.
        </p>
      </aside>
    </motion.div>
  );
}
