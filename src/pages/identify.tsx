import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "@/components/Layout";
import SectionHeader from "@/components/SectionHeader";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import {
  descriptorFromFile,
  descriptorFromUrl,
  distance,
  distanceToConfidence,
  preloadFaceModels,
  verdictFor,
  type Verdict,
} from "@/lib/faceApi";

type PortraitPayload = {
  title: string;
  portraitUrl: string;
  profileUrl: string;
  caption?: string;
  firstName: string;
  lastName: string;
  wikidataId?: string;
};

type Stage =
  | { kind: "idle" }
  | { kind: "preloading" }
  | { kind: "ready" }
  | { kind: "running"; step: string }
  | {
      kind: "done";
      verdict: Verdict;
      confidence: number;
      distance: number;
      uploadedUrl: string;
      portrait: PortraitPayload;
    }
  | { kind: "error"; message: string };

const VERDICT_COPY: Record<Verdict, { label: string; tone: string; body: string }> = {
  match: {
    label: "Confirmed match",
    tone: "text-gold",
    body: "The uploaded photograph and the Wikipedia portrait depict the same person to a high degree of confidence.",
  },
  possible: {
    label: "Possible match",
    tone: "text-museum-text",
    body: "There is meaningful similarity but the result is below the strict identity threshold. Consider verifying with another image.",
  },
  different: {
    label: "Different person",
    tone: "text-brick",
    body: "These two photographs do not appear to depict the same individual. The uploaded portrait does not match the named Wikipedia profile.",
  },
};

