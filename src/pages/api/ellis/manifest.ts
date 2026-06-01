import type { NextApiRequest, NextApiResponse } from "next";
import { matchManifest, type ManifestEntry } from "@/services/ellisManifest";

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ManifestEntry | { error: string } | { result: null }>
) {
  const lastName =
    (typeof req.query.lastName === "string" && req.query.lastName.trim()) || "";
  const firstName =
    (typeof req.query.firstName === "string" && req.query.firstName.trim()) ||
    undefined;
  const country =
    (typeof req.query.country === "string" && req.query.country.trim()) || "";
  const decade =
    typeof req.query.decade === "string" ? req.query.decade : undefined;

  if (!lastName) {
    return res.status(400).json({ error: "lastName required" });
  }
  if (!country) {
    return res.status(400).json({ error: "country required" });
  }

  const result = matchManifest({ lastName, firstName, country, decade });
  if (!result) {
    return res.status(200).json({ result: null });
  }
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=86400, stale-while-revalidate=604800"
  );
  return res.status(200).json(result);
}
