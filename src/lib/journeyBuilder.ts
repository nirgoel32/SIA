import immigrationLaws from "@/data/immigration-laws.json";
import type {
  JourneyInput,
  MigrationEvent,
  Person,
  TimelineEvent,
} from "@/types";
import { inferMigrationFromInput, searchRecords } from "@/services/ellisIsland";
import {
  inferCountryFromPlace,
  resolveCountry,
} from "@/lib/surnameOrigin";

type Law = { year: number; title: string; description: string };

function parseYear(value?: string | null): number | null {
  if (!value) return null;
  const match = value.match(/-?\d{4}/);
  if (!match) return null;
  const n = parseInt(match[0], 10);
  return Number.isFinite(n) ? n : null;
}

function lifespanWindow(focus?: Person | null): { start: number; end: number } | null {
  if (!focus) return null;
  const birth = parseYear(focus.birthDate);
  const death = parseYear(focus.deathDate);
  if (!birth && !death) return null;
  const start = (birth ?? death!) - 25;
  const end = (death ?? birth! + 80) + 25;
  return { start, end };
}

/** Personal life-journey events: birthplace → deathplace arc when both are
 *  recorded, otherwise a single pin where they're known to have lived. */
function lifeJourneyEvents(focus: Person): MigrationEvent[] {
  const out: MigrationEvent[] = [];
  const birth = focus.birthPlace?.trim();
  const death = focus.deathPlace?.trim();
  const birthYear = parseYear(focus.birthDate);
  const deathYear = parseYear(focus.deathDate);
  const name = `${focus.firstName} ${focus.lastName}`.trim() || "Focus person";

  if (birth && death && birth !== death) {
    out.push({
      year: birthYear ?? 0,
      from: birth,
      to: death,
      kind: "route",
      label: `${name}: ${birth} → ${death}`,
      source: `Life journey recorded in public sources${
        birthYear && deathYear ? ` (${birthYear}–${deathYear})` : ""
      }.`,
    });
  } else if (birth) {
    out.push({
      year: birthYear ?? 0,
      from: birth,
      to: birth,
      kind: "pin",
      label: `${name} · born in ${birth}`,
      source: birthYear ? `Born ${birthYear}.` : "Recorded birthplace.",
    });
    if (death && deathYear) {
      out.push({
        year: deathYear,
        from: death,
        to: death,
        kind: "pin",
        label: `${name} · died in ${death}`,
        source: `Died ${deathYear}.`,
      });
    }
  }
  return out;
}

/** Ancestor pins so the map shows the geographic extent of the family. */
function ancestorPins(
  ancestors: Person[],
  focusId: string | undefined,
  limit: number
): MigrationEvent[] {
  const seen = new Set<string>();
  const out: MigrationEvent[] = [];
  for (const a of ancestors) {
    if (a.id === focusId) continue;
    if (!a.birthPlace) continue;
    const key = a.birthPlace.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const year = parseYear(a.birthDate) ?? 0;
    const name = `${a.firstName} ${a.lastName}`.trim() || "Ancestor";
    out.push({
      year,
      from: a.birthPlace,
      to: a.birthPlace,
      kind: "pin",
      label: `${name} · born in ${a.birthPlace}`,
      source: year ? `Born ${year} (ancestor).` : "Ancestor birthplace.",
    });
    if (out.length >= limit) break;
  }
  return out;
}

export function buildMigrations(
  input: JourneyInput,
  focus?: Person | null,
  ancestors: Person[] = []
): MigrationEvent[] {
  // Anchor migrations to the focus person when available.
  if (focus) {
    const birthYear = parseYear(focus.birthDate);
    const deathYear = parseYear(focus.deathDate);
    const life = lifeJourneyEvents(focus);
    const ancestorPlaces = ancestorPins(ancestors, focus.id, 6);

    if (focus.birthPlace) {
      const fromCountry =
        inferCountryFromPlace(focus.birthPlace)?.country ??
        focus.birthPlace.split(",").pop()?.trim() ??
        focus.birthPlace;

      // Person whose life ended before US migration is relevant: just show
      // their actual life-journey + ancestor pins.
      if (deathYear && deathYear < 1965) {
        const ellis = searchRecords(input.surname, fromCountry);
        const ellisEvents = ellis.slice(0, 2).map<MigrationEvent>((r) => ({
          year: r.arrivalYear,
          from: r.originCountry,
          to: r.portOfEntry,
          kind: "route",
          source: `Historical passenger record — ${r.ship}`,
          label: `${r.firstName} ${r.surname} arrived via ${r.ship}`,
        }));
        return [...life, ...ancestorPlaces, ...ellisEvents];
      }

      // Living-era or recent: anchor a modeled US arrival from this person's
      // actual birth country, on top of their life-journey + ancestor pins.
      const modeled = inferMigrationFromInput(
        input.surname,
        fromCountry,
        input.decade ??
          (birthYear ? `${Math.floor((birthYear + 25) / 10) * 10}s` : undefined)
      ).map<MigrationEvent>((m) => ({ ...m, kind: "route" }));
      return [...life, ...ancestorPlaces, ...modeled];
    }

    // No birthPlace on focus but we may still have ancestor pins.
    if (ancestorPlaces.length > 0) return ancestorPlaces;
  }

  return inferMigrationFromInput(input.surname, input.country, input.decade).map(
    (m) => ({ ...m, kind: "route" })
  );
}

