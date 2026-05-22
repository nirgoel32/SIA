import type { NextApiRequest, NextApiResponse } from "next";
import { generateAct1965Analysis, type Act1965Analysis } from "@/services/act1965";

function pickNumber(v: unknown): number | undefined {
  if (typeof v === "string" && v.trim()) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : undefined;
  }
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return undefined;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Act1965Analysis | { error: string }>
) {
  try {
    const q = req.query;
    const result = await generateAct1965Analysis({
      firstName: typeof q.firstName === "string" ? q.firstName : undefined,
      lastName: typeof q.lastName === "string" ? q.lastName : undefined,
      birthYear: pickNumber(q.birthYear),
      deathYear: pickNumber(q.deathYear),
      originCountry:
        typeof q.country === "string" && q.country.trim() ? q.country : undefined,
      birthPlace:
        typeof q.birthPlace === "string" && q.birthPlace.trim()
          ? q.birthPlace
          : undefined,
      arrivalYear: pickNumber(q.arrivalYear),
      verified: q.verified === "1" || q.verified === "true",
    });
    // 24h CDN cache; the analysis is keyed on personal facts and stable.
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=86400, stale-while-revalidate=604800"
    );
    return res.status(200).json(result);
  } catch (e) {
    return res
      .status(500)
      .json({ error: e instanceof Error ? e.message : "Analysis failed" });
  }
}
