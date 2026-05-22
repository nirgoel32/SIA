import type { JourneyInput, Person } from "@/types";
import {
  decadeToYear,
  getMigrationWave,
  resolveCountry,
} from "@/lib/surnameOrigin";

const WIKITREE_API = "https://api.wikitree.com/api.php";
const APP_ID = process.env.WIKITREE_APP_ID ?? "ImmigrationJourneyDemo";

type WikiTreePerson = {
  Id?: number | string;
  Name?: string;
  FirstName?: string;
  LastNameAtBirth?: string;
  LastNameCurrent?: string;
  LastNameOther?: string;
  LastName?: string;
  BirthDate?: string;
  DeathDate?: string;
  BirthLocation?: string;
  DeathLocation?: string;
  Father?: number | string;
  Mother?: number | string;
};

type WikiTreeEnvelope = {
  status?: number | string;
  matches?: WikiTreePerson[];
  ancestors?: WikiTreePerson[];
  total?: number;
};

export class WikiTreeError extends Error {
  constructor(
    message: string,
    public code: "limit" | "error" | "empty"
  ) {
    super(message);
    this.name = "WikiTreeError";
  }
}

function unwrapEnvelope(data: unknown): WikiTreeEnvelope | null {
  if (Array.isArray(data)) {
    const first = data[0] as WikiTreeEnvelope | undefined;
    if (!first) return null;
    if (first.status === "Limit exceeded.") {
      throw new WikiTreeError("WikiTree rate limit reached. Try again shortly.", "limit");
    }
    if (
      typeof first.status === "string" &&
      first.status !== "0" &&
      first.status !== "Limit exceeded." &&
      !first.matches?.length &&
      !first.ancestors?.length
    ) {
      throw new WikiTreeError(String(first.status), "error");
    }
    return first;
  }
  return data as WikiTreeEnvelope;
}

/** WikiTree's `Name` field is the public profile key e.g. "Skłodowska-Curie-1".
 *  When LastName is empty we can usually recover it from the key by stripping
 *  the trailing numeric ID. */
function surnameFromKey(name?: string): string {
  if (!name) return "";
  const stripped = name.replace(/-\d+$/, "");
  return stripped.replace(/_/g, " ");
}

function parsePerson(
  raw: WikiTreePerson,
  index = 0,
  expectedLastName?: string
): Person {
  const id = String(raw.Id ?? raw.Name ?? `node-${index}`);
  const parents: string[] = [];
  if (raw.Father) parents.push(String(raw.Father));
  if (raw.Mother) parents.push(String(raw.Mother));

  // Pick whichever recorded surname most closely matches the user's query.
  const expected = expectedLastName?.toLowerCase().trim();
  const candidates = [
    raw.LastNameCurrent,
    raw.LastNameAtBirth,
    raw.LastNameOther,
    raw.LastName,
    surnameFromKey(raw.Name),
  ]
    .map((s) => s?.trim())
    .filter((s): s is string => Boolean(s));

  let lastName = candidates[0] ?? "";
  if (expected) {
    const match = candidates.find((c) =>
      c.toLowerCase().split(/[\s-]+/).some((part) => part === expected || part.includes(expected))
    );
    if (match) lastName = match;
  }

  // If birth and married surnames differ, surface both: "Skłodowska-Curie".
  const birth = raw.LastNameAtBirth?.trim();
  const current = raw.LastNameCurrent?.trim();
  if (birth && current && birth !== current && lastName) {
    if (!lastName.includes(birth) && !lastName.includes(current)) {
      lastName = `${birth}-${current}`;
    }
  }

  return {
    id,
    firstName: raw.FirstName?.trim() || "Unknown",
    lastName,
    birthDate: raw.BirthDate?.replace(/-00/g, ""),
    deathDate: raw.DeathDate,
    birthPlace: raw.BirthLocation || undefined,
    deathPlace: raw.DeathLocation || undefined,
    parents: parents.length ? parents : undefined,
    wikiTreeId: raw.Name ?? id,
    source: "wikitree",
    profileUrl: raw.Name
      ? `https://www.wikitree.com/wiki/${raw.Name}`
      : undefined,
  };
}

