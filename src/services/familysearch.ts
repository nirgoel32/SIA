import type { Person } from "@/types";

const AUTH_URL =
  process.env.FAMILYSEARCH_AUTH_URL ??
  "https://ident.familysearch.org/cis-web/oauth2/v3/token";
const API_BASE =
  process.env.FAMILYSEARCH_API_BASE ?? "https://api.familysearch.org/platform";

type GedcomxFact = {
  type?: string;
  date?: { original?: string; formal?: string };
  place?: { original?: string };
};

type GedcomxPerson = {
  id?: string;
  names?: { nameForms?: { fullText?: string; parts?: { value?: string; type?: string }[] }[] }[];
  facts?: GedcomxFact[];
  display?: {
    name?: string;
    birthDate?: string;
    deathDate?: string;
    lifespan?: string;
    ascendancyNumber?: string;
  };
  gender?: { type?: string };
};

type GedcomxRelationship = {
  type?: string;
  person1?: { resourceId?: string };
  person2?: { resourceId?: string };
};

type SearchEntry = {
  id?: string;
  score?: number;
  content?: {
    gedcomx?: {
      persons?: GedcomxPerson[];
      relationships?: GedcomxRelationship[];
    };
  };
};

type SearchResponse = {
  entries?: SearchEntry[];
  results?: number;
  searchInfo?: { totalHits?: number }[];
};

type AncestryResponse = {
  persons?: GedcomxPerson[];
};

export class FamilySearchError extends Error {
  constructor(
    message: string,
    public code: "not_configured" | "auth" | "empty" | "error" | "limit"
  ) {
    super(message);
    this.name = "FamilySearchError";
  }
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export function isFamilySearchConfigured(): boolean {
  return Boolean(process.env.FAMILYSEARCH_CLIENT_ID?.trim());
}

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

function factDate(person: GedcomxPerson, type: string): string | undefined {
  const fact = person.facts?.find((f) => f.type?.includes(type));
  return fact?.date?.original ?? fact?.date?.formal;
}

function factPlace(person: GedcomxPerson, type: string): string | undefined {
  const fact = person.facts?.find((f) => f.type?.includes(type));
  return fact?.place?.original;
}

function personDisplayName(person: GedcomxPerson): string {
  if (person.display?.name) return person.display.name;
  const form = person.names?.[0]?.nameForms?.[0]?.fullText;
  return form ?? "Unknown";
}

function parseGedcomxPerson(
  raw: GedcomxPerson,
  options?: { score?: number }
): Person {
  const fullName = personDisplayName(raw);
  const { firstName, lastName } = splitName(fullName);
  const id = raw.id ?? `fs-${fullName.replace(/\s/g, "-")}`;
  const birthDate =
    factDate(raw, "Birth") ??
    raw.display?.birthDate ??
    raw.display?.lifespan?.split("-")[0]?.trim();
  const deathDate =
    factDate(raw, "Death") ?? raw.display?.deathDate;
  const birthPlace =
    factPlace(raw, "Birth") ?? factPlace(raw, "Christening");

  return {
    id,
    firstName,
    lastName,
    birthDate,
    deathDate,
    birthPlace,
    familySearchId: raw.id,
    source: "familysearch",
    profileUrl: raw.id
      ? `https://www.familysearch.org/tree/person/details/${raw.id}`
      : undefined,
    matchScore: options?.score,
  };
}

async function getAccessToken(clientIp?: string): Promise<string> {
  const clientId = process.env.FAMILYSEARCH_CLIENT_ID?.trim();
  if (!clientId) {
    throw new FamilySearchError(
      "FamilySearch is not configured. Set FAMILYSEARCH_CLIENT_ID in .env.local.",
      "not_configured"
    );
  }

  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const body = new URLSearchParams({
    grant_type: "unauthenticated_session",
    client_id: clientId,
    ip_address: clientIp ?? "127.0.0.1",
  });

  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    signal: AbortSignal.timeout(10000),
  });

  const data = (await res.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !data.access_token) {
    throw new FamilySearchError(
      data.error_description ?? data.error ?? "FamilySearch authentication failed",
      "auth"
    );
  }

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + 50 * 60 * 1000,
  };

  return data.access_token;
}

async function fsFetch<T>(
  path: string,
  clientIp?: string,
  init?: RequestInit
): Promise<T> {
  const token = await getAccessToken(clientIp);
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/x-gedcomx-atom+json, application/x-fs-v1+json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
    signal: AbortSignal.timeout(15000),
  });

  if (res.status === 204) {
    throw new FamilySearchError("No FamilySearch records matched.", "empty");
  }

  if (res.status === 429) {
    throw new FamilySearchError("FamilySearch rate limit reached.", "limit");
  }

  if (!res.ok) {
    const errBody = await res.text();
    throw new FamilySearchError(
      `FamilySearch API error (${res.status}): ${errBody.slice(0, 200)}`,
      "error"
    );
  }

  return res.json() as Promise<T>;
}

