import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { ManifestEntry } from "@/services/ellisManifest";

type Props = {
  lastName: string;
  firstName?: string;
  country: string;
  decade?: string;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function PassengerManifest({
  lastName,
  firstName,
  country,
  decade,
}: Props) {
  const [entry, setEntry] = useState<ManifestEntry | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!lastName || !country) return;
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ lastName, country });
    if (firstName) params.set("firstName", firstName);
    if (decade) params.set("decade", decade);
    fetch(`/api/ellis/manifest?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data && "ship" in data) setEntry(data as ManifestEntry);
        else setEntry(null);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setEntry(null);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [lastName, firstName, country, decade]);

  if (loading) {
    return (
      <p className="font-serif italic text-museum-faint">
        Composing a period-accurate possible record…
      </p>
    );
  }

  if (!entry) return null;

  const fullName = `${entry.firstName !== "—" ? entry.firstName + " " : ""}${entry.lastName}`;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative border border-museum-border/20 bg-museum-surface/[0.025] shadow-[var(--shadow-card)]"
    >
      {/* "Document" header — styled like a stamped immigration form */}
      <div className="border-b border-museum-border/20 bg-museum-surface/[0.04] px-6 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="folio">Form I-418 · Manifest of Alien Passengers</p>
          <p className="text-[10px] uppercase tracking-[0.22em] text-museum-faint">
            Port of New York · Ellis Island
          </p>
        </div>
        <p className="mt-1 font-display text-2xl text-museum-text">
          {entry.ship.name}
        </p>
        <p className="mt-1 font-serif text-sm italic text-museum-muted">
          {entry.ship.line} · departing {entry.ship.departurePort}
        </p>
      </div>

      {/* The seven manifest columns */}
      <dl className="grid grid-cols-2 gap-x-8 gap-y-5 p-6 md:grid-cols-4">
        <div className="col-span-2">
          <dt className="eyebrow">Name of passenger</dt>
          <dd className="mt-2 font-display text-xl text-museum-text">
            {fullName}
          </dd>
        </div>
        <div>
          <dt className="eyebrow">Age</dt>
          <dd className="mt-2 font-mono text-base text-museum-text">
            {entry.age}
          </dd>
        </div>
        <div>
          <dt className="eyebrow">Sex</dt>
          <dd className="mt-2 font-mono text-base text-museum-text">
            {entry.sex}
          </dd>
        </div>
        <div>
          <dt className="eyebrow">Marital status</dt>
          <dd className="mt-2 font-serif text-base text-museum-text">
            {entry.maritalStatus}
          </dd>
        </div>
        <div>
          <dt className="eyebrow">Calling / Occupation</dt>
          <dd className="mt-2 font-serif text-base text-museum-text">
            {entry.occupation}
          </dd>
        </div>
        <div>
          <dt className="eyebrow">Date of arrival</dt>
          <dd className="mt-2 font-mono text-base text-museum-text">
            {formatDate(entry.arrivalDate)}
          </dd>
        </div>
        <div>
          <dt className="eyebrow">Port of departure</dt>
          <dd className="mt-2 font-serif text-base text-museum-text">
            {entry.ship.departurePort}
          </dd>
        </div>
      </dl>

      {/* Provenance / honesty banner */}
      <div className="border-t border-museum-border/20 bg-museum-bg-soft/30 px-6 py-5">
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="eyebrow-gold">Period-accurate reconstruction</p>
            <p className="mt-2 font-serif text-sm leading-relaxed text-museum-muted">
              This record is{" "}
              <span className="text-museum-text">not your ancestor&rsquo;s
              actual manifest</span>{" "}
              — it&rsquo;s a plausible composite, built from a real ship that
              sailed this route in this era and from era-typical demographic
              patterns. It shows what a real Ellis Island record from this
              moment would look like.
            </p>
            <p className="mt-2 font-serif text-sm leading-relaxed text-museum-muted">
              The actual digitized manifests are held by the Statue of Liberty
              - Ellis Island Foundation. Use the link to search the real
              archive for your family.
            </p>
          </div>
          <a
            href={entry.archiveSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary whitespace-nowrap"
          >
            Search the real archive →
          </a>
        </div>
      </div>
    </motion.article>
  );
}
