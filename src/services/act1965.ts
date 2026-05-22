/**
 * Service: personalized analysis of how the 1965 Immigration & Nationality
 * Act (Hart-Celler) impacted — or did not impact — a specific person.
 *
 * The Act:
 *  · Repealed the 1924 National Origins quota system that had largely
 *    restricted immigration to northern/western Europeans.
 *  · Created a preference system weighted ~74% toward family reunification
 *    and ~20% toward employment-based skills.
 *  · For the first time, imposed a numerical cap on Western Hemisphere
 *    migration — a *restriction* for Latin American (especially Mexican)
 *    flows that had previously been uncapped.
 *  · Took effect on June 30, 1968.
 *
 * The analysis is deterministically classified (so the same person always
 * gets the same framing) and then narratively expanded by a free-tier LLM.
 * If the LLM is unreachable, the deterministic narrative alone is returned —
 * so the feature degrades gracefully and never blocks a journey render.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const MODEL_CHAIN = [
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "openai/gpt-oss-120b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-4-31b-it:free",
  "z-ai/glm-4.5-air:free",
];

export type Act1965Frame =
  | "european-pre-act-settler" // European in US before 1965 — Act enabled later family chain migration
  | "european-pre-act-homeland" // European who died abroad before 1965 — Act shaped diaspora that followed
  | "asian-post-act-arrival" // Asian arriving after 1965 — Act made their entry legally possible
  | "african-post-act-arrival" // African arriving after 1965
  | "latin-restriction" // Mexican / Latin American — Act imposed first-ever Western Hemisphere cap
  | "lived-through-act" // Person was alive during 1965 — directly experienced the change
  | "post-act-descendant" // Born after 1965 to immigrant family — life is downstream of the Act
  | "indirect"; // None of the obvious frames apply — give a measured contextual reading

export type Act1965Input = {
  firstName?: string;
  lastName?: string;
  birthYear?: number;
  deathYear?: number;
  originCountry?: string;
  birthPlace?: string;
  /** True if a curated/verified record anchors this person. */
  verified?: boolean;
  /** Year of arrival in the United States, if known. */
  arrivalYear?: number;
};

export type Act1965Analysis = {
  frame: Act1965Frame;
  headline: string;
  /** 2–3 short paragraphs. Plain text, no markdown headings. */
  body: string;
  /** Concrete artifacts of the Act this person's story most intersects with. */
  mechanisms: string[];
  /** "generated" = LLM-written; "fallback" = deterministic template only. */
  source: "generated" | "fallback";
};

const ASIAN_COUNTRIES = new Set([
  "India",
  "China",
  "Korea",
  "South Korea",
  "North Korea",
  "Japan",
  "Vietnam",
  "Philippines",
  "Taiwan",
  "Pakistan",
  "Bangladesh",
  "Sri Lanka",
  "Nepal",
  "Cambodia",
  "Laos",
  "Thailand",
  "Indonesia",
  "Malaysia",
  "Hong Kong",
  "Singapore",
  "Burma",
  "Myanmar",
]);

const AFRICAN_COUNTRIES = new Set([
  "Nigeria",
  "Ghana",
  "Ethiopia",
  "Kenya",
  "Somalia",
  "South Africa",
  "Egypt",
  "Senegal",
  "Sudan",
  "Eritrea",
  "Uganda",
  "Cameroon",
  "Liberia",
  "Sierra Leone",
  "Ivory Coast",
  "Côte d'Ivoire",
  "Tanzania",
  "Zimbabwe",
  "Morocco",
  "Algeria",
  "Tunisia",
]);

const LATIN_COUNTRIES = new Set([
  "Mexico",
  "Cuba",
  "Dominican Republic",
  "Puerto Rico",
  "El Salvador",
  "Guatemala",
  "Honduras",
  "Nicaragua",
  "Costa Rica",
  "Panama",
  "Colombia",
  "Venezuela",
  "Ecuador",
  "Peru",
  "Bolivia",
  "Brazil",
  "Argentina",
  "Chile",
  "Uruguay",
  "Paraguay",
  "Haiti",
  "Jamaica",
  "Trinidad and Tobago",
]);

const EUROPEAN_COUNTRIES = new Set([
  "Ireland",
  "Italy",
  "Germany",
  "Poland",
  "England",
  "Scotland",
  "Wales",
  "United Kingdom",
  "France",
  "Russia",
  "Ukraine",
  "Belarus",
  "Lithuania",
  "Latvia",
  "Estonia",
  "Czech Republic",
  "Slovakia",
  "Czechoslovakia",
  "Hungary",
  "Austria",
  "Greece",
  "Romania",
  "Bulgaria",
  "Yugoslavia",
  "Serbia",
  "Croatia",
  "Bosnia",
  "Slovenia",
  "Netherlands",
  "Belgium",
  "Spain",
  "Portugal",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Switzerland",
  "Iceland",
]);

