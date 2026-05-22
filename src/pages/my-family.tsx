import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "@/components/Layout";
import SectionHeader from "@/components/SectionHeader";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import { parseGedcom } from "@/lib/gedcom";
import { saveUserTree, loadUserTree, clearUserTree } from "@/lib/userTree";
import type { Person } from "@/types";

type Mode = "upload" | "manual";

type ParsedState =
  | { kind: "empty" }
  | { kind: "parsing" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      people: Person[];
      warnings: string[];
      suggestedFocusId?: string;
      sourceLabel: string;
      fileName?: string;
    };

function lifespan(p: Person): string {
  const b = p.birthDate?.match(/(\d{4})/)?.[1];
  const d = p.deathDate?.match(/(\d{4})/)?.[1];
  if (b && d) return `${b}–${d}`;
  if (b) return `b. ${b}`;
  if (d) return `d. ${d}`;
  return "Dates unknown";
}

export default function MyFamilyPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("upload");
  const [state, setState] = useState<ParsedState>({ kind: "empty" });
  const [query, setQuery] = useState("");

  // Restore an existing tree on mount so refreshes don't lose work.
  useEffect(() => {
    const existing = loadUserTree();
    if (existing) {
      setState({
        kind: "ready",
        people: existing.people,
        warnings: [],
        sourceLabel: existing.sourceLabel,
        fileName: existing.fileName,
      });
    }
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setState({ kind: "parsing" });
    try {
      const text = await file.text();
      const result = parseGedcom(text);
      if (result.people.length === 0) {
        setState({
          kind: "error",
          message:
            result.warnings[0] ??
            "No individuals found in this file. Is it a valid GEDCOM (.ged)?",
        });
        return;
      }
      const sourceLabel = `GEDCOM · ${file.name}`;
      saveUserTree(result.people, sourceLabel, file.name);
      setState({
        kind: "ready",
        people: result.people,
        warnings: result.warnings,
        suggestedFocusId: result.suggestedFocusId,
        sourceLabel,
        fileName: file.name,
      });
    } catch (e) {
      setState({
        kind: "error",
        message:
          e instanceof Error
            ? e.message
            : "Could not read the file. Try a fresh GEDCOM export.",
      });
    }
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const openJourneyFor = useCallback(
    (p: Person) => {
      const params = new URLSearchParams({
        source: "user",
        personId: p.id,
        firstName: p.firstName,
        surname: p.lastName || "Family",
      });
      router.push(`/journey?${params.toString()}`);
    },
    [router]
  );

  const reset = () => {
    clearUserTree();
    setState({ kind: "empty" });
    setQuery("");
  };

  const filtered = useMemo(() => {
    if (state.kind !== "ready") return [];
    const q = query.trim().toLowerCase();
    if (!q) return state.people;
    return state.people.filter((p) => {
      const name = `${p.firstName} ${p.lastName}`.toLowerCase();
      const place = (p.birthPlace ?? p.deathPlace ?? "").toLowerCase();
      return name.includes(q) || place.includes(q);
    });
  }, [state, query]);

  const suggestedPerson = useMemo(() => {
    if (state.kind !== "ready" || !state.suggestedFocusId) return null;
    return state.people.find((p) => p.id === state.suggestedFocusId) ?? null;
  }, [state]);

  return (
    <Layout title="Your family · Add ancestry">
      <div className="mx-auto max-w-6xl px-6 pb-20 pt-16">
        <SectionHeader
          eyebrow="Your family"
          title="Add your own ancestry"
          description="Upload a GEDCOM export from FamilySearch, Ancestry, MyHeritage, or any desktop genealogy tool — or enter three generations manually. Your tree stays on your device and is never transmitted to a server."
        />

        <div className="mt-10">
          <DisclaimerBanner variant="info">
            All processing happens locally in your browser. Nothing about your
            family is uploaded, logged, or persisted server-side. To remove
            your data, use the &ldquo;Clear tree&rdquo; control at any time.
          </DisclaimerBanner>
        </div>

        {/* Mode tabs */}
        <div className="mt-12 flex items-baseline gap-6 border-b border-museum-border/15">
          {(
            [
              { id: "upload", label: "Upload GEDCOM" },
              { id: "manual", label: "Enter manually" },
            ] as { id: Mode; label: string }[]
          ).map((t) => {
            const active = mode === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setMode(t.id)}
                className={`-mb-px border-b-2 pb-3 text-sm transition ${
                  active
                    ? "border-gold text-museum-text"
                    : "border-transparent text-museum-muted hover:text-museum-text"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {mode === "upload" ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-10"
            >
              {state.kind !== "ready" && (
                <div className="grid gap-10 lg:grid-cols-[1fr_18rem]">
                  <label
                    htmlFor="gedcom-upload"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className="flex min-h-[18rem] cursor-pointer flex-col items-center justify-center border border-dashed border-museum-border/40 bg-museum-surface/[0.02] p-10 text-center transition hover:border-gold/60 hover:bg-museum-surface/[0.04]"
                  >
                    {state.kind === "parsing" ? (
                      <p className="eyebrow-gold">Parsing GEDCOM…</p>
                    ) : (
                      <>
                        <p className="font-display text-3xl text-museum-text">
                          Drop a .ged file here
                        </p>
                        <p className="mt-3 text-sm text-museum-muted">
                          Or click to choose
                        </p>
                        <p className="mt-6 text-[10px] uppercase tracking-[0.22em] text-museum-faint">
                          FamilySearch · Ancestry · MyHeritage · RootsMagic
                        </p>
                      </>
                    )}
                  </label>
                  <input
                    id="gedcom-upload"
                    type="file"
                    accept=".ged,.gedcom,text/plain"
                    className="sr-only"
                    onChange={onInputChange}
                  />

                  <aside>
                    <p className="folio">How to export</p>
                    <ul className="mt-4 space-y-3 font-serif text-sm leading-relaxed text-museum-muted">
                      <li>
                        <span className="font-medium text-museum-text">
                          FamilySearch:
                        </span>{" "}
                        Tree → Export → GEDCOM
                      </li>
                      <li>
                        <span className="font-medium text-museum-text">
                          Ancestry:
                        </span>{" "}
                        Tree Settings → Export Tree
                      </li>
                      <li>
                        <span className="font-medium text-museum-text">
                          MyHeritage:
                        </span>{" "}
                        Family Tree Manager → Export
                      </li>
                    </ul>
                    {state.kind === "error" && (
                      <p className="mt-6 text-sm text-brick">{state.message}</p>
                    )}
                  </aside>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="manual"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-10"
            >
              <ManualEntry
                onSave={(people) => {
                  saveUserTree(people, "Manual entry");
                  setState({
                    kind: "ready",
                    people,
                    warnings: [],
                    suggestedFocusId: people[0]?.id,
                    sourceLabel: "Manual entry",
                  });
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Person picker — shown after a tree has been loaded */}
        {state.kind === "ready" && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-16"
          >
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-museum-border/15 pb-4">
              <div>
                <p className="eyebrow-gold">Loaded tree</p>
                <h3 className="mt-2 font-display text-2xl text-museum-text md:text-3xl">
                  {state.people.length} individuals
                  <span className="ml-3 text-base text-museum-muted">
                    · {state.sourceLabel}
                  </span>
                </h3>
              </div>
              <button
                type="button"
                onClick={reset}
                className="text-xs uppercase tracking-[0.22em] text-museum-muted transition hover:text-brick"
              >
                Clear tree
              </button>
            </div>

            {suggestedPerson && (
              <div className="mt-8 border border-gold/40 bg-gold/[0.04] p-6">
                <p className="folio">Suggested anchor</p>
                <div className="mt-3 flex flex-wrap items-baseline justify-between gap-4">
                  <div>
                    <p className="font-display text-2xl text-museum-text">
                      {suggestedPerson.firstName} {suggestedPerson.lastName}
                    </p>
                    <p className="mt-1 text-sm italic text-museum-muted">
                      {lifespan(suggestedPerson)}
                      {suggestedPerson.birthPlace
                        ? ` · ${suggestedPerson.birthPlace}`
                        : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openJourneyFor(suggestedPerson)}
                    className="btn-primary"
                  >
                    Build {suggestedPerson.firstName}&rsquo;s journey
                  </button>
                </div>
              </div>
            )}

            <div className="mt-10 flex flex-wrap items-baseline justify-between gap-4">
              <p className="eyebrow">All individuals</p>
              <input
                type="search"
                placeholder="Filter by name or place…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="field-rule max-w-xs"
              />
            </div>

            <div className="mt-6 grid gap-px bg-museum-border/15 md:grid-cols-2 lg:grid-cols-3">
              {filtered.slice(0, 90).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => openJourneyFor(p)}
                  className="group bg-museum-bg p-5 text-left transition hover:bg-museum-surface/[0.04]"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-museum-faint">
                    {lifespan(p)}
                  </p>
                  <p className="mt-2 font-display text-lg leading-tight text-museum-text">
                    {p.firstName} {p.lastName}
                  </p>
                  {(p.birthPlace ?? p.deathPlace) && (
                    <p className="mt-1 text-xs italic text-museum-muted">
                      {p.birthPlace ?? p.deathPlace}
                    </p>
                  )}
                  <p className="mt-3 text-[10px] uppercase tracking-[0.22em] text-gold opacity-0 transition group-hover:opacity-100">
                    Open journey →
                  </p>
                </button>
              ))}
            </div>

            {filtered.length > 90 && (
              <p className="mt-6 text-center text-xs text-museum-faint">
                Showing first 90 of {filtered.length} matches. Filter to narrow down.
              </p>
            )}

            {state.warnings.length > 0 && (
              <div className="mt-10 max-w-2xl">
                <DisclaimerBanner variant="record">
                  Parsed with {state.warnings.length} warning
                  {state.warnings.length === 1 ? "" : "s"}. Common causes:
                  individuals without names, malformed dates, or unsupported
                  custom tags. The remaining records loaded successfully.
                </DisclaimerBanner>
              </div>
            )}
          </motion.section>
        )}
      </div>
    </Layout>
  );
}

/* -------------------------------------------------------------------------- */
/* Manual entry — three generations: self, two parents, four grandparents.     */
/* Keeps the form short enough to actually finish.                             */
/* -------------------------------------------------------------------------- */

type Slot = {
  key: string;
  label: string;
  role: string;
  /** Parent slot keys — used to wire up the Person.parents array. */
  parentKeys: string[];
};

const SLOTS: Slot[] = [
  { key: "self", label: "You", role: "Yourself", parentKeys: ["father", "mother"] },
  { key: "father", label: "Father", role: "Father", parentKeys: ["gpf", "gmf"] },
  { key: "mother", label: "Mother", role: "Mother", parentKeys: ["gpm", "gmm"] },
  { key: "gpf", label: "Paternal grandfather", role: "Grandfather", parentKeys: [] },
  { key: "gmf", label: "Paternal grandmother", role: "Grandmother", parentKeys: [] },
  { key: "gpm", label: "Maternal grandfather", role: "Grandfather", parentKeys: [] },
  { key: "gmm", label: "Maternal grandmother", role: "Grandmother", parentKeys: [] },
];

type SlotInput = {
  firstName: string;
  lastName: string;
  birthYear: string;
  birthPlace: string;
};

const EMPTY: SlotInput = {
  firstName: "",
  lastName: "",
  birthYear: "",
  birthPlace: "",
};

function ManualEntry({ onSave }: { onSave: (people: Person[]) => void }) {
  const [values, setValues] = useState<Record<string, SlotInput>>(() =>
    Object.fromEntries(SLOTS.map((s) => [s.key, { ...EMPTY }]))
  );

  const update = (key: string, field: keyof SlotInput, v: string) => {
    setValues((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: v },
    }));
  };

  const canSave =
    values.self.firstName.trim() !== "" || values.self.lastName.trim() !== "";

  const save = () => {
    const people: Person[] = [];
    for (const slot of SLOTS) {
      const v = values[slot.key];
      if (!v.firstName.trim() && !v.lastName.trim()) continue;
      people.push({
        id: slot.key,
        firstName: v.firstName.trim(),
        lastName: v.lastName.trim(),
        birthDate: v.birthYear.trim() || undefined,
        birthPlace: v.birthPlace.trim() || undefined,
        parents: slot.parentKeys.filter((k) => {
          const pv = values[k];
          return pv.firstName.trim() !== "" || pv.lastName.trim() !== "";
        }),
        source: "user",
      });
    }
    if (people.length === 0) return;
    onSave(people);
  };

  return (
    <div>
      <p className="font-serif text-base leading-relaxed text-museum-muted">
        Fill in at least your own name. Add any ancestors you know — leave the
        rest blank.
      </p>

      <div className="mt-10 space-y-12">
        {/* Group: You */}
        <SlotGroup
          title="Generation 0 — You"
          slots={SLOTS.filter((s) => s.key === "self")}
          values={values}
          update={update}
        />
        {/* Group: Parents */}
        <SlotGroup
          title="Generation 1 — Parents"
          slots={SLOTS.filter((s) => s.key === "father" || s.key === "mother")}
          values={values}
          update={update}
        />
        {/* Group: Grandparents */}
        <SlotGroup
          title="Generation 2 — Grandparents"
          slots={SLOTS.filter((s) =>
            ["gpf", "gmf", "gpm", "gmm"].includes(s.key)
          )}
          values={values}
          update={update}
        />
      </div>

      <hr className="rule-ink mt-12" />

      <div className="mt-6 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs italic text-museum-faint">
          Stored only on this device. Anchor will be set to you.
        </p>
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className="btn-primary"
        >
          Save tree
        </button>
      </div>
    </div>
  );
}

function SlotGroup({
  title,
  slots,
  values,
  update,
}: {
  title: string;
  slots: Slot[];
  values: Record<string, SlotInput>;
  update: (key: string, field: keyof SlotInput, v: string) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-4">
        <p className="folio">{title}</p>
        <span aria-hidden className="h-px flex-1 bg-museum-border/20" />
      </div>
      <div className="mt-6 grid gap-x-10 gap-y-8 md:grid-cols-2">
        {slots.map((slot) => {
          const v = values[slot.key];
          return (
            <div key={slot.key} className="space-y-3">
              <p className="text-sm font-medium text-museum-text">
                {slot.label}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="eyebrow">Given name</span>
                  <input
                    type="text"
                    value={v.firstName}
                    onChange={(e) =>
                      update(slot.key, "firstName", e.target.value)
                    }
                    className="field-rule mt-2"
                  />
                </label>
                <label className="block">
                  <span className="eyebrow">Surname</span>
                  <input
                    type="text"
                    value={v.lastName}
                    onChange={(e) =>
                      update(slot.key, "lastName", e.target.value)
                    }
                    className="field-rule mt-2"
                  />
                </label>
                <label className="block">
                  <span className="eyebrow">Birth year</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 1945"
                    value={v.birthYear}
                    onChange={(e) =>
                      update(slot.key, "birthYear", e.target.value)
                    }
                    className="field-rule mt-2"
                  />
                </label>
                <label className="block">
                  <span className="eyebrow">Birth place</span>
                  <input
                    type="text"
                    placeholder="City, country"
                    value={v.birthPlace}
                    onChange={(e) =>
                      update(slot.key, "birthPlace", e.target.value)
                    }
                    className="field-rule mt-2"
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