export default function IdentifyPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const dropRef = useRef<HTMLLabelElement>(null);

  // Warm up the face-api models in the background as soon as the page loads.
  useEffect(() => {
    let cancelled = false;
    setStage({ kind: "preloading" });
    preloadFaceModels()
      .then(() => {
        if (!cancelled) setStage({ kind: "ready" });
      })
      .catch((e) => {
        if (!cancelled)
          setStage({
            kind: "error",
            message: `Could not load face-recognition models: ${
              e instanceof Error ? e.message : e
            }`,
          });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onFile = useCallback((f: File | null) => {
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleVerify = useCallback(async () => {
    if (!file || (!firstName.trim() && !lastName.trim())) return;
    try {
      setStage({ kind: "running", step: "Fetching Wikipedia portrait" });
      const params = new URLSearchParams();
      if (firstName.trim()) params.set("firstName", firstName.trim());
      if (lastName.trim()) params.set("lastName", lastName.trim());
      const res = await fetch(`/api/identify/portrait?${params.toString()}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Portrait lookup failed (HTTP ${res.status})`);
      }
      const portrait = (await res.json()) as PortraitPayload;

      setStage({ kind: "running", step: "Analyzing your photograph" });
      const userDesc = await descriptorFromFile(file);
      if (!userDesc) {
        throw new Error(
          "No face detected in your photograph. Try a clearer, front-facing portrait."
        );
      }

      setStage({ kind: "running", step: "Analyzing the Wikipedia portrait" });
      const proxiedPortraitUrl = `/api/identify/portrait-proxy?src=${encodeURIComponent(
        portrait.portraitUrl
      )}`;
      const refDesc = await descriptorFromUrl(proxiedPortraitUrl);
      if (!refDesc) {
        throw new Error(
          "No face detected in the Wikipedia portrait. This profile may not have a usable headshot."
        );
      }

      const d = distance(userDesc, refDesc);
      const verdict = verdictFor(d);
      const confidence = distanceToConfidence(d);

      setStage({
        kind: "done",
        verdict,
        confidence,
        distance: d,
        uploadedUrl: previewUrl ?? "",
        portrait: { ...portrait, portraitUrl: proxiedPortraitUrl },
      });
    } catch (e) {
      setStage({
        kind: "error",
        message: e instanceof Error ? e.message : "Verification failed",
      });
    }
  }, [file, firstName, lastName, previewUrl]);

  const reset = () => {
    setStage({ kind: "ready" });
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const canVerify =
    stage.kind === "ready" &&
    file !== null &&
    (firstName.trim() !== "" || lastName.trim() !== "");

  const openJourney = () => {
    if (stage.kind !== "done") return;
    const params = new URLSearchParams({
      firstName: stage.portrait.firstName,
      surname: stage.portrait.lastName,
    });
    router.push(`/journey?${params.toString()}`);
  };

  return (
    <Layout title="Identify · Face verification">
      <div className="mx-auto max-w-5xl px-6 pb-20 pt-16">
        <SectionHeader
          eyebrow="Verification"
          title="Identify a portrait"
          description="Enter a name and upload a photograph. The system retrieves the Wikipedia portrait associated with that name and verifies whether the two images depict the same person — entirely in your browser. No image leaves your device."
        />

        <div className="mt-10">
          <DisclaimerBanner variant="info">
            Face-recognition is computed locally using face-api.js. Models
            (~13 MB) load on first visit and are cached. Photographs you upload
            are never transmitted to a server. The Wikipedia portrait is
            fetched server-side by name only.
          </DisclaimerBanner>
        </div>

        <AnimatePresence mode="wait">
          {stage.kind !== "done" ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-12 grid gap-12 lg:grid-cols-2"
            >
              {/* Name fields */}
              <div>
                <p className="folio">Step 1 · Name</p>
                <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-2">
                  <label className="block">
                    <span className="eyebrow">Given name</span>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Marie"
                      className="field-rule mt-3"
                      disabled={stage.kind === "running"}
                    />
                  </label>
                  <label className="block">
                    <span className="eyebrow">Surname</span>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Curie"
                      className="field-rule mt-3"
                      disabled={stage.kind === "running"}
                    />
                  </label>
                </div>
                <p className="mt-4 text-xs italic text-museum-faint">
                  This name is used to retrieve a single Wikipedia portrait
                  from our server. Both fields recommended for best match.
                </p>
              </div>

              {/* Photo upload */}
              <div>
                <p className="folio">Step 2 · Photograph</p>
                <label
                  ref={dropRef}
                  htmlFor="face-upload"
                  className="mt-6 flex aspect-[4/5] cursor-pointer flex-col items-center justify-center border border-dashed border-museum-border/40 bg-museum-surface/[0.02] text-center transition hover:border-gold/60 hover:bg-museum-surface/[0.04]"
                >
                  {previewUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewUrl}
                        alt="Uploaded preview"
                        className="h-full w-full object-cover"
                      />
                    </>
                  ) : (
                    <>
                      <span className="font-display text-2xl text-museum-text">
                        Upload portrait
                      </span>
                      <span className="mt-2 text-xs uppercase tracking-[0.22em] text-museum-faint">
                        JPG / PNG · click or drop
                      </span>
                    </>
                  )}
                </label>
                <input
                  id="face-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                  disabled={stage.kind === "running"}
                />
              </div>

              <div className="lg:col-span-2">
                <hr className="rule-ink" />
                <div className="mt-6 flex flex-col-reverse items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-museum-faint">
                    {stage.kind === "preloading" &&
                      "Loading face-recognition models — about 13 MB, one time."}
                    {stage.kind === "ready" &&
                      "Models ready. Provide a name and photograph to verify."}
                    {stage.kind === "running" && stage.step + "…"}
                    {stage.kind === "error" && (
                      <span className="text-brick">{stage.message}</span>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={!canVerify}
                    className="btn-primary"
                  >
                    {stage.kind === "running" ? "Verifying…" : "Verify identity"}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.section
              key="result"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-14"
            >
              <p className="eyebrow-gold">{VERDICT_COPY[stage.verdict].label}</p>
              <h3
                className={`mt-3 font-display text-4xl font-medium leading-tight md:text-5xl ${VERDICT_COPY[stage.verdict].tone}`}
              >
                {stage.confidence}% similarity
              </h3>
              <p className="mt-4 max-w-3xl font-serif text-base leading-relaxed text-museum-muted md:text-lg">
                {VERDICT_COPY[stage.verdict].body}
              </p>

              <div className="mt-10 grid gap-px bg-museum-border/15 md:grid-cols-2">
                <figure className="bg-museum-bg p-6">
                  <p className="folio">Uploaded photograph</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={stage.uploadedUrl}
                    alt="Your uploaded portrait"
                    className="mt-4 aspect-[4/5] w-full object-cover"
                  />
                  <figcaption className="mt-4 text-xs italic text-museum-faint">
                    Analyzed locally · never transmitted
                  </figcaption>
                </figure>
                <figure className="bg-museum-bg p-6">
                  <p className="folio">Wikipedia portrait</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={stage.portrait.portraitUrl}
                    alt={`Wikipedia portrait of ${stage.portrait.title}`}
                    className="mt-4 aspect-[4/5] w-full object-cover"
                  />
                  <figcaption className="mt-4 text-xs italic text-museum-muted">
                    {stage.portrait.title}
                    {stage.portrait.caption ? ` — ${stage.portrait.caption}` : ""}
                  </figcaption>
                </figure>
              </div>

              <dl className="mt-10 grid gap-x-12 gap-y-6 border-t border-museum-border/15 pt-8 sm:grid-cols-3">
                <div>
                  <dt className="eyebrow">Euclidean distance</dt>
                  <dd className="mt-2 font-mono text-base text-museum-text">
                    {stage.distance.toFixed(3)}
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow">Recognition threshold</dt>
                  <dd className="mt-2 font-mono text-base text-museum-text">
                    ≤ 0.50 strong · ≤ 0.62 possible
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow">Method</dt>
                  <dd className="mt-2 font-mono text-base text-museum-text">
                    128-d ResNet · face-api.js
                  </dd>
                </div>
              </dl>

              <div className="mt-12 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" onClick={reset} className="btn-secondary">
                  Try another
                </button>
                <button
                  type="button"
                  onClick={openJourney}
                  className="btn-primary"
                >
                  Open {stage.portrait.firstName}&rsquo;s journey
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