function classify(input: Act1965Input): Act1965Frame {
  const country = (input.originCountry ?? "").trim();
  const birth = input.birthYear;
  const death = input.deathYear;
  const arrival = input.arrivalYear;

  // Direct Latin-American restriction frame.
  if (LATIN_COUNTRIES.has(country)) return "latin-restriction";

  // Asian / African post-1965 arrival.
  if (ASIAN_COUNTRIES.has(country)) {
    if ((arrival ?? 9999) >= 1965 || (birth ?? 0) >= 1940) {
      return "asian-post-act-arrival";
    }
  }
  if (AFRICAN_COUNTRIES.has(country)) {
    if ((arrival ?? 9999) >= 1965 || (birth ?? 0) >= 1940) {
      return "african-post-act-arrival";
    }
  }

  // European: did they (or their family) settle in the US before the Act,
  // or stay in the homeland?
  if (EUROPEAN_COUNTRIES.has(country)) {
    if (death !== undefined && death < 1965) {
      // Died before the Act — story is about the diaspora that came after.
      return "european-pre-act-homeland";
    }
    if (arrival !== undefined && arrival < 1965) {
      return "european-pre-act-settler";
    }
    // Defaults: assume European with no recorded arrival → diaspora frame.
    return "european-pre-act-homeland";
  }

  // Lived through 1965 in their country of origin (any region not above).
  if (birth !== undefined && birth <= 1965 && (death ?? 2025) >= 1965) {
    return "lived-through-act";
  }

  // Born after 1965 — downstream of the Act.
  if (birth !== undefined && birth > 1965) return "post-act-descendant";

  return "indirect";
}

function headlineFor(frame: Act1965Frame, country: string): string {
  switch (frame) {
    case "european-pre-act-settler":
      return `The Act and the ${country} chain that followed`;
    case "european-pre-act-homeland":
      return `The Act and the ${country} diaspora`;
    case "asian-post-act-arrival":
      return `The Act made the ${country}-American story possible`;
    case "african-post-act-arrival":
      return `The Act opened a door for ${country}`;
    case "latin-restriction":
      return `The Act's first-ever cap on the Western Hemisphere`;
    case "lived-through-act":
      return `Living through the 1965 reform`;
    case "post-act-descendant":
      return `A life downstream of Hart-Celler`;
    default:
      return `The 1965 Act in context`;
  }
}

function mechanismsFor(frame: Act1965Frame): string[] {
  switch (frame) {
    case "european-pre-act-settler":
      return [
        "Family reunification preferences (74% of visas)",
        "Repeal of the 1924 National Origins quota system",
        "Extended-family chain migration enabled",
      ];
    case "european-pre-act-homeland":
      return [
        "Repeal of the 1924 National Origins quota system",
        "Family reunification preferences for relatives already in the US",
        "Shift away from northern/western-European bias",
      ];
    case "asian-post-act-arrival":
      return [
        "Repeal of the 1882 Chinese Exclusion Act's residual quotas",
        "20,000-per-country annual cap (a dramatic increase for Asia)",
        "Employment-based preferences (skilled workers, professionals)",
        "Family-reunification chain migration after first arrivals",
      ];
    case "african-post-act-arrival":
      return [
        "Repeal of the National Origins Formula that effectively barred Africa",
        "20,000-per-country annual cap opened legal pathways",
        "Diversity Visa program (added 1990, amended Hart-Celler)",
      ];
    case "latin-restriction":
      return [
        "First-ever numerical cap on Western Hemisphere immigration (120,000/year)",
        "Per-country cap added in 1976 (20,000/year)",
        "Ended the bracero-era flexibility of uncapped Mexican labor migration",
        "Family preferences still allowed sponsored relatives",
      ];
    case "lived-through-act":
      return [
        "Hart-Celler Act signed October 3, 1965 by President Johnson",
        "Effective June 30, 1968",
        "Repealed the 1924 National Origins Formula",
        "Source-country composition of US immigration shifted within a generation",
      ];
    case "post-act-descendant":
      return [
        "Family arrival pathway likely traceable to Hart-Celler preferences",
        "Source-country diversification post-1965",
        "Family-reunification chain migration",
      ];
    default:
      return [
        "Repeal of the 1924 National Origins quota system",
        "Family reunification (74% of visas) and skilled-worker preferences",
      ];
  }
}

