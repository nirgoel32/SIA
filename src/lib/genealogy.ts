import type { GenealogySource, JourneyInput, Person } from "@/types";
import {
  searchPerson as fsSearch,
  getAncestry as fsAncestry,
  isFamilySearchConfigured,
  familySearchDisclaimer,
} from "@/services/familysearch";
import {
  searchPerson as wtSearch,
  getAncestors as wtAncestors,
  buildEnrichedTree,
  getEnrichedDisclaimer,
} from "@/services/wikitree";
import {
  searchPerson as wdSearch,
  getAncestry as wdAncestry,
  wikidataDisclaimer,
} from "@/services/wikidata";
import { getPageImage, searchPerson as wpSearch } from "@/services/wikipedia";
import { resolveCountry } from "@/lib/surnameOrigin";
import {
  CURATED_FIGURES,
  findCurated,
  type CuratedFigure,
} from "@/data/curated-figures";
import type { LatLng } from "@/lib/mapGeo";
import type { MigrationEvent, TimelineEvent } from "@/types";

export type GenealogySearchResult = {
  people: Person[];
  total: number;
  source: GenealogySource;
  needsSelection: boolean;
  disclaimer: string;
  familySearchEnabled: boolean;
  /** Set when the result is a curated demo profile. */
  curated?: {
    focusId: string;
    country: string;
    narrative?: string;
    migrations: MigrationEvent[];
    timeline: TimelineEvent[];
    placeCoords: Record<string, LatLng>;
  };
};

export type GenealogyAncestryResult = {
  ancestors: Person[];
  source: GenealogySource;
  disclaimer: string;
  curated?: {
    focusId: string;
    country: string;
    narrative?: string;
    migrations: MigrationEvent[];
    timeline: TimelineEvent[];
    placeCoords: Record<string, LatLng>;
  };
};

async function enrichMigrationsWithImages(
  migrations: MigrationEvent[]
): Promise<MigrationEvent[]> {
  return Promise.all(
    migrations.map(async (m) => {
      if (m.image || !m.wikipediaPage) return m;
      const image = await getPageImage(m.wikipediaPage);
      return image ? { ...m, image } : m;
    })
  );
}

async function curatedToResult(
  figure: CuratedFigure
): Promise<GenealogySearchResult> {
  // Family network as picker options, focus first.
  const people = [figure.focus, ...figure.family];
  const migrations = await enrichMigrationsWithImages(figure.migrations);
  return {
    people,
    total: people.length,
    source: "curated",
    needsSelection: true,
    disclaimer:
      "Curated profile — every field below has been verified against public biographies and Wikipedia. No live API call was made.",
    familySearchEnabled: isFamilySearchConfigured(),
    curated: {
      focusId: figure.focus.id,
      country: figure.country,
      narrative: figure.narrative,
      migrations,
      timeline: figure.timelineEvents,
      placeCoords: figure.placeCoords,
    },
  };
}

async function curatedAncestry(
  figure: CuratedFigure
): Promise<GenealogyAncestryResult> {
  const ancestors = [figure.focus, ...figure.family];
  const migrations = await enrichMigrationsWithImages(figure.migrations);
  return {
    ancestors,
    source: "curated",
    disclaimer:
      "Curated profile — every relationship and date has been verified against public biographical sources.",
    curated: {
      focusId: figure.focus.id,
      country: figure.country,
      narrative: figure.narrative,
      migrations,
      timeline: figure.timelineEvents,
      placeCoords: figure.placeCoords,
    },
  };
}

function findCuratedByPersonId(personId: string): CuratedFigure | null {
  for (const figure of CURATED_FIGURES) {
    if (figure.focus.id === personId) return figure;
    if (figure.family.some((p) => p.id === personId)) return figure;
  }
  return null;
}

function fingerprint(p: Person): string {
  const name = `${p.firstName} ${p.lastName}`.trim().toLowerCase();
  const year = p.birthDate?.slice(0, 4) ?? "";
  return `${name}|${year}`;
}

