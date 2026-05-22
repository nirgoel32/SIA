import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import Timeline from "@/components/Timeline";
import MigrationMap from "@/components/MigrationMap";
import FamilyTree from "@/components/FamilyTree";
import DemographicChart from "@/components/DemographicChart";
import CounterfactualSim from "@/components/CounterfactualSim";
import Act1965Impact from "@/components/Act1965Impact";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import PersonMatchPicker from "@/components/PersonMatchPicker";
import SectionHeader from "@/components/SectionHeader";
import SourceChip from "@/components/SourceChip";
import { buildMigrations, buildTimeline } from "@/lib/journeyBuilder";
import { resolveCountry } from "@/lib/surnameOrigin";
import { resolvePlace, type LatLng } from "@/lib/mapGeo";
import { loadUserTree } from "@/lib/userTree";
import type {
  DemographicPoint,
  GenealogySource,
  JourneyInput,
  MigrationEvent,
  Person,
  TimelineEvent,
} from "@/types";

function formatPersonName(person: Person | null, input: JourneyInput | null): string {
  if (person) {
    const full = `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim();
    if (full) return full;
  }
  if (input?.firstName) return `${input.firstName} ${input.surname}`.trim();
  return `The ${input?.surname ?? "Family"} family`;
}

function rootsLabel(
  country: string,
  inferred: boolean,
  hasFocusBirthplace: boolean
): { text: string; aside?: string } | null {
  if (!country) return null;
  if (country === "United States" && inferred && !hasFocusBirthplace) {
    return {
      text: "Origin unknown",
      aside: "Add a surname dictionary or pick a profile to refine",
    };
  }
  return {
    text: `Roots in ${country}`,
    aside: inferred && !hasFocusBirthplace ? "inferred from surname" : undefined,
  };
}

export default function JourneyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState<JourneyInput | null>(null);
  const [resolvedCountry, setResolvedCountry] = useState<string>("");
  const [originInferred, setOriginInferred] = useState(false);
  const [ancestors, setAncestors] = useState<Person[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [genealogyMatches, setGenealogyMatches] = useState<Person[]>([]);
  const [genealogyTotal, setGenealogyTotal] = useState(0);
  const [genealogySource, setGenealogySource] = useState<GenealogySource | "">("");
  const [needsSelection, setNeedsSelection] = useState(false);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [migrations, setMigrations] = useState<MigrationEvent[]>([]);
  const [ancestryData, setAncestryData] = useState<DemographicPoint[]>([]);
  const [foreignBorn, setForeignBorn] = useState<DemographicPoint[]>([]);
  const [counterfactual, setCounterfactual] = useState<{
    actual: DemographicPoint[];
    projected: DemographicPoint[];
  } | null>(null);
  const [sourceNote, setSourceNote] = useState("");
  const [narrative, setNarrative] = useState<string>("");
  // Curated coords are authoritative — they ship with the verified profile.
  const [curatedCoords, setCuratedCoords] = useState<Record<string, LatLng>>({});
  // Geocoded coords are best-effort enrichment from Nominatim/LLM.
  const [geocodedCoords, setGeocodedCoords] = useState<Record<string, LatLng>>({});
  // Merged with curated winning over geocoded.
  const extraCoords = useMemo(
    () => ({ ...geocodedCoords, ...curatedCoords }),
    [geocodedCoords, curatedCoords]
  );
  const showCounterfactual = router.query.mode === "counterfactual";

  const applyJourneyData = useCallback(
    async (
      journeyInput: JourneyInput,
      people: Person[],
      focus: Person | null,
      curated?: {
        country: string;
        migrations: MigrationEvent[];
        timeline: TimelineEvent[];
        placeCoords: Record<string, LatLng>;
      } | null
    ) => {
      let country: string;
      if (curated) {
        // Curated profile? Skip inference and use the hand-verified payload.
        country = curated.country;
        setResolvedCountry(curated.country);
        setOriginInferred(false);
        setInput(journeyInput);
        setMigrations(curated.migrations);
        setAncestors(people);
        setTimeline(curated.timeline);
        setCuratedCoords(curated.placeCoords);
        setNarrative(
          (curated as { narrative?: string }).narrative ?? ""
        );
      } else {
        setCuratedCoords({});
        setNarrative("");
        // Always re-resolve country from the focus person's birthplace when
        // one is available — a real recorded birthplace beats any cached
        // surname guess. Only the user's explicit country selection wins.
        const resolved = resolveCountry(
          journeyInput.surname,
          focus?.birthPlace ? undefined : journeyInput.country,
          { birthPlace: focus?.birthPlace }
        );
        country = resolved.country;
        setResolvedCountry(country);
        setOriginInferred(resolved.inferred);
        setInput(journeyInput);

        const enrichedInput = { ...journeyInput, country };
        const migrationsBuilt = buildMigrations(enrichedInput, focus, people);
        setMigrations(migrationsBuilt);
        setAncestors(people);
        setTimeline(buildTimeline(enrichedInput, migrationsBuilt, people, focus));
      }

      const censusParams = new URLSearchParams({ country });
      const [ancestryRes, foreignRes, cfRes] = await Promise.all([
        fetch(`/api/census/demographics?${censusParams.toString()}`),
        fetch("/api/census/demographics?type=foreignBorn"),
        fetch(
          `/api/census/demographics?type=counterfactual&${censusParams.toString()}`
        ),
      ]);

      const ancestryJson = await ancestryRes.json();
      const foreignJson = await foreignRes.json();
      const cfJson = await cfRes.json();

      setAncestryData(ancestryJson.data ?? []);
      setForeignBorn(foreignJson.data ?? []);
      setCounterfactual({
        actual: cfJson.actual ?? [],
        projected: cfJson.projected ?? [],
      });
    },
    []
  );

  const loadAncestors = useCallback(
    async (person: Person, journeyInput: JourneyInput) => {
      setLoading(true);
      setSelectedPerson(person);
      const params = new URLSearchParams({
        personId: person.id,
        surname: person.lastName || journeyInput.surname,
        ...(person.firstName ? { firstName: person.firstName } : {}),
        ...(person.familySearchId
          ? { familySearchId: person.familySearchId, source: "familysearch" }
          : {}),
        ...(person.wikiTreeId
          ? { wikiTreeId: person.wikiTreeId, source: person.source ?? "wikitree" }
          : {}),
        ...(person.wikidataId
          ? { wikidataId: person.wikidataId, source: person.source ?? "wikidata" }
          : {}),
      });
      const ancRes = await fetch(`/api/genealogy/ancestry?${params.toString()}`);
      const ancData = await ancRes.json();
      const fetched: Person[] = ancData.ancestors ?? [];
      const focusInTree = fetched.find((p) => p.id === person.id);
      const people: Person[] =
        fetched.length > 0
          ? focusInTree
            ? fetched
            : [{ ...person, id: "self" }, ...fetched]
          : [{ ...person, id: "self" }];
      const focus = focusInTree ?? { ...person, id: "self" };
      setSourceNote(ancData.disclaimer ?? "");
      setGenealogySource(ancData.source ?? person.source ?? "");
      setNeedsSelection(false);
      await applyJourneyData(journeyInput, people, focus, ancData.curated ?? null);
      setLoading(false);
    },
    [applyJourneyData]
  );

  const handleSelectMatch = useCallback(
    (person: Person) => {
      if (!input) return;
      loadAncestors(person, input);
    },
    [input, loadAncestors]
  );

  useEffect(() => {
    if (!router.isReady) return;

    const surname = (router.query.surname as string) || "Family";
    const country = router.query.country as string | undefined;
    const decade = router.query.decade as string | undefined;
    const firstName = router.query.firstName as string | undefined;

    const journeyInput: JourneyInput = {
      surname,
      country,
      decade,
      firstName,
    };
    setInput(journeyInput);
    setSelectedPerson(null);
    setCuratedCoords({});
    setGeocodedCoords({});

    async function load() {
      setLoading(true);
      setNeedsSelection(false);
      setGenealogyMatches([]);

      // User-uploaded tree short-circuit. When ?source=user, we read the tree
      // from localStorage and skip the genealogy API entirely — keeping the
      // family data local to the device.
      if (router.query.source === "user") {
        const personId = router.query.personId as string | undefined;
        const tree = loadUserTree();
        if (tree && tree.people.length > 0) {
          const focus =
            (personId && tree.people.find((p) => p.id === personId)) ||
            tree.people[0];
          setSourceNote(
            `Family records loaded from your uploaded tree (${tree.sourceLabel}). All data stays on your device.`
          );
          setGenealogySource("user");
          await applyJourneyData(journeyInput, tree.people, focus, null);
          setLoading(false);
          return;
        }
        // Fall through to normal flow if no tree was found.
      }

      try {
        const searchParams = new URLSearchParams({ lastName: surname });
        if (firstName) searchParams.set("firstName", firstName);
        if (country) searchParams.set("country", country);

        const searchRes = await fetch(
          `/api/genealogy/search?${searchParams.toString()}`
        );
        const searchData = await searchRes.json();
        const people: Person[] = searchData.people ?? [];
        setSourceNote(searchData.disclaimer ?? "");
        setGenealogySource(searchData.source ?? "");

        if (searchData.needsSelection && people.length > 1) {
          setGenealogyMatches(people);
          setGenealogyTotal(searchData.total ?? people.length);
          setNeedsSelection(true);
          setAncestors([]);
          const { country: resolved } = resolveCountry(surname, country);
          const enrichedInput = { ...journeyInput, country: resolved };
          setInput(enrichedInput);
          setResolvedCountry(resolved);
          setMigrations(buildMigrations(enrichedInput));
          setLoading(false);
          return;
        }

        if (
          (searchData.source === "familysearch" && people[0]?.familySearchId) ||
          (searchData.source === "wikitree" && people[0]?.wikiTreeId) ||
          (searchData.source === "wikidata" && people[0]?.wikidataId) ||
          (searchData.source === "wikipedia" && people[0]?.wikidataId)
        ) {
          await loadAncestors(people[0], journeyInput);
          return;
        }

        const focus = people[0] ?? null;
        if (focus) setSelectedPerson(focus);
        await applyJourneyData(journeyInput, people, focus, searchData.curated ?? null);
      } catch {
        const { country: resolved } = resolveCountry(surname, country);
        const enrichedInput = { ...journeyInput, country: resolved };
        await applyJourneyData(enrichedInput, [], null, null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router.isReady, router.query, applyJourneyData, loadAncestors]);

  const displayName = useMemo(
    () => formatPersonName(selectedPerson, input),
    [selectedPerson, input]
  );

  // Background-geocode any place names the local dictionary couldn't resolve.
  // Free OpenRouter models handle the long tail (small villages, regional
  // spellings) without blocking the initial render.
  useEffect(() => {
    if (migrations.length === 0) return;

    const allPlaces = new Set<string>();
    migrations.forEach((m) => {
      if (m.from) allPlaces.add(m.from);
      if (m.to) allPlaces.add(m.to);
    });

    // Curated coords always win, and the local dict resolves the obvious
    // cases offline — only geocode what neither covers.
    const unresolved = Array.from(allPlaces).filter(
      (p) => !resolvePlace(p) && !curatedCoords[p] && !geocodedCoords[p]
    );
    if (unresolved.length === 0) return;

    let cancelled = false;

    unresolved.slice(0, 20).forEach((place) => {
      const url = `/api/geocode?place=${encodeURIComponent(place)}`;
      fetch(url)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { coord?: LatLng | null } | null) => {
          if (cancelled || !data?.coord) return;
          setGeocodedCoords((prev) =>
            prev[place] ? prev : { ...prev, [place]: data.coord! }
          );
        })
        .catch(() => {
          // Best-effort; silent on failure.
        });
    });

    return () => {
      cancelled = true;
    };
  }, [migrations, curatedCoords, geocodedCoords]);

  if (!router.isReady) {
    return (
      <Layout title="Your Journey">
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="eyebrow">Loading</p>
        </div>
      </Layout>
    );
  }

  if (loading && !needsSelection) {
    return (
      <Layout title="Your Journey">
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
          <div
            className="h-10 w-10 animate-spin rounded-none border-2 border-gold/70 border-t-transparent"
            aria-hidden
          />
          <p className="eyebrow-gold">Tracing migration paths</p>
        </div>
      </Layout>
    );
  }

  const lifespan = selectedPerson
    ? [selectedPerson.birthDate, selectedPerson.deathDate]
        .filter(Boolean)
        .join(" – ")
    : "";

  return (
    <Layout title={`${displayName} · Journey`}>
      <div className="mx-auto max-w-7xl space-y-24 px-6 pb-24 pt-14">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="pb-12"
        >
          <div className="flex items-baseline gap-4">
            <span className="folio">Profile · Immigration Journey</span>
            <span aria-hidden className="h-px flex-1 bg-museum-border/20" />
            {genealogySource && (
              <SourceChip
                source={genealogySource as GenealogySource}
                profileUrl={selectedPerson?.profileUrl}
              />
            )}
          </div>

          <h1 className="mt-8 font-display text-5xl font-medium leading-[1.02] tracking-tight text-museum-text md:text-7xl">
            {displayName}
          </h1>

          <dl className="mt-10 grid grid-cols-1 gap-x-12 gap-y-6 border-t border-museum-border/15 pt-8 sm:grid-cols-2 lg:grid-cols-4">
            {(() => {
              const roots = rootsLabel(
                resolvedCountry,
                originInferred,
                Boolean(selectedPerson?.birthPlace)
              );
              if (!roots) return null;
              return (
                <div>
                  <dt className="eyebrow">Origin</dt>
                  <dd className="mt-2 font-serif text-base text-museum-text">
                    {roots.text}
                    {roots.aside && (
                      <span className="block text-xs italic text-museum-faint">
                        {roots.aside}
                      </span>
                    )}
                  </dd>
                </div>
              );
            })()}
            {lifespan && (
              <div>
                <dt className="eyebrow">Lifespan</dt>
                <dd className="mt-2 font-mono text-base text-museum-text">
                  {lifespan}
                </dd>
              </div>
            )}
            {selectedPerson?.birthPlace && (
              <div>
                <dt className="eyebrow">Birthplace</dt>
                <dd className="mt-2 font-serif text-base text-museum-text">
                  {selectedPerson.birthPlace}
                </dd>
              </div>
            )}
            {input?.decade && (
              <div>
                <dt className="eyebrow">Arrival era</dt>
                <dd className="mt-2 font-serif text-base text-museum-text">
                  {input.decade}
                </dd>
              </div>
            )}
          </dl>

          {narrative && (
            <p className="mt-10 max-w-4xl font-serif text-lg leading-relaxed text-museum-muted drop-cap md:text-xl">
              {narrative}
            </p>
          )}
          {sourceNote && (
            <div className="mt-8 max-w-3xl">
              <DisclaimerBanner variant="record">{sourceNote}</DisclaimerBanner>
            </div>
          )}
        </motion.header>

        {needsSelection && genealogyMatches.length > 0 && input && (
          <PersonMatchPicker
            matches={genealogyMatches}
            total={genealogyTotal}
            source={genealogySource}
            onSelect={handleSelectMatch}
            expectedFirstName={input.firstName}
            expectedLastName={input.surname}
          />
        )}

        <section className="space-y-6">
          {(() => {
            const routes = migrations.filter(
              (m) => m.kind !== "pin" && m.from !== m.to
            );
            const pins = migrations.length - routes.length;
            const description =
              migrations.length === 0
                ? "No geographic data recorded for this person."
                : routes.length === 0
                  ? `Showing ${pins} life and ancestor location${
                      pins === 1 ? "" : "s"
                    } — this person didn't migrate to the US within their lifespan.`
                  : pins > 0
                    ? `${routes.length} route${
                        routes.length === 1 ? "" : "s"
                      } and ${pins} place${
                        pins === 1 ? "" : "s"
                      } of life across this family's geography.`
                    : selectedPerson?.birthPlace
                      ? `Routes anchored to ${selectedPerson.birthPlace}.`
                      : originInferred
                        ? "Route modeled from surname-origin patterns and post-1965 migration history."
                        : "Routes combine historical records and your selected origin country.";
            return (
              <SectionHeader
                eyebrow="01 · Places"
                title="Life & migration map"
                description={description}
              />
            );
          })()}
          <MigrationMap migrations={migrations} extraCoords={extraCoords} />
        </section>

        {!needsSelection && (
          <>
            <section className="space-y-6">
              <SectionHeader
                eyebrow="02 · Chronology"
                title="Immigration timeline"
                description="Family events, immigration laws, and demographic milestones placed on a single timeline."
              />
              <Timeline events={timeline} />
            </section>

            <section className="space-y-6">
              <SectionHeader
                eyebrow="03 · Lineage"
                title="Family tree"
                description="Public-record connections where available. Modeled links are marked and never claimed as verified fact."
              />
              <FamilyTree people={ancestors} focusId={selectedPerson?.id} />
            </section>

            <section className="space-y-6">
              <SectionHeader
                eyebrow="04 · Context"
                title="Demographic change"
                description="How communities like this one have grown in the United States."
              />
              <div className="grid gap-6 lg:grid-cols-2">
                <DemographicChart
                  data={ancestryData}
                  title={`${resolvedCountry || "Selected"}-American population`}
                />
                <DemographicChart
                  data={foreignBorn}
                  title="U.S. foreign-born population"
                  color="#a78bfa"
                />
              </div>
            </section>

            <section className="space-y-10">
              <SectionHeader
                eyebrow="05 · Reading"
                title="The 1965 Act, in this person's life"
                description="A personalized reading of how — or whether — the Hart-Celler Act of 1965 shaped this specific person's migration story and the broader community their family belongs to."
              />
              <Act1965Impact
                person={selectedPerson}
                country={resolvedCountry}
                arrivalDecade={input?.decade}
              />
            </section>

            {(showCounterfactual || counterfactual) && counterfactual && (
              <section className="space-y-6">
                <SectionHeader
                  eyebrow="06 · Simulation"
                  title="Counterfactual: without the 1965 Act"
                  description="An educational model — not a forecast."
                />
                <CounterfactualSim
                  actual={counterfactual.actual}
                  projected={counterfactual.projected}
                  country={resolvedCountry}
                />
              </section>
            )}
          </>
        )}

      </div>
    </Layout>
  );
}
