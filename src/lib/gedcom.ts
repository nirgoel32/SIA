/**
 * Minimal GEDCOM 5.5 parser.
 *
 * GEDCOM is a hierarchical line-oriented genealogy format used by
 * FamilySearch, Ancestry, MyHeritage, RootsMagic, and most desktop
 * genealogy tools. The full spec covers hundreds of tags; we only need
 * the ones that produce a Person graph: INDI, NAME, BIRT/DEAT (DATE +
 * PLAC), FAMC, FAM (HUSB / WIFE / CHIL).
 *
 * Parse is purely client-side — uploaded files never leave the browser.
 */

import type { Person } from "@/types";

type GedcomLine = {
  level: number;
  pointer?: string;
  tag: string;
  value?: string;
  children: GedcomLine[];
};

const MONTHS: Record<string, string> = {
  JAN: "01",
  FEB: "02",
  MAR: "03",
  APR: "04",
  MAY: "05",
  JUN: "06",
  JUL: "07",
  AUG: "08",
  SEP: "09",
  OCT: "10",
  NOV: "11",
  DEC: "12",
};

function parseLines(text: string): GedcomLine[] {
  const lines = text.split(/\r?\n/);
  const root: GedcomLine[] = [];
  const stack: GedcomLine[] = [];

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    // BOM on the first line
    const cleaned = line.replace(/^﻿/, "");

    // GEDCOM: "<level> [@xref@] <tag> [<value>]"
    const m = cleaned.match(/^(\d+)\s+(?:(@[^@\s]+@)\s+)?(\S+)(?:\s(.*))?$/);
    if (!m) continue;

    const level = parseInt(m[1], 10);
    if (!Number.isFinite(level)) continue;
    const pointer = m[2];
    const tag = m[3];
    const value = m[4]?.trim();

    const node: GedcomLine = { level, pointer, tag, value, children: [] };

    if (level === 0) {
      root.push(node);
    } else {
      const parent = stack[level - 1];
      if (parent) parent.children.push(node);
    }
    stack[level] = node;
    // Truncate anything below this level — siblings on the same level should
    // overwrite, not nest under previous content.
    stack.length = level + 1;
  }

  return root;
}

function findChild(node: GedcomLine | undefined, tag: string): GedcomLine | undefined {
  return node?.children.find((c) => c.tag === tag);
}

function findAllChildren(
  node: GedcomLine | undefined,
  tag: string
): GedcomLine[] {
  return node ? node.children.filter((c) => c.tag === tag) : [];
}

function normalizeDate(value?: string): string | undefined {
  if (!value) return undefined;
  let s = value.trim().toUpperCase();
  if (!s) return undefined;
  // Strip qualifiers we don't preserve: ABT 1900, BEF 1900, BET 1900 AND 1910, etc.
  s = s.replace(/^(ABT|EST|CAL|BEF|AFT|CIRCA|C\.)\s+/, "");
  s = s.replace(/^BET\s+/, "").replace(/\s+AND\s+\d{4}.*$/, "");
  s = s.replace(/^(FROM|TO)\s+/, "");

  // DD MMM YYYY
  const dmy = s.match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{4})$/);
  if (dmy && MONTHS[dmy[2]]) {
    return `${dmy[3]}-${MONTHS[dmy[2]]}-${dmy[1].padStart(2, "0")}`;
  }
  // MMM YYYY
  const my = s.match(/^([A-Z]{3})\s+(\d{4})$/);
  if (my && MONTHS[my[1]]) {
    return `${my[2]}-${MONTHS[my[1]]}-01`;
  }
  // YYYY only — preserve as a 4-digit year so parseYear() finds it downstream.
  const y = s.match(/(\d{4})/);
  if (y) return y[1];

  return value.trim();
}