function relevance(
  p: Person,
  expected: { firstName?: string; lastName?: string }
): number {
  const efn = expected.firstName?.toLowerCase() ?? "";
  const eln = expected.lastName?.toLowerCase() ?? "";
  const pfn = (p.firstName ?? "").toLowerCase();
  const pln = (p.lastName ?? "").toLowerCase();
  let score = 0;

  // Surname is the strongest discriminator — most people don't share one.
  if (eln) {
    const surnameParts = pln.split(/[\s-]+/);
    if (surnameParts.includes(eln)) score += 12;
    else if (pln === eln) score += 12;
    else if (pln.includes(eln)) score += 6;
  }

  if (efn) {
    if (pfn === efn) score += 4;
    else if (pfn.startsWith(efn) || efn.startsWith(pfn)) score += 3;
    else if (pfn.includes(efn) || efn.includes(pfn)) score += 1;
  }

  if (p.birthDate) score += 1;
  if (p.birthPlace) score += 1;
  if (p.matchScore != null) score += Math.round(p.matchScore * 4);
  if (p.source === "wikidata") score += 1;
  return score;
}

export async function searchGenealogy(
  input: JourneyInput,
  clientIp?: string
): Promise<GenealogySearchResult> {
  const { country } = resolveCountry(input.surname, input.country);
  const birthPlace = input.country ?? country;
  const firstName = input.firstName ?? "";
  const lastName = input.surname;

  // Curated profiles short-circuit the live API chain — they're the demo
  // path for flagship figures with every field verified.
  const curated = findCurated(firstName, lastName);
  if (curated) {
    return await curatedToResult(curated);
  }

  if (isFamilySearchConfigured()) {
    try {
      const { people, total } = await fsSearch(firstName, lastName, {
        birthPlace,
        clientIp,
      });
      return {
        people,
        total,
        source: "familysearch",
        needsSelection: people.length > 1,
        disclaimer: familySearchDisclaimer(),
        familySearchEnabled: true,
      };
    } catch (e) {
      console.warn("[genealogy] FamilySearch failed, falling through:", e);
    }
  }

  // Query WikiTree, Wikidata, and Wikipedia in parallel. None require an API
  // key. They cover different ground: WikiTree = community-curated lineage,
  // Wikidata = structured biographical graph, Wikipedia = encyclopedia
  // articles for famous people (and a great way to recover well-known names
  // that WikiTree files under birth surnames).
  const [wt, wd, wp] = await Promise.allSettled([
    wtSearch(firstName, lastName),
    wdSearch(firstName, lastName),
    wpSearch(firstName, lastName),
  ]);

  if (wt.status === "rejected") {
    console.warn("[genealogy] WikiTree failed:", wt.reason);
  }
  if (wd.status === "rejected") {
    console.warn("[genealogy] Wikidata failed:", wd.reason);
  }
  if (wp.status === "rejected") {
    console.warn("[genealogy] Wikipedia failed:", wp.reason);
  }

  const wtPeople = wt.status === "fulfilled" ? wt.value.people : [];
  const wdPeople = wd.status === "fulfilled" ? wd.value.people : [];
  const wpPeople = wp.status === "fulfilled" ? wp.value.people : [];

  const merged: Person[] = [];
  const seen = new Map<string, Person>();

  for (const person of [...wpPeople, ...wdPeople, ...wtPeople]) {
    const key = fingerprint(person);
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, person);
      merged.push(person);
    } else {
      // Prefer the entry with more populated fields, but keep both source IDs.
      if (!existing.wikiTreeId && person.wikiTreeId) {
        existing.wikiTreeId = person.wikiTreeId;
      }
      if (!existing.wikidataId && person.wikidataId) {
        existing.wikidataId = person.wikidataId;
      }
      if (!existing.birthPlace && person.birthPlace) {
        existing.birthPlace = person.birthPlace;
      }
    }
  }

  if (merged.length > 0) {
    const ranked = merged.sort(
      (a, b) =>
        relevance(b, { firstName, lastName }) -
        relevance(a, { firstName, lastName })
    );
    const total =
      (wt.status === "fulfilled" ? wt.value.total : 0) +
      (wd.status === "fulfilled" ? wd.value.total : 0) +
      (wp.status === "fulfilled" ? wp.value.total : 0);

    const topSources = new Set(ranked.slice(0, 5).map((p) => p.source));
    const primary: GenealogySource = topSources.has("wikidata")
      ? "wikidata"
      : topSources.has("wikipedia")
        ? "wikipedia"
        : "wikitree";

    const used = [
      topSources.has("wikitree") && "WikiTree",
      topSources.has("wikidata") && "Wikidata",
      topSources.has("wikipedia") && "Wikipedia",
    ].filter(Boolean) as string[];

    return {
      people: ranked,
      total,
      source: primary,
      needsSelection: ranked.length > 1,
      disclaimer:
        used.length > 1
          ? `Results merged from ${used.join(", ")}. Select a profile to load their lineage.`
          : used[0] === "Wikidata"
            ? wikidataDisclaimer()
            : "Public genealogical records. Select a profile if multiple matches appear.",
      familySearchEnabled: isFamilySearchConfigured(),
    };
  }

  return {
    people: buildEnrichedTree(input),
    total: 0,
    source: "enriched",
    needsSelection: false,
    disclaimer: getEnrichedDisclaimer(input),
    familySearchEnabled: isFamilySearchConfigured(),
  };
}

