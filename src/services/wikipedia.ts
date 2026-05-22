import type { ChapterImage, Person } from "@/types";

const SEARCH_URL = "https://en.wikipedia.org/w/api.php";
const SUMMARY_URL = "https://en.wikipedia.org/api/rest_v1/page/summary";
const USER_AGENT =
  process.env.WIKIPEDIA_USER_AGENT ??
  "ImmigrationJourney/0.1 (educational installation; contact: example@example.com)";

type SearchResult = {
  title: string;
  pageid: number;
  snippet?: string;
};

type ApiSearchResponse = {
  query?: { search?: SearchResult[] };
};

type ApiPageInfo = {
  pageid: number;
  title: string;
  pageprops?: {
    wikibase_item?: string; // Q-id
    "disambiguation"?: string;
  };
  extract?: string;
  birth_date?: string;
  birth_place?: string;
};

type ApiPagesResponse = {
  query?: { pages?: Record<string, ApiPageInfo> };
};

export class WikipediaError extends Error {
  constructor(
    message: string,
    public code: "empty" | "error" | "limit"
  ) {
    super(message);
    this.name = "WikipediaError";
  }
}

function splitName(full: string): { firstName: string; lastName: string } {
  const cleaned = full.replace(/\s*\(.+?\)\s*$/, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Unknown", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

async function wpFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(12000),
  });
  if (res.status === 429) {
    throw new WikipediaError("Wikipedia rate limit reached.", "limit");
  }
  if (!res.ok) {
    throw new WikipediaError(`Wikipedia HTTP ${res.status}`, "error");
  }
  return res.json() as Promise<T>;
}

export async function searchPerson(
  firstName: string,
  lastName: string,
  options: { limit?: number } = {}
): Promise<{ people: Person[]; total: number }> {
  const limit = Math.min(options.limit ?? 8, 15);
  const fullName = `${firstName} ${lastName}`.trim();
  if (!fullName) {
    throw new WikipediaError("Wikipedia needs at least a name.", "empty");
  }

  // Step 1 — search for matching article titles.
  const searchParams = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: `${fullName} biography`,
    srlimit: String(limit),
    srnamespace: "0",
    format: "json",
    origin: "*",
  });
  const searchData = await wpFetch<ApiSearchResponse>(
    `${SEARCH_URL}?${searchParams.toString()}`
  );
  const hits = searchData.query?.search ?? [];
  if (hits.length === 0) {
    throw new WikipediaError("No Wikipedia article matched.", "empty");
  }

  // Step 2 — pull summary/pageprops for the top hits so we can show a real
  // bio card (and capture the Wikidata Q-id for linking to the ancestry source).
  const titles = hits.map((h) => h.title).slice(0, limit);
  const pageParams = new URLSearchParams({
    action: "query",
    titles: titles.join("|"),
    prop: "pageprops|description|extracts",
    exintro: "1",
    explaintext: "1",
    exchars: "240",
    format: "json",
    origin: "*",
  });
  const pageData = await wpFetch<ApiPagesResponse>(
    `${SEARCH_URL}?${pageParams.toString()}`
  );
  const pages = Object.values(pageData.query?.pages ?? {});
  if (pages.length === 0) {
    throw new WikipediaError("Wikipedia returned no usable pages.", "empty");
  }

  const people: Person[] = [];
  for (const page of pages) {
    if (page.pageprops?.disambiguation !== undefined) continue;
    const wikidataId = page.pageprops?.wikibase_item;
    const { firstName: fn, lastName: ln } = splitName(page.title);
    if (!fn) continue;

    people.push({
      id: wikidataId ?? `wp-${page.pageid}`,
      firstName: fn,
      lastName: ln || lastName,
      birthPlace: page.extract?.match(/born[^.]{0,80}in ([A-Z][^,.]{2,60})/i)?.[1],
      wikidataId,
      source: wikidataId ? "wikidata" : "wikipedia",
      profileUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`,
    });
  }

  if (people.length === 0) {
    throw new WikipediaError("All Wikipedia matches were disambiguation pages.", "empty");
  }

  return { people, total: people.length };
}

type SummaryResponse = {
  title?: string;
  description?: string;
  thumbnail?: { source?: string; width?: number; height?: number };
  originalimage?: { source?: string };
  content_urls?: { desktop?: { page?: string } };
  type?: string;
};

const imageCache = new Map<string, ChapterImage | null>();

/** Fetch the lead image for a Wikipedia article. Server-side use only —
 *  Wikipedia's REST API requires a User-Agent. Cached in-process. */
export async function getPageImage(title: string): Promise<ChapterImage | null> {
  const key = title.trim();
  if (!key) return null;
  if (imageCache.has(key)) return imageCache.get(key)!;

  try {
    const summaryUrl = `${SUMMARY_URL}/${encodeURIComponent(key)}`;
    const data = await wpFetch<SummaryResponse>(summaryUrl);
    if (data.type === "disambiguation") {
      imageCache.set(key, null);
      return null;
    }
    // Use the thumb URL Wikipedia returned verbatim — it's guaranteed to be
    // a cached size on their CDN. Trying to construct fake bigger widths
    // hits 400 errors for many images.
    const url = data.thumbnail?.source ?? data.originalimage?.source;
    if (!url) {
      imageCache.set(key, null);
      return null;
    }
    const image: ChapterImage = {
      url,
      caption: data.description,
      credit: `Wikipedia · ${data.title ?? key}`,
      sourceUrl: data.content_urls?.desktop?.page,
    };
    imageCache.set(key, image);
    return image;
  } catch {
    imageCache.set(key, null);
    return null;
  }
}

/** Returns just the Wikidata Q-id for a Wikipedia article title — useful for
 *  bridging into the Wikidata ancestry fetcher when a user explicitly picks a
 *  Wikipedia result. */
export async function resolveWikidataId(title: string): Promise<string | null> {
  const url = `${SUMMARY_URL}/${encodeURIComponent(title)}`;
  try {
    const data = await wpFetch<{ wikibase_item?: string }>(url);
    return data.wikibase_item ?? null;
  } catch {
    return null;
  }
}

export function wikipediaDisclaimer(): string {
  return "Profile sourced from Wikipedia (public encyclopedia). Family connections, when available, come via the linked Wikidata record.";
}