function buildParentsFromRelationships(
  persons: GedcomxPerson[],
  relationships: GedcomxRelationship[],
  focusId: string
): Map<string, string[]> {
  const parentMap = new Map<string, string[]>();

  relationships
    .filter((r) => r.type?.includes("ParentChild"))
    .forEach((r) => {
      const parentId = r.person1?.resourceId;
      const childId = r.person2?.resourceId;
      if (!parentId || !childId) return;
      const existing = parentMap.get(childId) ?? [];
      if (!existing.includes(parentId)) existing.push(parentId);
      parentMap.set(childId, existing);
    });

  if (parentMap.size === 0 && persons.length > 1) {
    const focus = persons.find((p) => p.id === focusId) ?? persons[0];
    const others = persons.filter((p) => p.id && p.id !== focus.id);
    const likelyParents = others.slice(0, 2).map((p) => p.id!);
    if (focus.id && likelyParents.length) {
      parentMap.set(focus.id, likelyParents);
    }
  }

  return parentMap;
}

function buildParentsFromAhnentafel(
  persons: GedcomxPerson[]
): Map<string, string[]> {
  const byNumber = new Map<number, string>();
  persons.forEach((p) => {
    const num = parseInt(p.display?.ascendancyNumber ?? "", 10);
    if (p.id && !Number.isNaN(num)) byNumber.set(num, p.id);
  });

  const parentMap = new Map<string, string[]>();
  byNumber.forEach((id, n) => {
    if (n <= 1) return;
    const fatherNum = 2 * n;
    const motherNum = 2 * n + 1;
    const parents: string[] = [];
    if (byNumber.has(fatherNum)) parents.push(byNumber.get(fatherNum)!);
    if (byNumber.has(motherNum)) parents.push(byNumber.get(motherNum)!);
    if (parents.length) parentMap.set(id, parents);
  });

  return parentMap;
}

function gedcomxToPeople(
  persons: GedcomxPerson[],
  parentMap: Map<string, string[]>,
  options?: { score?: number; focusId?: string }
): Person[] {
  return persons
    .filter((p) => p.id)
    .map((p) => {
      const person = parseGedcomxPerson(p, options);
      const parents = parentMap.get(p.id!);
      if (parents?.length) person.parents = parents;
      return person;
    });
}

export async function searchPerson(
  firstName: string,
  lastName: string,
  options?: { birthPlace?: string; clientIp?: string; count?: number }
): Promise<{ people: Person[]; total: number }> {
  const params = new URLSearchParams({
    "q.surname": lastName,
    count: String(options?.count ?? 15),
    offset: "0",
  });
  if (firstName.trim()) params.set("q.givenName", firstName.trim());
  if (options?.birthPlace) params.set("q.birthLikePlace", options.birthPlace);

  const data = await fsFetch<SearchResponse>(
    `/tree/search?${params.toString()}`,
    options?.clientIp
  );

  const entries = data.entries ?? [];
  if (entries.length === 0) {
    throw new FamilySearchError("No FamilySearch tree persons matched.", "empty");
  }

  const people: Person[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const gedcomx = entry.content?.gedcomx;
    const focusId = entry.id ?? gedcomx?.persons?.[0]?.id;
    if (!gedcomx?.persons?.length || !focusId) continue;

    const focus = gedcomx.persons.find((p) => p.id === focusId) ?? gedcomx.persons[0];
    if (!focus?.id || seen.has(focus.id)) continue;
    seen.add(focus.id);

    const parentMap = buildParentsFromRelationships(
      gedcomx.persons,
      gedcomx.relationships ?? [],
      focus.id
    );

    const parsed = parseGedcomxPerson(focus, { score: entry.score });
    const parents = parentMap.get(focus.id);
    if (parents?.length) parsed.parents = parents;

    people.push(parsed);
  }

  if (people.length === 0) {
    throw new FamilySearchError("No FamilySearch tree persons matched.", "empty");
  }

  const total =
    data.searchInfo?.[0]?.totalHits ?? data.results ?? people.length;

  return { people, total };
}

export async function getAncestry(
  personId: string,
  generations = 4,
  clientIp?: string
): Promise<Person[]> {
  const params = new URLSearchParams({
    person: personId,
    generations: String(Math.min(generations, 8)),
    personDetails: "true",
  });

  const data = await fsFetch<AncestryResponse>(
    `/tree/ancestry?${params.toString()}`,
    clientIp
  );

  const persons = data.persons ?? [];
  if (persons.length === 0) {
    throw new FamilySearchError("No ancestry returned from FamilySearch.", "empty");
  }

  const parentMap = buildParentsFromAhnentafel(persons);
  return gedcomxToPeople(persons, parentMap, { focusId: personId });
}

export function familySearchDisclaimer(): string {
  return "Records from FamilySearch Family Tree (public genealogical data). Verify connections independently.";
}
