import type { NextApiRequest, NextApiResponse } from "next";
import { loadAncestry } from "@/lib/genealogy";
import type { JourneyInput, Person } from "@/types";

function clientIp(req: NextApiRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  if (Array.isArray(forwarded)) return forwarded[0];
  return req.socket.remoteAddress ?? "127.0.0.1";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const personId = (req.query.personId ?? req.body?.personId) as string;
  const familySearchId = req.query.familySearchId as string | undefined;
  const wikiTreeId = req.query.wikiTreeId as string | undefined;
  const wikidataId = req.query.wikidataId as string | undefined;
  const source = req.query.source as string | undefined;
  const surname = (req.query.surname as string) ?? "Family";
  const firstName = req.query.firstName as string | undefined;

  if (!personId && !familySearchId && !wikiTreeId && !wikidataId) {
    return res.status(400).json({ error: "personId, familySearchId, wikiTreeId, or wikidataId required" });
  }

  const input: JourneyInput = { surname, firstName: firstName || undefined };
  const person: Person = {
    id: personId ?? familySearchId ?? wikiTreeId ?? wikidataId ?? "unknown",
    firstName: firstName ?? "",
    lastName: surname,
    familySearchId,
    wikiTreeId,
    wikidataId,
    source:
      source === "curated" ||
      source === "familysearch" ||
      source === "wikitree" ||
      source === "wikidata" ||
      source === "wikipedia" ||
      source === "enriched"
        ? source
        : familySearchId
          ? "familysearch"
          : wikiTreeId
            ? "wikitree"
            : wikidataId
              ? "wikidata"
              : undefined,
  };

  try {
    const result = await loadAncestry(person, input, clientIp(req));
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({
      error: e instanceof Error ? e.message : "Ancestry load failed",
    });
  }
}
