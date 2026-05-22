import censusFallback from "@/data/census-fallback.json";
import type { DemographicPoint } from "@/types";

const CENSUS_API_BASE = "https://api.census.gov/data";

function normalizeAncestryKey(country?: string): string {
  if (!country) return "default";
  const key = Object.keys(censusFallback.ancestry).find(
    (k) => k.toLowerCase() === country.toLowerCase()
  );
  return key ?? "default";
}

export async function getForeignBornPopulation(): Promise<DemographicPoint[]> {
  try {
    const url = `${CENSUS_API_BASE}/timeseries/poverty/acs/1year?get=NAME,B05002_001E&for=us:1&time=from%201960%20to%202020`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error("Census API unavailable");
    const data = (await res.json()) as string[][];
    const rows = data.slice(1);
    return rows
      .map((row) => ({
        year: parseInt(row[2] ?? "0", 10),
        population: parseInt(row[1] ?? "0", 10),
      }))
      .filter((p) => p.year >= 1960 && p.population > 0);
  } catch {
    return censusFallback.foreignBorn;
  }
}

export async function getPopulationByAncestry(
  country?: string
): Promise<DemographicPoint[]> {
  const key = normalizeAncestryKey(country);
  const ancestry = censusFallback.ancestry as Record<string, DemographicPoint[]>;
  return ancestry[key] ?? ancestry.default;
}

export async function getStateDemographics(
  state = "California"
): Promise<{ year: number; foreignBornPct: number }[]> {
  const states = censusFallback.stateChanges as Record<
    string,
    { year: number; foreignBornPct: number }[]
  >;
  return states[state] ?? states.California;
}

export function getCounterfactualProjection(
  country?: string
): DemographicPoint[] {
  const actual = (
    censusFallback.ancestry as Record<string, DemographicPoint[]>
  )[normalizeAncestryKey(country)] ?? censusFallback.ancestry.default;

  return actual.map((point) => ({
    year: point.year,
    population: Math.round(
      point.year < 1965
        ? point.population
        : point.population * (point.year < 1980 ? 0.35 : 0.45)
    ),
    label: "Projected without 1965 Act",
  }));
}
