import type { NextApiRequest, NextApiResponse } from "next";
import { searchGenealogy } from "@/lib/genealogy";
import type { JourneyInput } from "@/types";

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
  const lastName = (req.query.lastName ?? req.body?.lastName) as string;
  const firstName = (req.query.firstName ?? req.body?.firstName ?? "") as string;
  const country = req.query.country as string | undefined;

  if (!lastName) {
    return res.status(400).json({ error: "lastName is required" });
  }

  const input: JourneyInput = {
    surname: lastName,
    firstName: firstName || undefined,
    country,
  };

  try {
    const result = await searchGenealogy(input, clientIp(req));
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({
      error: e instanceof Error ? e.message : "Genealogy search failed",
    });
  }
}
