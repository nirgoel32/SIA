import type { NextApiRequest, NextApiResponse } from "next";
import { geocodePlace, geocodePlaces } from "@/services/geocode";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // GET ?place=Sancellemoz — single-place lookup, returns once that one
  // resolves. Lets the client fan out in parallel for snappy UX.
  if (req.method === "GET") {
    const place = (req.query.place as string)?.trim();
    if (!place) return res.status(400).json({ error: "place is required" });
    try {
      const coord = await geocodePlace(place);
      return res.status(200).json({ place, coord });
    } catch (e) {
      return res.status(500).json({
        error: e instanceof Error ? e.message : "Geocoding failed",
      });
    }
  }

  // POST { places: [...] } — batch lookup, retained for server-side use.
  if (req.method === "POST") {
    const places = req.body?.places;
    if (!Array.isArray(places) || places.some((p) => typeof p !== "string")) {
      return res.status(400).json({ error: "body.places must be string[]" });
    }
    if (places.length > 25) {
      return res.status(400).json({ error: "at most 25 places per request" });
    }
    try {
      const results = await geocodePlaces(places);
      return res.status(200).json({ coords: results });
    } catch (e) {
      return res.status(500).json({
        error: e instanceof Error ? e.message : "Geocoding failed",
      });
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "GET or POST only" });
}
