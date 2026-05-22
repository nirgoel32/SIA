import type { NextApiRequest, NextApiResponse } from "next";
import { searchPerson, getPageImage } from "@/services/wikipedia";

type Response =
  | {
      title: string;
      portraitUrl: string;
      profileUrl: string;
      caption?: string;
      firstName: string;
      lastName: string;
      wikidataId?: string;
    }
  | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Response>
) {
  const firstName =
    (typeof req.query.firstName === "string" && req.query.firstName.trim()) || "";
  const lastName =
    (typeof req.query.lastName === "string" && req.query.lastName.trim()) || "";

  if (!firstName && !lastName) {
    return res.status(400).json({ error: "firstName or lastName required" });
  }

  try {
    // Find the best Wikipedia match for this name.
    const search = await searchPerson(firstName, lastName, { limit: 5 });
    const top = search.people[0];
    if (!top) {
      return res.status(404).json({ error: "No Wikipedia match for this name." });
    }

    // Wikipedia title we just resolved (from the profile URL slug).
    const title = decodeURIComponent(
      top.profileUrl?.split("/wiki/").pop() ?? `${firstName}_${lastName}`
    ).replace(/_/g, " ");

    const image = await getPageImage(title);
    if (!image?.url) {
      return res
        .status(404)
        .json({ error: "Wikipedia has no portrait for this person." });
    }

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=86400, stale-while-revalidate=604800"
    );
    return res.status(200).json({
      title,
      portraitUrl: image.url,
      profileUrl: top.profileUrl ?? "",
      caption: image.caption,
      firstName: top.firstName,
      lastName: top.lastName,
      wikidataId: top.wikidataId,
    });
  } catch (e) {
    return res.status(500).json({
      error: e instanceof Error ? e.message : "Portrait lookup failed",
    });
  }
}
