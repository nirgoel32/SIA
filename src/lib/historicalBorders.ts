/**
 * Time-travel cartography: loads historical political borders for a given
 * year so the world map can show ancestral territories as they existed at
 * the time of migration.
 *
 * Data source: historical-basemaps (github.com/aourednik/historical-basemaps),
 * MIT-licensed public GeoJSON of world political boundaries at key epochs.
 *
 * We ship a curated set of epochs (~1.5 MB each, lazy-loaded). Any requested
 * year snaps to the closest available epoch.
 */

import type { Feature, FeatureCollection, Geometry } from "geojson";

/** Epoch years we ship in /public/historical-borders/. */
export const EPOCHS = [1880, 1900, 1914, 1920, 1930, 1945, 1960, 1994, 2000] as const;

export type HistoricalProperties = {
  /** Name of the political entity at that epoch. */
  NAME?: string;
  /** Higher-level political authority (e.g., "Russian Empire", "USSR"). */
  SUBJECTO?: string;
  /** Ultimate parent state. */
  PARTOF?: string;
  ABBREVN?: string;
};

export type HistoricalFeature = Feature<Geometry, HistoricalProperties>;
export type HistoricalCollection = FeatureCollection<Geometry, HistoricalProperties>;

const cache = new Map<number, HistoricalCollection>();
const inflight = new Map<number, Promise<HistoricalCollection>>();

/** Snap any year to the closest available epoch. */
export function snapToEpoch(year: number): (typeof EPOCHS)[number] {
  let best: (typeof EPOCHS)[number] = EPOCHS[0];
  let bestDist = Math.abs(year - EPOCHS[0]);
  for (const e of EPOCHS) {
    const d = Math.abs(year - e);
    if (d < bestDist) {
      bestDist = d;
      best = e;
    }
  }
  return best;
}

/** Load a historical-borders GeoJSON for the given epoch. Cached forever. */
export async function loadEpoch(
  epoch: (typeof EPOCHS)[number]
): Promise<HistoricalCollection> {
  const cached = cache.get(epoch);
  if (cached) return cached;
  const pending = inflight.get(epoch);
  if (pending) return pending;

  const promise = fetch(`/historical-borders/world_${epoch}.geojson`, {
    cache: "force-cache",
  })
    .then((res) => {
      if (!res.ok) throw new Error(`Historical borders ${epoch}: HTTP ${res.status}`);
      return res.json() as Promise<HistoricalCollection>;
    })
    .then((data) => {
      cache.set(epoch, data);
      inflight.delete(epoch);
      return data;
    })
    .catch((e) => {
      inflight.delete(epoch);
      throw e;
    });

  inflight.set(epoch, promise);
  return promise;
}

/** Convenience: snap year and load in one call. */
export async function loadForYear(year: number): Promise<{
  epoch: (typeof EPOCHS)[number];
  data: HistoricalCollection;
}> {
  const epoch = snapToEpoch(year);
  const data = await loadEpoch(epoch);
  return { epoch, data };
}

/** Find the political entity that contains a given lat/lng at the given
 *  epoch. Returns the SUBJECTO (higher authority) when present, otherwise
 *  NAME. This is what we surface to the user — "Warsaw was in the Russian
 *  Empire in 1880." */
export function entityAt(
  data: HistoricalCollection,
  lat: number,
  lng: number
): { name?: string; subjectTo?: string; partOf?: string } | null {
  // Naive point-in-polygon using d3-geo at call site would be heavier; we use
  // bounding-box pre-filter then a point-in-ring test. For ~177 features it's
  // O(n) and fast enough at chapter-change frequency.
  for (const ft of data.features) {
    if (pointInGeometry(lng, lat, ft.geometry)) {
      return {
        name: ft.properties?.NAME,
        subjectTo: ft.properties?.SUBJECTO,
        partOf: ft.properties?.PARTOF,
      };
    }
  }
  return null;
}

/** Ray-casting point-in-polygon over GeoJSON Geometry (Polygon | MultiPolygon). */
function pointInGeometry(lng: number, lat: number, g: Geometry): boolean {
  if (g.type === "Polygon") {
    return pointInPolygon(lng, lat, g.coordinates);
  }
  if (g.type === "MultiPolygon") {
    for (const poly of g.coordinates) {
      if (pointInPolygon(lng, lat, poly)) return true;
    }
    return false;
  }
  return false;
}

function pointInPolygon(
  lng: number,
  lat: number,
  rings: number[][][]
): boolean {
  // Outer ring with subtracted inner rings.
  if (rings.length === 0) return false;
  if (!pointInRing(lng, lat, rings[0])) return false;
  for (let i = 1; i < rings.length; i++) {
    if (pointInRing(lng, lat, rings[i])) return false; // inside a hole
  }
  return true;
}

function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
