import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Image proxy for Wikipedia portraits.
 *
 * face-api.js needs to read raw pixel data from the image to compute a
 * descriptor. Cross-origin images without CORS headers will paint to a
 * canvas but the canvas becomes "tainted" and getImageData() throws —
 * face-api can't analyze them. Wikipedia/Commons does serve CORS, but
 * intermittently and inconsistently across CDN edges. Proxying the
 * portrait through this route serves it from our own origin, avoiding
 * the taint entirely.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const src = typeof req.query.src === "string" ? req.query.src : "";
  if (!src || !/^https?:\/\//i.test(src)) {
    return res.status(400).json({ error: "src must be an http(s) URL" });
  }
  // Restrict to Wikipedia / Wikimedia hosts so we don't become an open proxy.
  let host: string;
  try {
    host = new URL(src).host;
  } catch {
    return res.status(400).json({ error: "src is not a valid URL" });
  }
  if (
    !/\.wikipedia\.org$/i.test(host) &&
    !/\.wikimedia\.org$/i.test(host) &&
    !/^upload\.wikimedia\.org$/i.test(host)
  ) {
    return res
      .status(400)
      .json({ error: "Only Wikipedia/Wikimedia sources allowed" });
  }

  try {
    // Wikimedia's image CDN rejects requests whose User-Agent doesn't look
    // like a browser or a properly-identified bot. Their robot policy
    // (w.wiki/4wJS) is strict on `upload.wikimedia.org`. We send a UA that
    // identifies the project AND is browser-shaped, with a contact URL.
    const upstream = await fetch(src, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ImmigrationJourney/0.1; +https://github.com/anthropics/claude-code)",
        Accept: "image/avif,image/webp,image/jpeg,image/png,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!upstream.ok) {
      return res
        .status(upstream.status)
        .json({ error: `Upstream HTTP ${upstream.status}` });
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    const ct = upstream.headers.get("content-type") ?? "image/jpeg";
    res.setHeader("Content-Type", ct);
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.status(200).send(buf);
  } catch (e) {
    return res.status(500).json({
      error: e instanceof Error ? e.message : "Proxy fetch failed",
    });
  }
}