export async function loadAncestry(
  person: Person,
  input: JourneyInput,
  clientIp?: string
): Promise<GenealogyAncestryResult> {
  // Curated profiles take priority — they hold a hand-verified family network.
  if (person.source === "curated") {
    const figure = findCuratedByPersonId(person.id);
    if (figure) return await curatedAncestry(figure);
  }

  if (person.familySearchId && isFamilySearchConfigured()) {
    try {
      const ancestors = await fsAncestry(person.familySearchId, 4, clientIp);
      return {
        ancestors,
        source: "familysearch",
        disclaimer: familySearchDisclaimer(),
      };
    } catch {
      // fall through
    }
  }

  if (person.source === "wikitree" || person.wikiTreeId) {
    const wikiKey = person.wikiTreeId ?? person.id;
    try {
      const ancestors = await wtAncestors(wikiKey, 4);
      return {
        ancestors,
        source: "wikitree",
        disclaimer: "Genealogical records from WikiTree — verify independently.",
      };
    } catch {
      // fall through
    }
  }

  // Wikipedia results carry the Wikidata Q-id when available; route them
  // through the Wikidata ancestry fetcher.
  if (
    person.source === "wikidata" ||
    person.source === "wikipedia" ||
    person.wikidataId
  ) {
    const wdKey =
      person.wikidataId ??
      (/^Q\d+$/.test(person.id) ? person.id : null);
    if (wdKey) {
      try {
        const ancestors = await wdAncestry(wdKey, 3);
        // Patch the root row with the name the picker already knows,
        // in case Wikidata's label service didn't bind it.
        const root = ancestors.find((a) => a.wikidataId === wdKey);
        if (root && root.firstName === "Unknown") {
          root.firstName = person.firstName;
          root.lastName = person.lastName;
        }
        if (root && !root.birthPlace && person.birthPlace) {
          root.birthPlace = person.birthPlace;
        }
        return {
          ancestors,
          source: "wikidata",
          disclaimer: wikidataDisclaimer(),
        };
      } catch (e) {
        console.warn("[genealogy] Wikidata ancestry failed:", e);
      }
    }
  }

  const fallback = buildEnrichedTree(input);
  return {
    ancestors: fallback,
    source: "enriched",
    disclaimer: getEnrichedDisclaimer(input),
  };
}
