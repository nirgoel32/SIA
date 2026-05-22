import type { NextApiRequest, NextApiResponse } from "next";
import { searchRecords, recordsToMigrations } from "@/services/ellisIsland";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const surname = req.query.surname as string;
  const country = req.query.country as string | undefined;

  if (!surname) {
    return res.status(400).json({ error: "surname is required" });
  }

  const records = searchRecords(surname, country);
  const migrations = recordsToMigrations(records);

  return res.status(200).json({
    records,
    migrations,
    source: records.length > 0 ? "ellis-curated" : "none",
    disclaimer:
      records.length > 0
        ? "Curated historical passenger records for demonstration."
        : "No matching records in curated dataset.",
  });
}