/** Deterministic narrative fallback. Used when the LLM is unavailable. */
function fallbackBody(input: Act1965Input, frame: Act1965Frame): string {
  const name = [input.firstName, input.lastName].filter(Boolean).join(" ").trim() || "this person";
  const country = input.originCountry ?? "their country of origin";
  const lifespan =
    input.birthYear && input.deathYear
      ? `(${input.birthYear}–${input.deathYear})`
      : input.birthYear
        ? `(b. ${input.birthYear})`
        : "";

  switch (frame) {
    case "european-pre-act-settler":
      return `${name} ${lifespan} had settled in the United States before the Hart-Celler Act took effect in 1968. For families like this one, the Act's most direct consequence was the family-reunification preference: relatives who had remained in ${country} could now be sponsored under generous categories that hadn't existed under the 1924 quota regime. Many extended-family arrivals from ${country} in the late 1960s and 1970s trace their legal pathway directly to Hart-Celler.`;
    case "european-pre-act-homeland":
      return `${name} ${lifespan} lived their life primarily in ${country}, and the 1965 Hart-Celler Act came too late to alter their personal story. But it dramatically reshaped the ${country} diaspora that followed — repealing the 1924 National Origins Formula that had quietly restricted European immigration to favored source countries, and opening family-reunification pathways that later relatives would use to follow earlier migrants to the United States.`;
    case "asian-post-act-arrival":
      return `For ${name} ${lifespan} and the ${country}-American community, the 1965 Hart-Celler Act was foundational. Before 1965, the National Origins Formula and the residual structure of the 1882 Chinese Exclusion Act effectively capped Asian immigration at a fraction of one percent. Hart-Celler replaced that system with a 20,000-per-country annual cap and preferences for skilled workers and family — and within a generation, the ${country}-American population in the US grew several-fold.`;
    case "african-post-act-arrival":
      return `For ${name} ${lifespan} and the ${country}-American story, the 1965 Hart-Celler Act was the legal precondition for arrival in any meaningful numbers. The 1924 quota system had set African quotas so low they were essentially symbolic. Hart-Celler's 20,000-per-country cap and (later) the 1990 Diversity Visa program opened pathways that had been effectively closed for half a century.`;
    case "latin-restriction":
      return `Unlike most post-1965 immigrant stories, the Hart-Celler Act was a *restriction* for ${country}. For the first time in US history, the Western Hemisphere was placed under a numerical cap — 120,000 per year for the entire region, and (after 1976) 20,000 per country. The earlier bracero-era flexibility that had absorbed millions of Mexican workers without strict numerical limits ended. ${name} ${lifespan} and their family navigated a system that simultaneously opened doors elsewhere and tightened them here.`;
    case "lived-through-act":
      return `${name} ${lifespan} was alive when President Johnson signed the Hart-Celler Act at the foot of the Statue of Liberty on October 3, 1965. For an individual living through the change, the most immediate consequence was the collapse of the National Origins Formula — the 1924 system that had quietly determined for forty years who counted as a desirable immigrant. The composition of US immigration changed within a single generation.`;
    case "post-act-descendant":
      return `${name} ${lifespan} was born after the Hart-Celler Act took effect, into a country whose immigration system the Act had fundamentally redesigned. For families with roots in ${country}, the most likely legal pathway by which earlier relatives arrived runs directly through Hart-Celler's family-reunification preferences or its employment-based categories.`;
    default:
      return `The 1965 Hart-Celler Act reshaped American immigration by repealing the 1924 National Origins Formula and replacing it with per-country caps and preferences for family reunification and skilled workers. For ${name} ${lifespan}, the most relevant consequence is the broader reshaping of US source-country composition that followed.`;
  }
}