export function buildTimeline(
  input: JourneyInput,
  migrations: MigrationEvent[],
  ancestors: Person[],
  focus?: Person | null
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const window = lifespanWindow(focus);
  const inWindow = (year: number) =>
    !window || (year >= window.start && year <= window.end);

  if (focus?.birthDate) {
    const year = parseYear(focus.birthDate);
    if (year && year > 1600) {
      events.push({
        year,
        title: `${focus.firstName} ${focus.lastName}`.trim() || "Focus person",
        description: focus.birthPlace
          ? `Born in ${focus.birthPlace}.`
          : "Focus person — anchor of this family story.",
        type: "family",
      });
    }
  }

  if (focus?.deathDate) {
    const year = parseYear(focus.deathDate);
    if (year && year > 1600) {
      events.push({
        year,
        title: `${focus.firstName} ${focus.lastName}`.trim() + " — died",
        description: focus.birthPlace
          ? `Lifespan recorded in public genealogical sources.`
          : "Death recorded in public records.",
        type: "family",
      });
    }
  }

  // The 1965 Hart-Celler Act is the centerpiece of this project — always
  // include it, even when it falls outside the focus person's lifespan
  // window. For someone who died before 1965 (e.g. Marie Curie, d. 1934)
  // we tag the description so the reader understands it's later context
  // shaping their diaspora, not an event in their own life.
  const HART_CELLER_YEAR = 1965;
  const focusDeathYear = focus?.deathDate ? parseYear(focus.deathDate) : undefined;
  const focusBirthYear = focus?.birthDate ? parseYear(focus.birthDate) : undefined;

  (immigrationLaws as Law[]).forEach((law) => {
    const isHartCeller = law.year === HART_CELLER_YEAR;
    if (!isHartCeller && !inWindow(law.year)) return;

    let description = law.description;
    if (isHartCeller) {
      if (focusDeathYear && focusDeathYear < HART_CELLER_YEAR) {
        description = `${law.description} (Posthumous context — this Act came ${
          HART_CELLER_YEAR - focusDeathYear
        } years after this person's death, but reshaped the diaspora that followed.)`;
      } else if (focusBirthYear && focusBirthYear > HART_CELLER_YEAR) {
        description = `${law.description} (Pre-life context — this Act predates this person's birth by ${
          focusBirthYear - HART_CELLER_YEAR
        } years; their family's American story is downstream of it.)`;
      }
    }

    events.push({
      year: law.year,
      title: law.title,
      description,
      type: "law",
    });
  });

  migrations.forEach((m) => {
    if (!inWindow(m.year)) return;
    events.push({
      year: m.year,
      title: m.label ?? `Migration: ${m.from} → ${m.to}`,
      description: m.source ?? `Journey from ${m.from} to ${m.to}`,
      type: "immigration",
    });
  });

  ancestors
    .filter((a) => a.id !== focus?.id)
    .slice(0, 5)
    .forEach((a) => {
      const year = parseYear(a.birthDate);
      if (year && year > 1600 && inWindow(year)) {
        events.push({
          year,
          title: `${a.firstName} ${a.lastName}`.trim() || "Ancestor",
          description: a.birthPlace
            ? `Born in ${a.birthPlace} (genealogical record).`
            : "Ancestor in family tree (genealogical record).",
          type: "family",
        });
      }
    });

  if (inWindow(1968)) {
    events.push({
      year: 1968,
      title: "Immigration Act expands Asian immigration",
      description:
        "Hemispheric caps and family-reunification channels accelerate migration from Asia.",
      type: "historical",
    });
  }

  const { country } = resolveCountry(input.surname, input.country, {
    birthPlace: focus?.birthPlace,
  });
  if (
    (input.decade?.includes("70") || country === "India") &&
    inWindow(1985)
  ) {
    events.push({
      year: 1985,
      title: "Population growth in Bay Area",
      description:
        "Census data shows rapid growth in Indian-American and broader Asian-American communities in California.",
      type: "census",
    });
  }

  const ellis = searchRecords(input.surname, input.country);
  ellis.slice(0, 2).forEach((r) => {
    if (!inWindow(r.arrivalYear)) return;
    events.push({
      year: r.arrivalYear,
      title: `${r.firstName} ${r.surname} — ${r.ship}`,
      description: `Arrived at ${r.portOfEntry} from ${r.originCountry} (historical passenger record).`,
      type: "immigration",
    });
  });

  return events
    .filter((e) => e.year >= 1600 && e.year <= 2030)
    .sort((a, b) => a.year - b.year)
    .filter(
      (e, i, arr) =>
        arr.findIndex((x) => x.year === e.year && x.title === e.title) === i
    );
}
