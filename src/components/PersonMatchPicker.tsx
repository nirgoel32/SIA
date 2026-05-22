import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GenealogySource, Person } from "@/types";
import SourceChip from "./SourceChip";

type Props = {
  matches: Person[];
  total: number;
  source?: GenealogySource | "";
  onSelect: (person: Person) => void;
  expectedFirstName?: string;
  expectedLastName?: string;
};

const SOURCE_LABELS: Record<string, string> = {
  curated: "Curated",
  familysearch: "FamilySearch",
  wikitree: "WikiTree",
  wikidata: "Wikidata",
  wikipedia: "Wikipedia",
  enriched: "Modeled",
};

function lifespan(p: Person): string | null {
  const b = p.birthDate?.slice(0, 4);
  const d = p.deathDate?.slice(0, 4);
  if (!b && !d) return null;
  return `${b ?? "?"} – ${d ?? "present"}`;
}

function scoreMatch(
  p: Person,
  expected: { firstName?: string; lastName?: string }
): number {
  const efn = expected.firstName?.toLowerCase() ?? "";
  const eln = expected.lastName?.toLowerCase() ?? "";
  const pfn = (p.firstName ?? "").toLowerCase();
  const pln = (p.lastName ?? "").toLowerCase();
  let score = 0;
  if (eln) {
    const parts = pln.split(/[\s-]+/);
    if (parts.includes(eln)) score += 12;
    else if (pln === eln) score += 12;
    else if (pln.includes(eln)) score += 6;
  }
  if (efn) {
    if (pfn === efn) score += 4;
    else if (pfn.startsWith(efn) || efn.startsWith(pfn)) score += 3;
    else if (pfn.includes(efn) || efn.includes(pfn)) score += 1;
  }
  if (p.lastName) score += 1;
  if (p.birthDate) score += 1;
  if (p.birthPlace) score += 1;
  if (p.matchScore != null) score += Math.round(p.matchScore * 4);
  return score;
}

function PersonRow({
  person,
  onSelect,
  expectedSurname,
  variant,
  index,
}: {
  person: Person;
  onSelect: (p: Person) => void;
  expectedSurname?: string;
  variant: "alt" | "more";
  index: number;
}) {
  const surnameParts = (person.lastName ?? "").toLowerCase().split(/[\s-]+/);
  const surnameMatch =
    !expectedSurname ||
    surnameParts.includes(expectedSurname) ||
    (person.lastName ?? "").toLowerCase() === expectedSurname;
  const life = lifespan(person);

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: variant === "more" ? 0 : index * 0.04, duration: 0.25 }}
    >
      <button
        type="button"
        onClick={() => onSelect(person)}
        className="group flex w-full items-start gap-4 rounded-none border border-museum-border/10 bg-museum-bg/40 p-4 text-left transition hover:border-gold/40 hover:bg-museum-surface/[0.06]"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-display text-lg leading-tight text-museum-text group-hover:text-glow">
              {person.firstName}
              {person.lastName ? ` ${person.lastName}` : ""}
            </span>
            <div className="flex items-center gap-2">
              {life && (
                <span className="font-mono text-xs text-museum-muted">
                  {life}
                </span>
              )}
              <SourceChip source={(person.source ?? "") as GenealogySource} />
            </div>
          </div>
          {person.birthPlace && (
            <p className="mt-1 text-sm text-museum-muted">
              Born {person.birthPlace}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em]">
            {!person.lastName && (
              <span className="text-accent-amber/80">No surname recorded</span>
            )}
            {!surnameMatch && person.lastName && (
              <span className="text-accent-amber/80">Surname differs</span>
            )}
            {person.matchScore != null && (
              <span className="text-museum-muted">
                Match {Math.round(person.matchScore * 100)}%
              </span>
            )}
          </div>
        </div>
        <span
          aria-hidden
          className="mt-1 shrink-0 text-museum-muted transition group-hover:translate-x-0.5 group-hover:text-glow"
        >
          →
        </span>
      </button>
    </motion.li>
  );
}