function buildPrompt(input: Act1965Input, frame: Act1965Frame): string {
  const facts: string[] = [];
  if (input.firstName || input.lastName) {
    facts.push(`Name: ${[input.firstName, input.lastName].filter(Boolean).join(" ")}`);
  }
  if (input.birthYear) facts.push(`Birth year: ${input.birthYear}`);
  if (input.deathYear) facts.push(`Death year: ${input.deathYear}`);
  if (input.originCountry) facts.push(`Country of origin: ${input.originCountry}`);
  if (input.birthPlace) facts.push(`Birthplace: ${input.birthPlace}`);
  if (input.arrivalYear) facts.push(`US arrival year: ${input.arrivalYear}`);
  facts.push(`Analytical frame (do not deviate): ${frame}`);

  const frameGuide: Record<Act1965Frame, string> = {
    "european-pre-act-settler":
      "Their family arrived before 1965. Focus on how Hart-Celler enabled later family-reunification chain migration of relatives from their homeland.",
    "european-pre-act-homeland":
      "They lived/died abroad before or near 1965. Focus on how Hart-Celler reshaped the diaspora that followed — not their personal story.",
    "asian-post-act-arrival":
      "The Act made their American presence legally possible. Focus on the repeal of National-Origins quotas and the 20,000-per-country cap that opened Asian immigration.",
    "african-post-act-arrival":
      "The Act opened a previously near-closed door. Focus on the repeal of National-Origins quotas and (where relevant) the 1990 Diversity Visa.",
    "latin-restriction":
      "The Act was a RESTRICTION for them — first-ever Western Hemisphere cap. Do not portray it as an opening; portray the genuine tightening.",
    "lived-through-act":
      "They were alive when the Act passed. Acknowledge the immediate context they would have experienced.",
    "post-act-descendant":
      "They were born after 1965. Their life is downstream of the Act; describe the structural inheritance.",
    indirect:
      "No obvious direct impact. Give a measured contextual reading of the Act's broader American consequences for this person's community.",
  };

  return `You are writing a single-paragraph editorial passage for an interactive public-history exhibit on US immigration.

Subject — verified facts only:
${facts.join("\n")}

Framing guidance (must follow):
${frameGuide[frame]}

Historical facts about the 1965 Immigration & Nationality Act (Hart-Celler) you may draw on — but ONLY when accurate and relevant:
- Signed October 3, 1965 by President Lyndon B. Johnson at the foot of the Statue of Liberty.
- Took effect June 30, 1968.
- Repealed the 1924 National Origins Formula that favored northern/western Europeans.
- Established a preference system: ~74% family reunification, ~20% employment / skills, ~6% refugees.
- Set a 20,000-per-country annual cap (Eastern Hemisphere from 1965; Western Hemisphere from 1976).
- For the FIRST TIME, capped Western Hemisphere immigration (120,000/year initially) — a restriction for Mexico.
- Catalysts: civil-rights momentum, JFK-era reform push, Cold War optics.

Write 2–3 short paragraphs (180–260 words total) in measured, editorial prose suitable for a Smithsonian or Library-of-Congress exhibit. Do NOT:
- invent biographical details not in the facts list;
- use markdown, headers, or bullet points;
- begin with a date or with "The Hart-Celler Act";
- use phrases like "in conclusion" or "to summarize";
- mention this prompt or these rules.

Do:
- name the person where natural;
- ground the discussion in their lifespan and origin country;
- be specific about which mechanisms of the Act applied or didn't;
- when the Act did not personally affect them, say so plainly and pivot to the structural impact on their community.

Return only the prose. No preamble.`;
}

async function callModel(
  model: string,
  prompt: string,
  apiKey: string
): Promise<string | null> {
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
        {
          role: "system",
          content:
            "You are a careful public-history writer for a Smithsonian-style exhibit. You write measured, factually-grounded editorial prose. Never invent biographical details. Never use markdown or headings. Never preface the response.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 500,
      temperature: 0.55,
    }),
    signal: AbortSignal.timeout(25000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenRouter HTTP ${res.status}: ${body.slice(0, 160)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content?.trim() ?? "";
  return text || null;
}

const cache = new Map<string, Act1965Analysis>();

function cacheKey(input: Act1965Input): string {
  return [
    input.firstName ?? "",
    input.lastName ?? "",
    input.birthYear ?? "",
    input.deathYear ?? "",
    input.originCountry ?? "",
    input.arrivalYear ?? "",
  ]
    .join("|")
    .toLowerCase();
}

export async function generateAct1965Analysis(
  input: Act1965Input
): Promise<Act1965Analysis> {
  const key = cacheKey(input);
  const cached = cache.get(key);
  if (cached) return cached;

  const frame = classify(input);
  const country = input.originCountry ?? "their homeland";
  const headline = headlineFor(frame, country);
  const mechanisms = mechanismsFor(frame);

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (apiKey) {
    const prompt = buildPrompt(input, frame);
    for (const model of MODEL_CHAIN) {
      try {
        const text = await callModel(model, prompt, apiKey);
        if (text && text.length > 80) {
          const result: Act1965Analysis = {
            frame,
            headline,
            body: text,
            mechanisms,
            source: "generated",
          };
          cache.set(key, result);
          return result;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("429")) {
          await new Promise((r) => setTimeout(r, 1500));
        }
        console.warn(`[act1965] ${model} failed:`, msg.slice(0, 160));
      }
    }
  }

  const result: Act1965Analysis = {
    frame,
    headline,
    body: fallbackBody(input, frame),
    mechanisms,
    source: "fallback",
  };
  cache.set(key, result);
  return result;
}
