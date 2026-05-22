import { resolvePlace, type LatLng } from "@/lib/mapGeo";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT =
  process.env.NOMINATIM_USER_AGENT ??
  "ImmigrationJourney/0.1 (educational installation; contact: example@example.com)";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// Free models only, per user request. Larger models are tried first because
// they have stronger world-knowledge for obscure place names; we fall through
// to smaller / auto-routed models if one is rate-limited (HTTP 429).
const MODEL_CHAIN = [
  "openrouter/free", // auto-routed to whichever free model has capacity
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "openai/gpt-oss-120b:free",
  "google/gemma-4-31b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "z-ai/glm-4.5-air:free",
];

const cache = new Map<string, LatLng | null>();

function normalize(place: string): string {
  return place.trim().toLowerCase();
}

function isValidCoord(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/** Throttle Nominatim to the rate their public service requires (~1 req/sec).
 *  Module-level so it serializes across concurrent route handlers. */
let nominatimChain: Promise<unknown> = Promise.resolve();

async function nominatimLookup(place: string): Promise<LatLng | null> {
  const params = new URLSearchParams({
    q: place,
    format: "jsonv2",
    limit: "1",
    addressdetails: "0",
  });
  const url = `${NOMINATIM_URL}?${params.toString()}`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });
  if (res.status === 429 || res.status === 503) {
    throw new Error(`Nominatim HTTP ${res.status}`);
  }
  if (!res.ok) return null;
  const rows = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const lat = parseFloat(rows[0].lat);
  const lng = parseFloat(rows[0].lon);
  return isValidCoord(lat, lng);
}

async function geocodeViaNominatim(place: string): Promise<LatLng | null> {
  // Try the full string first, then progressively coarser fallbacks
  // (e.g. "Sancellemoz, Passy, Haute-Savoie, France" → "Haute-Savoie, France").
  const parts = place.split(",").map((p) => p.trim()).filter(Boolean);
  const candidates: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    candidates.push(parts.slice(i).join(", "));
  }
  if (candidates.length === 0) candidates.push(place);

  for (const candidate of candidates) {
    // Serialize against the shared chain so concurrent handlers don't burst.
    const run = nominatimChain.then(async () => {
      const result = await nominatimLookup(candidate);
      // Always wait at least 1100ms after a Nominatim hit to respect the
      // public-service usage policy.
      await new Promise((r) => setTimeout(r, 1100));
      return result;
    });
    nominatimChain = run.catch(() => null);
    try {
      const result = await run;
      if (result) return result;
    } catch {
      // try next candidate
    }
  }
  return null;
}

async function askOpenRouter(
  model: string,
  place: string,
  apiKey: string
): Promise<LatLng | null> {
  const prompt = `Return the geographic coordinates of "${place}".

Reply with ONE JSON object on a single line, nothing else:
{"lat": <decimal degrees>, "lng": <decimal degrees>}

Rules:
- Use the most likely place if the name is ambiguous, preferring historically significant locations.
- Latitudes range from -90 to 90, longitudes from -180 to 180.
- If you genuinely don't know, return {"lat": null, "lng": null}.
- No prose, no markdown, no code fences.`;

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Immigration Journey",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "You are a geographic gazetteer. You respond with one JSON object only." },
        { role: "user", content: prompt },
      ],
      max_tokens: 60,
      temperature: 0,
    }),
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenRouter HTTP ${res.status}: ${body.slice(0, 120)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content?.trim() ?? "";
  const match = text.match(/\{[^{}]*\}/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]) as { lat?: unknown; lng?: unknown };
    return isValidCoord(parsed.lat, parsed.lng);
  } catch {
    return null;
  }
}

export async function geocodePlace(place: string): Promise<LatLng | null> {
  if (!place || place.length < 2) return null;
  const key = normalize(place);
  if (cache.has(key)) return cache.get(key)!;

  // 0. Local city dictionary — instant, no network.
  const local = resolvePlace(place);
  if (local) {
    cache.set(key, local);
    return local;
  }

  // 1. Primary: Nominatim (OpenStreetMap). Public, no key, geographically
  //    accurate. Free models hallucinate badly on obscure place names.
  try {
    const result = await geocodeViaNominatim(place);
    if (result) {
      cache.set(key, result);
      return result;
    }
  } catch (e) {
    console.warn(`[geocode] Nominatim failed for "${place}":`, e instanceof Error ? e.message : e);
  }

  // 2. Fallback: free OpenRouter models. Only useful when the place is so
  //    obscure that Nominatim has no record (e.g. historical hamlets that
  //    were renamed or merged into other municipalities).
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (apiKey) {
    for (const model of MODEL_CHAIN) {
      try {
        const result = await askOpenRouter(model, place, apiKey);
        if (result) {
          cache.set(key, result);
          return result;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("429")) {
          await new Promise((r) => setTimeout(r, 1500));
        }
        console.warn(`[geocode] ${model} failed for "${place}":`, msg.slice(0, 160));
      }
    }
  }

  // Don't cache misses — let a later request try again.
  return null;
}

export async function geocodePlaces(
  places: string[]
): Promise<Record<string, LatLng | null>> {
  const unique = Array.from(new Set(places.map((p) => p.trim()).filter(Boolean)));
  const results: Record<string, LatLng | null> = {};

  // Sequential — free-tier models on OpenRouter are aggressively rate-limited
  // (Llama 3.3 70B is roughly 10 requests/minute). The in-memory cache makes
  // subsequent visits cheap.
  for (const place of unique) {
    results[place] = await geocodePlace(place);
  }

  return results;
}