async function wikitreeGet(params: Record<string, string>): Promise<WikiTreeEnvelope> {
  const query = new URLSearchParams({
    ...params,
    format: "json",
    appId: APP_ID,
    fields:
      "Id,Name,FirstName,LastNameAtBirth,LastNameCurrent,LastNameOther,LastName,BirthDate,DeathDate,BirthLocation,DeathLocation,Father,Mother",
  });

  const res = await fetch(`${WIKITREE_API}?${query.toString()}`, {
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) throw new WikiTreeError(`WikiTree HTTP ${res.status}`, "error");

  const data = await res.json();
  const envelope = unwrapEnvelope(data);
  if (!envelope) throw new WikiTreeError("Empty WikiTree response", "error");
  return envelope;
}

export async function searchPerson(
  firstName: string,
  lastName: string
): Promise<{ people: Person[]; total: number }> {
  const params: Record<string, string> = {
    action: "searchPerson",
    LastName: lastName,
    limit: "15",
  };
  if (firstName.trim()) params.FirstName = firstName.trim();

  const envelope = await wikitreeGet(params);
  const matches = envelope.matches ?? [];
  const people = matches
    .filter((m) => m.Name || m.Id)
    .map((m, i) => parsePerson(m, i, lastName));

  if (people.length === 0) {
    throw new WikiTreeError("No public WikiTree profiles matched this name.", "empty");
  }

  return { people, total: envelope.total ?? people.length };
}

export async function getAncestors(key: string, depth = 4): Promise<Person[]> {
  const envelope = await wikitreeGet({
    action: "getAncestors",
    key,
    depth: String(depth),
  });

  const ancestors = envelope.ancestors ?? [];
  if (!ancestors.length) {
    throw new WikiTreeError("No ancestors returned for this profile.", "empty");
  }

  return ancestors.map((a, i) => parsePerson(a, i));
}

/** Personalized tree when WikiTree has no match — uses surname origin, not generic placeholders */
export function buildEnrichedTree(input: JourneyInput): Person[] {
  const { country, region, inferred } = resolveCountry(
    input.surname,
    input.country
  );
  const wave = getMigrationWave(country);
  const arrivalYear = decadeToYear(input.decade);
  const firstName = input.firstName?.trim() || "You";
  const settlement = wave.settlementRegions[0] ?? "California";
  const parentBirth = arrivalYear - 28;
  const grandparentBirth = arrivalYear - 55;

  return [
    {
      id: "self",
      firstName,
      lastName: input.surname,
      birthDate: String(Math.min(arrivalYear + 18, 2005)),
      birthPlace: `${settlement}, United States`,
      parents: ["parent-father", "parent-mother"],
      source: "enriched",
    },
    {
      id: "parent-father",
      firstName: "Father",
      lastName: input.surname,
      birthDate: String(parentBirth),
      birthPlace: inferred
        ? `${region ?? country} → ${settlement} (${arrivalYear})`
        : `${country} → ${settlement}`,
      parents: ["grandparent-1", "grandparent-2"],
    },
    {
      id: "parent-mother",
      firstName: "Mother",
      lastName: input.surname,
      birthDate: String(parentBirth + 2),
      birthPlace: `${settlement}, United States`,
      parents: ["grandparent-3", "grandparent-4"],
    },
    {
      id: "grandparent-1",
      firstName: "Grandfather",
      lastName: input.surname,
      birthDate: String(grandparentBirth),
      birthPlace: region ? `${region}, ${country}` : country,
    },
    {
      id: "grandparent-2",
      firstName: "Grandmother",
      lastName: input.surname,
      birthDate: String(grandparentBirth + 3),
      birthPlace: region ? `${region}, ${country}` : country,
    },
    {
      id: "grandparent-3",
      firstName: "Grandfather",
      lastName: input.surname,
      birthDate: String(grandparentBirth - 5),
      birthPlace: country,
    },
    {
      id: "grandparent-4",
      firstName: "Grandmother",
      lastName: input.surname,
      birthDate: String(grandparentBirth - 2),
      birthPlace: country,
    },
  ];
}

export function getEnrichedDisclaimer(input: JourneyInput): string {
  const { country, region, inferred } = resolveCountry(
    input.surname,
    input.country
  );
  if (inferred && region) {
    return `No FamilySearch or WikiTree match for this name. Story modeled from ${input.surname} surname patterns (${region}, ${country}) and post-1965 migration history — not verified genealogy.`;
  }
  if (inferred) {
    return `No FamilySearch or WikiTree match for this name. Story modeled from surname and demographic migration patterns — not verified genealogy.`;
  }
  return `No FamilySearch or WikiTree match for this name. Timeline and tree are modeled from your inputs and ${country} migration history — not verified genealogy.`;
}