function parseName(value?: string): { firstName: string; lastName: string } {
  if (!value) return { firstName: "", lastName: "" };
  // GEDCOM convention: "Given /Surname/" or "Given /Surname/ suffix".
  const m = value.match(/^([^/]*)\/([^/]*)\//);
  if (m) {
    const firstName = m[1].trim().replace(/\s+/g, " ");
    const lastName = m[2].trim();
    return { firstName, lastName };
  }
  // Fallback for unslashed names: last token is surname.
  const parts = value.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

function stripPointer(p?: string): string | undefined {
  if (!p) return undefined;
  return p.replace(/^@|@$/g, "");
}

export type GedcomParseResult = {
  people: Person[];
  warnings: string[];
  /** Suggested focus: the youngest living/recent individual, or first if none. */
  suggestedFocusId?: string;
};

/** Score for "most likely the user's own profile" — most recent birth wins,
 *  with a small bonus for having both parents recorded so the journey has
 *  something to graph. */
function focusScore(p: Person): number {
  const year = p.birthDate?.match(/(\d{4})/)?.[1];
  const y = year ? parseInt(year, 10) : 0;
  const parentBonus = (p.parents?.length ?? 0) > 0 ? 50 : 0;
  return y + parentBonus;
}

export function parseGedcom(text: string): GedcomParseResult {
  const warnings: string[] = [];
  const root = parseLines(text);

  const indis = root.filter((r) => r.tag === "INDI" && r.pointer);
  const fams = root.filter((r) => r.tag === "FAM" && r.pointer);

  if (indis.length === 0) {
    return {
      people: [],
      warnings: ["No INDI records found. Is this a valid GEDCOM file?"],
    };
  }

  // Build family lookup: famId → { husb, wife, children }
  const families = new Map<
    string,
    { husb?: string; wife?: string; children: string[] }
  >();
  for (const fam of fams) {
    const id = stripPointer(fam.pointer);
    if (!id) continue;
    families.set(id, {
      husb: stripPointer(findChild(fam, "HUSB")?.value),
      wife: stripPointer(findChild(fam, "WIFE")?.value),
      children: findAllChildren(fam, "CHIL")
        .map((c) => stripPointer(c.value))
        .filter((c): c is string => !!c),
    });
  }

  const people: Person[] = [];
  for (const indi of indis) {
    const id = stripPointer(indi.pointer);
    if (!id) continue;
    const { firstName, lastName } = parseName(findChild(indi, "NAME")?.value);
    if (!firstName && !lastName) {
      warnings.push(`Skipped individual ${id} — no name`);
      continue;
    }

    const birt = findChild(indi, "BIRT");
    const deat = findChild(indi, "DEAT");

    const birthDate = normalizeDate(findChild(birt, "DATE")?.value);
    const birthPlace = findChild(birt, "PLAC")?.value?.trim();
    const deathDate = normalizeDate(findChild(deat, "DATE")?.value);
    const deathPlace = findChild(deat, "PLAC")?.value?.trim();

    // Parents: every FAMC links to a FAM, whose HUSB+WIFE are the parents.
    const parents: string[] = [];
    for (const famc of findAllChildren(indi, "FAMC")) {
      const famId = stripPointer(famc.value);
      if (!famId) continue;
      const fam = families.get(famId);
      if (!fam) continue;
      if (fam.husb) parents.push(fam.husb);
      if (fam.wife) parents.push(fam.wife);
    }

    people.push({
      id,
      firstName,
      lastName,
      birthDate,
      deathDate,
      birthPlace,
      deathPlace,
      parents,
      source: "user",
    });
  }

  // Pick a default focus — the most recently born, with a small bonus if they
  // have parents recorded (= more interesting tree to graph).
  let suggestedFocusId: string | undefined;
  let bestScore = -Infinity;
  for (const p of people) {
    const s = focusScore(p);
    if (s > bestScore) {
      bestScore = s;
      suggestedFocusId = p.id;
    }
  }

  return { people, warnings, suggestedFocusId };
}
