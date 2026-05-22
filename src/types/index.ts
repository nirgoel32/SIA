export type GenealogySource =
  | "curated"
  | "familysearch"
  | "wikitree"
  | "wikidata"
  | "wikipedia"
  | "enriched"
  | "user";

export type Person = {
  id: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
  deathDate?: string;
  birthPlace?: string;
  deathPlace?: string;
  parents?: string[];
  wikiTreeId?: string;
  familySearchId?: string;
  wikidataId?: string;
  source?: GenealogySource;
  profileUrl?: string;
  matchScore?: number;
};

export type ChapterImage = {
  url: string;
  caption?: string;
  credit?: string;
  sourceUrl?: string;
};

export type MigrationEvent = {
  year: number;
  from: string;
  to: string;
  source?: string;
  label?: string;
  /** "route" = arc between two places; "pin" = single place marker */
  kind?: "route" | "pin";
  /** Server-side hint: fetch the lead image from this Wikipedia article. */
  wikipediaPage?: string;
  /** Resolved image to show in the life-story guide. */
  image?: ChapterImage;
};

export type TimelineEvent = {
  year: number;
  title: string;
  description: string;
  type: "immigration" | "law" | "census" | "family" | "historical";
};

export type DemographicPoint = {
  year: number;
  population: number;
  label?: string;
};

export type JourneyInput = {
  surname: string;
  country?: string;
  decade?: string;
  firstName?: string;
};

export type EllisRecord = {
  id: string;
  surname: string;
  firstName: string;
  ship: string;
  arrivalYear: number;
  originCountry: string;
  portOfEntry: string;
};

export type HistoricalFigure = {
  id: string;
  firstName: string;
  lastName: string;
  wikiTreeId: string;
  birthYear: number;
  description: string;
  originCountry: string;
  settlement: string;
};