export default function PersonMatchPicker({
  matches,
  total,
  source,
  onSelect,
  expectedFirstName,
  expectedLastName,
}: Props) {
  const provider =
    SOURCE_LABELS[source ?? matches[0]?.source ?? ""] ?? "Genealogy";
  const expectedSurname = expectedLastName?.toLowerCase();

  const sorted = useMemo(
    () =>
      [...matches].sort(
        (a, b) =>
          scoreMatch(b, {
            firstName: expectedFirstName,
            lastName: expectedLastName,
          }) -
          scoreMatch(a, {
            firstName: expectedFirstName,
            lastName: expectedLastName,
          })
      ),
    [matches, expectedFirstName, expectedLastName]
  );

  const [showAll, setShowAll] = useState(false);
  const recommended = sorted[0];
  const alternatives = sorted.slice(1, 5);
  const hidden = sorted.slice(5);

  if (!recommended) return null;

  const recLife = lifespan(recommended);
  const recSurnameParts = (recommended.lastName ?? "")
    .toLowerCase()
    .split(/[\s-]+/);
  const recSurnameMatch =
    !expectedSurname ||
    recSurnameParts.includes(expectedSurname) ||
    (recommended.lastName ?? "").toLowerCase() === expectedSurname;

  return (
    <section className="space-y-8">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-museum-muted">
            Pick a profile to anchor this journey
          </p>
          <h3 className="mt-2 font-display text-2xl text-museum-text">
            Who would you like to explore?
          </h3>
        </div>
        <p className="text-xs uppercase tracking-[0.2em] text-museum-muted">
          {provider} · {total} possible match{total === 1 ? "" : "es"}
        </p>
      </header>

      <article className="relative overflow-hidden rounded-none border border-gold/40 bg-museum-surface/[0.03] p-6 md:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full bg-gold/20 blur-3xl"
        />
        <div className="relative">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-glow">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
              Top recommendation
            </span>
            <SourceChip
              source={(recommended.source ?? "") as GenealogySource}
              profileUrl={recommended.profileUrl}
            />
          </div>

          <h4 className="mt-5 font-display text-3xl leading-tight text-museum-text md:text-4xl">
            {recommended.firstName}
            {recommended.lastName ? ` ${recommended.lastName}` : ""}
          </h4>

          <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm text-museum-muted sm:grid-cols-2">
            {recLife && (
              <div className="flex gap-3">
                <dt className="w-20 shrink-0 text-xs uppercase tracking-[0.18em]">
                  Lifespan
                </dt>
                <dd className="font-mono text-museum-text">{recLife}</dd>
              </div>
            )}
            {recommended.birthPlace && (
              <div className="flex gap-3">
                <dt className="w-20 shrink-0 text-xs uppercase tracking-[0.18em]">
                  Born
                </dt>
                <dd className="text-museum-text">{recommended.birthPlace}</dd>
              </div>
            )}
            {recommended.deathPlace && (
              <div className="flex gap-3">
                <dt className="w-20 shrink-0 text-xs uppercase tracking-[0.18em]">
                  Died
                </dt>
                <dd className="text-museum-text">{recommended.deathPlace}</dd>
              </div>
            )}
            {recommended.matchScore != null && (
              <div className="flex gap-3">
                <dt className="w-20 shrink-0 text-xs uppercase tracking-[0.18em]">
                  Match
                </dt>
                <dd>{Math.round(recommended.matchScore * 100)}%</dd>
              </div>
            )}
          </dl>

          {!recSurnameMatch && recommended.lastName && (
            <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-accent-amber/80">
              Surname recorded differs — best name-match across sources
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onSelect(recommended)}
              className="btn-primary"
            >
              Explore {recommended.firstName}&apos;s journey →
            </button>
            {recommended.profileUrl && (
              <a
                href={recommended.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs uppercase tracking-[0.2em] text-museum-muted hover:text-glow"
              >
                View source profile
              </a>
            )}
          </div>
        </div>
      </article>

      {alternatives.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.25em] text-museum-muted">
            Other ranked matches
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {alternatives.map((p, i) => (
              <PersonRow
                key={p.familySearchId ?? p.wikiTreeId ?? p.wikidataId ?? p.id}
                person={p}
                onSelect={onSelect}
                expectedSurname={expectedSurname}
                variant="alt"
                index={i}
              />
            ))}
          </ul>
        </div>
      )}

      {hidden.length > 0 && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full border border-museum-border/15 bg-museum-surface/[0.03] px-4 py-2 text-xs uppercase tracking-[0.25em] text-museum-muted transition hover:border-gold/40 hover:bg-museum-surface/[0.07] hover:text-museum-text"
            aria-expanded={showAll}
          >
            <span
              aria-hidden
              className={`transition ${showAll ? "rotate-90" : ""}`}
            >
              ▸
            </span>
            {showAll ? "Hide" : "Show"} {hidden.length} more match
            {hidden.length === 1 ? "" : "es"}
          </button>

          <AnimatePresence initial={false}>
            {showAll && (
              <motion.ul
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="grid gap-3 overflow-hidden sm:grid-cols-2"
              >
                {hidden.map((p, i) => (
                  <PersonRow
                    key={p.familySearchId ?? p.wikiTreeId ?? p.wikidataId ?? p.id}
                    person={p}
                    onSelect={onSelect}
                    expectedSurname={expectedSurname}
                    variant="more"
                    index={i}
                  />
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
