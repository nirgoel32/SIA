import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Person } from "@/types";

type Props = {
  people: Person[];
  focusId?: string;
};

type Generation = -3 | -2 | -1 | 0 | 1 | 2;

type PlacedPerson = {
  person: Person;
  generation: Generation;
  /** Visual role relative to the focus person — used for accent color. */
  role: "focus" | "spouse" | "sibling" | "parent" | "ancestor" | "child" | "descendant" | "other";
  /** Whether the parent edge from this person should be drawn. */
  drawsParentEdge: boolean;
};

const GEN_LABELS: Record<Generation, string> = {
  [-3]: "Great-grandparents",
  [-2]: "Grandparents",
  [-1]: "Parents",
  0: "Generation",
  1: "Children",
  2: "Grandchildren",
};

function initialsOf(p: Person): string {
  const first = (p.firstName || "?").trim().charAt(0);
  const last = (p.lastName || "").trim().charAt(0);
  return (first + last).toUpperCase() || "?";
}

function lifespanOf(p: Person): string | null {
  const b = p.birthDate?.slice(0, 4);
  const d = p.deathDate?.slice(0, 4);
  if (!b && !d) return null;
  return `${b ?? "?"} – ${d ?? "•"}`;
}

function shortPlace(place?: string): string | null {
  if (!place) return null;
  const first = place.split(",")[0]?.trim();
  return first ?? place;
}

/** Walk the family graph from the focus, assigning a generation and role
 *  to each person we can reach. People we can't classify get generation 0
 *  with role 'other' so they still appear in the tree. */
function placePeople(people: Person[], focusId: string): PlacedPerson[] {
  const byId = new Map<string, Person>();
  people.forEach((p) => byId.set(p.id, p));

  // Index reverse edges (parent → children) so we can walk downward.
  const childrenOf = new Map<string, string[]>();
  people.forEach((p) => {
    p.parents?.forEach((parentId) => {
      const arr = childrenOf.get(parentId) ?? [];
      arr.push(p.id);
      childrenOf.set(parentId, arr);
    });
  });

  const generation = new Map<string, Generation>();
  const role = new Map<string, PlacedPerson["role"]>();
  generation.set(focusId, 0);
  role.set(focusId, "focus");

  // Walk up parents (BFS).
  const upQueue: string[] = [focusId];
  while (upQueue.length > 0) {
    const id = upQueue.shift()!;
    const gen = generation.get(id) ?? 0;
    const person = byId.get(id);
    if (!person) continue;
    person.parents?.forEach((parentId) => {
      if (!byId.has(parentId)) return;
      if (!generation.has(parentId)) {
        const next = Math.max(gen - 1, -3) as Generation;
        generation.set(parentId, next);
        role.set(parentId, next === -1 ? "parent" : "ancestor");
        upQueue.push(parentId);
      }
    });
  }

  // Walk down children (BFS).
  const downQueue: string[] = [focusId];
  while (downQueue.length > 0) {
    const id = downQueue.shift()!;
    const gen = generation.get(id) ?? 0;
    (childrenOf.get(id) ?? []).forEach((childId) => {
      if (!generation.has(childId)) {
        const next = Math.min(gen + 1, 2) as Generation;
        generation.set(childId, next);
        role.set(childId, next === 1 ? "child" : "descendant");
        downQueue.push(childId);
      }
    });
  }

  // Spouses: same generation as focus, parents include any of focus's
  // children's other parent — pick the first.
  const focus = byId.get(focusId);
  const focusChildren = childrenOf.get(focusId) ?? [];
  const spouseIds = new Set<string>();
  focusChildren.forEach((cid) => {
    const child = byId.get(cid);
    child?.parents?.forEach((pid) => {
      if (pid !== focusId && byId.has(pid)) spouseIds.add(pid);
    });
  });
  spouseIds.forEach((sid) => {
    if (!generation.has(sid)) {
      generation.set(sid, 0);
      role.set(sid, "spouse");
    }
  });

  // Siblings: same parents as focus.
  if (focus?.parents?.length) {
    people.forEach((p) => {
      if (p.id === focusId) return;
      if (generation.has(p.id)) return;
      const shares = p.parents?.some((pid) => focus.parents!.includes(pid));
      if (shares) {
        generation.set(p.id, 0);
        role.set(p.id, "sibling");
      }
    });
  }

  // Everything else → generation 0, role "other".
  people.forEach((p) => {
    if (!generation.has(p.id)) {
      generation.set(p.id, 0);
      role.set(p.id, "other");
    }
  });

  return people.map((p) => ({
    person: p,
    generation: generation.get(p.id) ?? 0,
    role: role.get(p.id) ?? "other",
    drawsParentEdge: !!p.parents?.some((pid) => byId.has(pid)),
  }));
}

