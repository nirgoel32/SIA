import type { Person } from "@/types";

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const USER_AGENT =
  process.env.WIKIDATA_USER_AGENT ??
  "ImmigrationJourney/0.1 (educational installation; contact: example@example.com)";

type SparqlBinding = Record<string, { type: string; value: string }>;

type SparqlResponse = {
  results?: { bindings?: SparqlBinding[] };
};

export class WikidataError extends Error {
  constructor(
    message: string,
    public code: "empty" | "error" | "limit"
  ) {
    super(message);
    this.name = "WikidataError";
  }
}

async function sparql(query: string): Promise<SparqlBinding[]> {
  const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;
  const res = await fetch(url, {
    headers: { Accept: "application/sparql-results+json", "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(15000),
  });

  if (res.status === 429) {
    throw new WikidataError("Wikidata rate limit reached.", "limit");
  }
  if (!res.ok) {
    throw new WikidataError(`Wikidata HTTP ${res.status}`, "error");
  }

  const data = (await res.json()) as SparqlResponse;
  return data.results?.bindings ?? [];
}

function entityIdFromUri(uri: string): string {
  const idx = uri.lastIndexOf("/");
  return idx >= 0 ? uri.slice(idx + 1) : uri;
}

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Unknown", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

function escapeSparqlLiteral(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function yearFromIsoDate(value?: string): string | undefined {
  if (!value) return undefined;
  const match = value.match(/^-?\d{4}/);
  return match ? match[0].replace(/^-/, "") : undefined;
}

export async function searchPerson(
  firstName: string,
  lastName: string,
  options: { limit?: number } = {}
): Promise<{ people: Person[]; total: number }> {
  const limit = Math.min(options.limit ?? 12, 25);
  const fullName = `${firstName} ${lastName}`.trim();

  const exactName = escapeSparqlLiteral(fullName || lastName);
  const surnameOnly = escapeSparqlLiteral(lastName);

  // EntitySearch via the wbsearchentities-like LabelService — uses MWAPI built into WDQS.
  const query = `
    SELECT ?person ?personLabel ?birthDate ?deathDate ?birthPlace ?birthPlaceLabel ?deathPlace ?deathPlaceLabel
    WHERE {
      SERVICE wikibase:mwapi {
        bd:serviceParam wikibase:endpoint "www.wikidata.org" .
        bd:serviceParam wikibase:api "EntitySearch" .
        bd:serviceParam mwapi:search "${exactName || surnameOnly}" .
        bd:serviceParam mwapi:language "en" .
        ?person wikibase:apiOutputItem mwapi:item .
      }
      ?person wdt:P31 wd:Q5 .
      OPTIONAL { ?person rdfs:label ?personLabel . FILTER(LANG(?personLabel) = "en") }
      OPTIONAL { ?person wdt:P569 ?birthDate . }
      OPTIONAL { ?person wdt:P570 ?deathDate . }
      OPTIONAL {
        ?person wdt:P19 ?birthPlace .
        OPTIONAL { ?birthPlace rdfs:label ?birthPlaceLabel . FILTER(LANG(?birthPlaceLabel) = "en") }
      }
      OPTIONAL {
        ?person wdt:P20 ?deathPlace .
        OPTIONAL { ?deathPlace rdfs:label ?deathPlaceLabel . FILTER(LANG(?deathPlaceLabel) = "en") }
      }
    }
    LIMIT ${limit}
  `;

  const bindings = await sparql(query);
  if (bindings.length === 0) {
    throw new WikidataError("No Wikidata persons matched this name.", "empty");
  }

  const seen = new Set<string>();
  const people: Person[] = [];

  for (const b of bindings) {
    const uri = b.person?.value;
    if (!uri) continue;
    const id = entityIdFromUri(uri);
    if (seen.has(id)) continue;
    seen.add(id);

    const rawLabel = b.personLabel?.value ?? "";
    // Skip if Wikidata's label service failed and returned the QID.
    const label =
      rawLabel && !/^Q\d+$/.test(rawLabel)
        ? rawLabel
        : `${firstName} ${lastName}`.trim();
    if (!label) continue;
    const { firstName: fn, lastName: ln } = splitName(label);

    people.push({
      id,
      firstName: fn,
      lastName: ln || lastName,
      birthDate: yearFromIsoDate(b.birthDate?.value),
      deathDate: yearFromIsoDate(b.deathDate?.value),
      birthPlace: b.birthPlaceLabel?.value,
      deathPlace: b.deathPlaceLabel?.value,
      wikidataId: id,
      source: "wikidata",
      profileUrl: `https://www.wikidata.org/wiki/${id}`,
    });
  }

  if (people.length === 0) {
    throw new WikidataError("Wikidata returned no usable persons.", "empty");
  }

  return { people, total: people.length };
}

export async function getAncestry(
  wikidataId: string,
  // depth retained for API stability; the SPARQL walk follows all parent
  // links transitively and is bounded by LIMIT instead.
  _depth = 3
): Promise<Person[]> {
  void _depth;

  // Walk parent links (P22 = father, P25 = mother) transitively from the
  // root person. Blazegraph rejects {0,N} counted property paths, so we
  // use a UNION of "the root itself" plus "any transitive ancestor."
  const query = `
    SELECT DISTINCT ?person ?personLabel ?parent ?parentLabel ?birthDate ?deathDate ?birthPlace ?birthPlaceLabel ?deathPlace ?deathPlaceLabel
    WHERE {
      { BIND(wd:${wikidataId} AS ?person) }
      UNION
      { wd:${wikidataId} (wdt:P22|wdt:P25)+ ?person . }
      OPTIONAL { ?person rdfs:label ?personLabel . FILTER(LANG(?personLabel) = "en") }
      OPTIONAL {
        ?person (wdt:P22|wdt:P25) ?parent .
        OPTIONAL { ?parent rdfs:label ?parentLabel . FILTER(LANG(?parentLabel) = "en") }
      }
      OPTIONAL { ?person wdt:P569 ?birthDate . }
      OPTIONAL { ?person wdt:P570 ?deathDate . }
      OPTIONAL {
        ?person wdt:P19 ?birthPlace .
        OPTIONAL { ?birthPlace rdfs:label ?birthPlaceLabel . FILTER(LANG(?birthPlaceLabel) = "en") }
      }
      OPTIONAL {
        ?person wdt:P20 ?deathPlace .
        OPTIONAL { ?deathPlace rdfs:label ?deathPlaceLabel . FILTER(LANG(?deathPlaceLabel) = "en") }
      }
    }
    LIMIT 250
  `;

  const bindings = await sparql(query);
  if (bindings.length === 0) {
    throw new WikidataError("No Wikidata ancestry returned.", "empty");
  }

  const personById = new Map<string, Person>();
  const parentMap = new Map<string, Set<string>>();

  for (const b of bindings) {
    const personUri = b.person?.value;
    if (!personUri) continue;
    const id = entityIdFromUri(personUri);

    if (!personById.has(id)) {
      const rawLabel = b.personLabel?.value ?? "";
      const usableLabel =
        rawLabel && !/^Q\d+$/.test(rawLabel) ? rawLabel : null;
      const { firstName, lastName } = usableLabel
        ? splitName(usableLabel)
        : { firstName: "Unknown", lastName: "" };
      personById.set(id, {
        id,
        firstName,
        lastName,
        birthDate: yearFromIsoDate(b.birthDate?.value),
        deathDate: yearFromIsoDate(b.deathDate?.value),
        birthPlace: b.birthPlaceLabel?.value,
        deathPlace: b.deathPlaceLabel?.value,
        wikidataId: id,
        source: "wikidata",
        profileUrl: `https://www.wikidata.org/wiki/${id}`,
      });
    } else {
      // Backfill missing fields from subsequent bindings (the root row
      // often appears with a missing label that gets resolved later).
      const existing = personById.get(id)!;
      if ((existing.firstName === "Unknown" || !existing.lastName) && b.personLabel?.value) {
        const lbl = b.personLabel.value;
        if (lbl && !/^Q\d+$/.test(lbl)) {
          const { firstName, lastName } = splitName(lbl);
          existing.firstName = firstName;
          existing.lastName = lastName;
        }
      }
      if (!existing.birthDate && b.birthDate?.value) {
        existing.birthDate = yearFromIsoDate(b.birthDate.value);
      }
      if (!existing.deathDate && b.deathDate?.value) {
        existing.deathDate = yearFromIsoDate(b.deathDate.value);
      }
      if (!existing.birthPlace && b.birthPlaceLabel?.value) {
        existing.birthPlace = b.birthPlaceLabel.value;
      }
      if (!existing.deathPlace && b.deathPlaceLabel?.value) {
        existing.deathPlace = b.deathPlaceLabel.value;
      }
    }

    const parentUri = b.parent?.value;
    if (parentUri) {
      const parentId = entityIdFromUri(parentUri);
      if (!parentMap.has(id)) parentMap.set(id, new Set());
      parentMap.get(id)!.add(parentId);

      // Add parent as a person stub so it shows up even if it has no further data.
      if (!personById.has(parentId)) {
        const parentLabel = b.parentLabel?.value ?? parentId;
        const { firstName, lastName } = splitName(parentLabel);
        personById.set(parentId, {
          id: parentId,
          firstName,
          lastName,
          wikidataId: parentId,
          source: "wikidata",
          profileUrl: `https://www.wikidata.org/wiki/${parentId}`,
        });
      }
    }
  }

  parentMap.forEach((parents, childId) => {
    const child = personById.get(childId);
    if (child) child.parents = Array.from(parents);
  });

  return Array.from(personById.values());
}

export function wikidataDisclaimer(): string {
  return "Genealogy sourced from Wikidata (public, community-edited). Confirm details against primary records when possible.";
}
