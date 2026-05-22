import type { NextApiRequest, NextApiResponse } from "next";
import {
  searchPerson,
  buildEnrichedTree,
  getEnrichedDisclaimer,
  WikiTreeError,
} from "@/services/wikitree";
import type { JourneyInput } from "@/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const lastName = (req.query.lastName ?? req.body?.lastName) as string;
  const firstName = (req.query.firstName ?? req.body?.firstName ?? "") as string;

  if (!lastName) {
    return res.status(400).json({ error: "lastName is required" });
  }

  const input: JourneyInput = { surname: lastName, firstName: firstName || undefined };

  try {
    const { people, total } = await searchPerson(firstName, lastName);
    return res.status(200).json({
      people,
      total,
      source: "wikitree",
      needsSelection: people.length > 1,
      disclaimer:
        "Public WikiTree genealogical records. Select a profile if multiple matches appear.",
    });
  } catch (e) {
    if (e instanceof WikiTreeError) {
      if (e.code === "empty") {
        return res.status(200).json({
          people: buildEnrichedTree(input),
          total: 0,
          source: "enriched",
          needsSelection: false,
          disclaimer: getEnrichedDisclaimer(input),
        });
      }
      if (e.code === "limit") {
        return res.status(200).json({
          people: buildEnrichedTree(input),
          total: 0,
          source: "enriched",
          needsSelection: false,
          disclaimer: `${e.message} Showing a modeled family story based on surname and migration history.`,
        });
      }
    }

    return res.status(200).json({
      people: buildEnrichedTree(input),
      total: 0,
      source: "enriched",
      needsSelection: false,
      disclaimer: getEnrichedDisclaimer(input),
    });
  }
}
