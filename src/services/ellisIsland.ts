import ellisRecords from "@/data/ellis-island-records.json";
import {
  decadeToYear,
  getMigrationWave,
  resolveCountry,
} from "@/lib/surnameOrigin";
import type { EllisRecord, MigrationEvent } from "@/types";

export function searchRecords(
  surname: string,
  country?: string
): EllisRecord[] {
  const normalized = surname.toLowerCase();
  const { country: resolved } = resolveCountry(surname, country);

  return (ellisRecords as EllisRecord[]).filter((r) => {
    const surnameMatch =
      r.surname.toLowerCase() === normalized ||
      r.surname.toLowerCase().includes(normalized);
    const countryMatch =
      !country ||
      r.originCountry.toLowerCase().includes(country.toLowerCase()) ||
      r.originCountry.toLowerCase().includes(resolved.toLowerCase());
    return surnameMatch && countryMatch;
  });
}

export function recordsToMigrations(records: EllisRecord[]): MigrationEvent[] {
  return records.map((r) => ({
    year: r.arrivalYear,
    from: r.originCountry,
    to: r.portOfEntry,
    source: `Historical passenger record — ${r.ship}`,
    label: `${r.firstName} ${r.surname} arrived via ${r.ship}`,
  }));
}

export function inferMigrationFromInput(
  surname: string,
  country?: string,
  decade?: string
): MigrationEvent[] {
  const records = searchRecords(surname, country);
  if (records.length > 0) return recordsToMigrations(records);

  const { country: origin, region, inferred } = resolveCountry(surname, country);
  const wave = getMigrationWave(origin);
  const arrivalYear = decadeToYear(decade);
  const port =
    wave.typicalPorts.find((p) =>
      arrivalYear >= 1970 ? p.includes("San") || p.includes("Los") || p.includes("New") : true
    ) ?? wave.typicalPorts[0];
  const settlement = wave.settlementRegions[0] ?? "California";
  const fromLabel = region ? `${region}, ${origin}` : origin;

  const events: MigrationEvent[] = [
    {
      year: arrivalYear,
      from: fromLabel,
      to: port,
      source: inferred
        ? "Modeled route from surname origin and immigration-era patterns"
        : "Modeled route from your family inputs",
      label: `${surname} family migration — ${fromLabel} to ${port}`,
    },
    {
      year: arrivalYear + 5,
      from: port,
      to: settlement,
      source: wave.narrative,
      label: `Settlement in ${settlement}`,
    },
  ];

  return events;
}