function PersonCard({
  placed,
  active,
  onSelect,
}: {
  placed: PlacedPerson;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const { person, role } = placed;
  const life = lifespanOf(person);
  const place = shortPlace(person.birthPlace);

  const tone =
    role === "focus"
      ? "border-gold bg-gold/[0.06] shadow-[var(--shadow-card)]"
      : role === "spouse"
        ? "border-brick/50 bg-brick/[0.04]"
        : role === "sibling"
          ? "border-museum-border/20 bg-museum-surface/[0.04]"
          : role === "parent" || role === "ancestor"
            ? "border-gold/40 bg-gold/[0.03]"
            : role === "child" || role === "descendant"
              ? "border-museum-muted/30 bg-museum-surface/[0.03]"
              : "border-museum-border/15 bg-museum-surface/[0.02]";

  const avatarTone =
    role === "focus"
      ? "from-gold/50 to-gold-soft/30 text-gold ring-gold/50"
      : role === "spouse"
        ? "from-brick/40 to-brick/20 text-brick ring-brick/40"
        : role === "parent" || role === "ancestor"
          ? "from-gold/30 to-gold-soft/20 text-gold ring-gold/30"
          : role === "child" || role === "descendant"
            ? "from-museum-muted/30 to-museum-muted/20 text-museum-text ring-museum-muted/30"
            : "from-museum-muted/20 to-museum-muted/10 text-museum-text ring-museum-muted/30";

  return (
    <button
      type="button"
      onClick={() => onSelect(person.id)}
      className={`group relative w-44 shrink-0 border p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 ${tone}`}
      aria-pressed={active}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ring-1 ${avatarTone} text-sm font-medium`}
        >
          {initialsOf(person)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base leading-tight text-museum-text">
            {person.firstName}
          </p>
          {person.lastName && (
            <p className="text-xs text-museum-muted">{person.lastName}</p>
          )}
        </div>
      </div>
      <dl className="mt-2 space-y-0.5 text-[11px] text-museum-muted">
        {life && (
          <div className="font-mono">
            <span className="sr-only">Lifespan </span>
            {life}
          </div>
        )}
        {place && <div className="truncate">{place}</div>}
      </dl>
      <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-museum-muted/70">
        {role === "focus" ? "Focus" : role}
      </p>
    </button>
  );
}

export default function FamilyTree({ people, focusId }: Props) {
  const initialFocus = useMemo(() => {
    if (focusId && people.some((p) => p.id === focusId)) return focusId;
    if (people.some((p) => p.id === "self")) return "self";
    return people[0]?.id;
  }, [focusId, people]);

  const [activeFocus, setActiveFocus] = useState<string | undefined>(initialFocus);

  // Reset whenever the underlying people set changes.
  useMemo(() => setActiveFocus(initialFocus), [initialFocus]);

  const placed = useMemo(() => {
    if (!activeFocus) return [];
    return placePeople(people, activeFocus);
  }, [people, activeFocus]);

  const generations = useMemo(() => {
    const map = new Map<Generation, PlacedPerson[]>();
    placed.forEach((pp) => {
      const arr = map.get(pp.generation) ?? [];
      arr.push(pp);
      map.set(pp.generation, arr);
    });
    // Sort within each generation: focus first, then by birth year.
    map.forEach((arr) =>
      arr.sort((a, b) => {
        if (a.person.id === activeFocus) return -1;
        if (b.person.id === activeFocus) return 1;
        const rolePriority: Record<PlacedPerson["role"], number> = {
          focus: 0,
          spouse: 1,
          sibling: 2,
          parent: 3,
          ancestor: 4,
          child: 5,
          descendant: 6,
          other: 7,
        };
        if (rolePriority[a.role] !== rolePriority[b.role]) {
          return rolePriority[a.role] - rolePriority[b.role];
        }
        const ay = parseInt(a.person.birthDate?.slice(0, 4) ?? "9999", 10);
        const by = parseInt(b.person.birthDate?.slice(0, 4) ?? "9999", 10);
        return ay - by;
      })
    );
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [placed, activeFocus]);

  if (people.length === 0) {
    return (
      <div className="rounded-none border border-museum-border/10 bg-museum-surface/[0.02] p-10 text-center text-sm text-museum-muted">
        No family tree data available.
      </div>
    );
  }

  return (
    <div className="rounded-none border border-museum-border/10 bg-museum-surface/[0.02] p-6 md:p-8">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeFocus}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="space-y-10"
        >
          {generations.map(([gen, row], i) => (
            <div key={gen} className="relative">
              <div className="mb-3 flex items-baseline justify-between">
                <p className="text-[11px] uppercase tracking-[0.3em] text-museum-muted">
                  {gen === 0 && row[0]?.role === "focus"
                    ? `${row[0].person.firstName}'s generation`
                    : GEN_LABELS[gen]}
                </p>
                <p className="text-[11px] uppercase tracking-[0.2em] text-museum-muted/60">
                  {row.length} {row.length === 1 ? "person" : "people"}
                </p>
              </div>

              <div className="-mx-2 flex flex-wrap items-stretch gap-3 px-2">
                {row.map((pp) => (
                  <PersonCard
                    key={pp.person.id}
                    placed={pp}
                    active={pp.person.id === activeFocus}
                    onSelect={setActiveFocus}
                  />
                ))}
              </div>

              {i < generations.length - 1 && (
                <div
                  aria-hidden
                  className="pointer-events-none mt-6 flex justify-center"
                >
                  <span className="block h-6 w-px bg-gradient-to-b from-museum-surface/20 via-museum-surface/10 to-museum-surface/0" />
                </div>
              )}
            </div>
          ))}

          <p className="pt-2 text-center text-[11px] uppercase tracking-[0.25em] text-museum-muted/60">
            Click any person to re-anchor the tree on them
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
