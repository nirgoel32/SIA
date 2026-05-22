/**
 * Local persistence of a user-uploaded family tree.
 *
 * Stored in localStorage so it survives reloads but never leaves the
 * device. Single-slot: one active tree at a time, which keeps the URL
 * structure simple (`/journey?source=user&personId=X`).
 */

import type { Person } from "@/types";

const KEY = "sia.userTree";

export type StoredTree = {
  people: Person[];
  uploadedAt: number;
  sourceLabel: string;
  fileName?: string;
};

export function saveUserTree(
  people: Person[],
  sourceLabel: string,
  fileName?: string
): void {
  if (typeof window === "undefined") return;
  const stored: StoredTree = {
    people,
    uploadedAt: Date.now(),
    sourceLabel,
    fileName,
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(stored));
  } catch (e) {
    console.warn("[userTree] failed to save:", e);
  }
}

export function loadUserTree(): StoredTree | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredTree;
    if (!Array.isArray(parsed.people)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearUserTree(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
