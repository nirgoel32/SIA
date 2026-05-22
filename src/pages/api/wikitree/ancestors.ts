import type { NextApiRequest, NextApiResponse } from "next";
import {
  getAncestors,
  buildEnrichedTree,
  getEnrichedDisclaimer,
  WikiTreeError,
} from "@/services/wikitree";
import type { JourneyInput } from "@/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const key = (req.query.key ?? req.body?.key) as string;
  const surname = (req.query.surname as string) ?? "Family";
  const firstName = (req.query.firstName as string) ?? "";

  if (!key) {
    return res.status(400).json({ error: "key is required" });
  }

  const input: JourneyInput = { surname, firstName: firstName || undefined };

  try {
    const ancestors = await getAncestors(key, 4);
    return res.status(200).json({
      ancestors,
      source: "wikitree",
      disclaimer: "Genealogical records from WikiTree — verify independently.",
    });
  } catch (e) {
    const fallback = buildEnrichedTree(input);
    const message =
      e instanceof WikiTreeError
        ? e.message
        : "Could not load ancestors from WikiTree.";

    return res.status(200).json({
      ancestors: fallback,
      source: "enriched",
      disclaimer: `${message} ${getEnrichedDisclaimer(input)}`,
    });
  }
}
