import type {
  MigrationEvent,
  Person,
  TimelineEvent,
} from "@/types";
import type { LatLng } from "@/lib/mapGeo";

export type CuratedFigure = {
  /** Names this curated record should match against. Case-insensitive. */
  match: {
    firstName?: string[];
    lastName: string[];
  };
  focus: Person;
  family: Person[]; // does NOT include focus; focus is appended separately
  migrations: MigrationEvent[];
  timelineEvents: TimelineEvent[];
  /** Pre-resolved coordinates so the map never has to call out for these. */
  placeCoords: Record<string, LatLng>;
  /** Country to display in the header. Overrides any inference. */
  country: string;
  /** Optional narrative blurb shown above the journey. */
  narrative?: string;
};

// ---------------------------------------------------------------------------
// Marie Skłodowska-Curie (1867–1934)
// ---------------------------------------------------------------------------

const marieCurieFamily: Person[] = [
  {
    id: "wladyslaw-skłodowski",
    firstName: "Władysław",
    lastName: "Skłodowski",
    birthDate: "1832",
    deathDate: "1902",
    birthPlace: "Kielce, Poland",
    deathPlace: "Warsaw, Poland",
    parents: ["jozef-skłodowski"],
    source: "curated",
  },
  {
    id: "bronislawa-boguska",
    firstName: "Bronisława",
    lastName: "Boguska",
    birthDate: "1836",
    deathDate: "1878",
    birthPlace: "Warsaw, Poland",
    deathPlace: "Warsaw, Poland",
    source: "curated",
  },
  {
    id: "jozef-skłodowski",
    firstName: "Józef",
    lastName: "Skłodowski",
    birthDate: "1804",
    deathDate: "1882",
    birthPlace: "Skłody-Piotrowice, Poland",
    deathPlace: "Zawieprzyce, Poland",
    source: "curated",
  },
  {
    id: "zofia-skłodowska",
    firstName: "Zofia",
    lastName: "Skłodowska",
    birthDate: "1862",
    deathDate: "1876",
    birthPlace: "Warsaw, Poland",
    deathPlace: "Warsaw, Poland",
    parents: ["wladyslaw-skłodowski", "bronislawa-boguska"],
    source: "curated",
  },
  {
    id: "jozef-skłodowski-jr",
    firstName: "Józef",
    lastName: "Skłodowski",
    birthDate: "1863",
    deathDate: "1937",
    birthPlace: "Warsaw, Poland",
    deathPlace: "Warsaw, Poland",
    parents: ["wladyslaw-skłodowski", "bronislawa-boguska"],
    source: "curated",
  },
  {
    id: "bronia-skłodowska",
    firstName: "Bronisława",
    lastName: "Dłuska",
    birthDate: "1865",
    deathDate: "1939",
    birthPlace: "Warsaw, Poland",
    deathPlace: "Warsaw, Poland",
    parents: ["wladyslaw-skłodowski", "bronislawa-boguska"],
    source: "curated",
  },
  {
    id: "helena-skłodowska",
    firstName: "Helena",
    lastName: "Szalay",
    birthDate: "1866",
    deathDate: "1961",
    birthPlace: "Warsaw, Poland",
    deathPlace: "Warsaw, Poland",
    parents: ["wladyslaw-skłodowski", "bronislawa-boguska"],
    source: "curated",
  },
  {
    id: "pierre-curie",
    firstName: "Pierre",
    lastName: "Curie",
    birthDate: "1859",
    deathDate: "1906",
    birthPlace: "Paris, France",
    deathPlace: "Paris, France",
    source: "curated",
    profileUrl: "https://en.wikipedia.org/wiki/Pierre_Curie",
  },
  {
    id: "irene-joliot-curie",
    firstName: "Irène",
    lastName: "Joliot-Curie",
    birthDate: "1897",
    deathDate: "1956",
    birthPlace: "Paris, France",
    deathPlace: "Paris, France",
    parents: ["marie-curie", "pierre-curie"],
    source: "curated",
    profileUrl: "https://en.wikipedia.org/wiki/Irène_Joliot-Curie",
  },
  {
    id: "eve-curie",
    firstName: "Ève",
    lastName: "Curie",
    birthDate: "1904",
    deathDate: "2007",
    birthPlace: "Paris, France",
    deathPlace: "New York, United States",
    parents: ["marie-curie", "pierre-curie"],
    source: "curated",
    profileUrl: "https://en.wikipedia.org/wiki/Ève_Curie",
  },
];

const marieCurie: Person = {
  id: "marie-curie",
  firstName: "Marie",
  lastName: "Skłodowska-Curie",
  birthDate: "1867-11-07",
  deathDate: "1934-07-04",
  birthPlace: "Warsaw, Poland",
  deathPlace: "Sancellemoz, Passy, Haute-Savoie, France",
  parents: ["wladyslaw-skłodowski", "bronislawa-boguska"],
  wikidataId: "Q7186",
  source: "curated",
  profileUrl: "https://en.wikipedia.org/wiki/Marie_Curie",
};

const marieCurieMigrations: MigrationEvent[] = [
  {
    year: 1867,
    from: "Warsaw, Poland",
    to: "Warsaw, Poland",
    kind: "pin",
    label: "Marie born in Russian-controlled Warsaw",
    source: "Born to schoolteacher parents in the Congress Kingdom of Poland.",
    wikipediaPage: "Marie_Curie",
  },
  {
    year: 1891,
    from: "Warsaw, Poland",
    to: "Paris, France",
    kind: "route",
    label: "Marie leaves Warsaw for the Sorbonne",
    source:
      "Polish women were barred from Russian-controlled universities; her sister Bronia had paved the way to Paris.",
    wikipediaPage: "Latin_Quarter,_Paris",
  },
  {
    year: 1895,
    from: "Paris, France",
    to: "Sceaux, France",
    kind: "pin",
    label: "Marries Pierre Curie in Sceaux",
    source:
      "Married July 26, 1895 in the Sceaux town hall. Marie wore a dark blue dress that doubled as her lab clothes.",
    wikipediaPage: "Pierre_Curie",
  },
  {
    year: 1921,
    from: "Paris, France",
    to: "New York, United States",
    kind: "route",
    label: "First US tour to raise radium funds",
    source:
      "Hosted by President Harding at the White House; received 1 gram of radium funded by American women through a national subscription.",
    wikipediaPage: "Marie_Curie",
  },
  {
    year: 1934,
    from: "Paris, France",
    to: "Sancellemoz, Passy, Haute-Savoie, France",
    kind: "route",
    label: "Final journey to Sancellemoz sanatorium",
    source:
      "Died of aplastic anemia from years of radiation exposure on July 4, 1934 in the French Alps.",
    wikipediaPage: "Sancellemoz",
  },
  // Ancestor pins for the family geography.
  {
    year: 1832,
    from: "Kielce, Poland",
    to: "Kielce, Poland",
    kind: "pin",
    label: "Władysław Skłodowski born in Kielce",
    source: "Marie's father — physics and mathematics teacher.",
    wikipediaPage: "Kielce",
  },
  {
    year: 1804,
    from: "Skłody-Piotrowice, Poland",
    to: "Skłody-Piotrowice, Poland",
    kind: "pin",
    label: "Józef Skłodowski born",
    source: "Marie's paternal grandfather — esteemed Polish educator.",
    wikipediaPage: "Mazovia",
  },
];

const marieCurieTimeline: TimelineEvent[] = [
  {
    year: 1863,
    title: "January Uprising crushed",
    description:
      "Russia's brutal suppression of the Polish uprising drives a wave of intellectuals into exile — the Wielka Emigracja that paved Marie's later road to Paris.",
    type: "historical",
  },
  {
    year: 1867,
    title: "Maria Salomea Skłodowska is born",
    description:
      "Born in Russian-controlled Warsaw on November 7, the youngest of five children of two schoolteachers.",
    type: "family",
  },
  {
    year: 1876,
    title: "Older sister Zofia dies of typhus",
    description: "A devastating blow that shapes the household's intensity around education.",
    type: "family",
  },
  {
    year: 1878,
    title: "Mother Bronisława dies of tuberculosis",
    description: "Marie, age 10, loses her mother. Her father raises five children alone.",
    type: "family",
  },
  {
    year: 1882,
    title: "Chinese Exclusion Act (US)",
    description:
      "First major US federal law restricting immigration by national origin — part of a global tightening of borders against perceived 'undesirable' migrants.",
    type: "law",
  },
  {
    year: 1885,
    title: "Marie joins the clandestine 'Flying University'",
    description:
      "Polish women, barred from Russian-controlled universities, study in secret rotating venues.",
    type: "family",
  },
  {
    year: 1891,
    title: "Marie arrives in Paris",
    description:
      "Enrolls at the Sorbonne. Lives in unheated garrets, signs herself 'Marie' rather than Maria.",
    type: "immigration",
  },
  {
    year: 1893,
    title: "First in her class — Master's in Physics",
    description: "First woman in France to earn a physics degree at the Sorbonne.",
    type: "family",
  },
  {
    year: 1895,
    title: "Marries Pierre Curie",
    description:
      "Civil ceremony in Sceaux. Marie wears a dark blue dress that doubles as her lab clothes.",
    type: "family",
  },
  {
    year: 1898,
    title: "Discovers polonium and radium",
    description:
      "Names the first new element after her homeland — a political act in the partitioned Poland of her birth.",
    type: "family",
  },
  {
    year: 1903,
    title: "Nobel Prize in Physics — first woman ever",
    description:
      "Shared with Pierre Curie and Henri Becquerel for radioactivity research.",
    type: "family",
  },
  {
    year: 1906,
    title: "Pierre dies in a Paris street accident",
    description:
      "Marie takes over his Sorbonne chair — the first woman ever to lecture there.",
    type: "family",
  },
  {
    year: 1911,
    title: "Nobel Prize in Chemistry — first person twice",
    description:
      "For the discovery of radium and polonium and the isolation of pure radium.",
    type: "family",
  },
  {
    year: 1914,
    title: "Builds 'petites Curies' for WWI front lines",
    description:
      "Mobile radiology units; trains 150 women operators. Roughly a million wounded soldiers are X-rayed during the war.",
    type: "historical",
  },
  {
    year: 1921,
    title: "US tour to fund 1 gram of radium",
    description:
      "Received by President Harding at the White House. American women had raised $100,000 by subscription.",
    type: "immigration",
  },
  {
    year: 1924,
    title: "Johnson-Reed Act tightens US immigration",
    description:
      "National-origins quota system sharply curtails Eastern and Southern European immigration to the US.",
    type: "law",
  },
  {
    year: 1929,
    title: "Second US tour",
    description:
      "Funds a radium institute in Warsaw — her gift to the Polish science she'd left at 23.",
    type: "immigration",
  },
  {
    year: 1934,
    title: "Marie dies of aplastic anemia",
    description:
      "Decades of radiation exposure catch up with her at the Sancellemoz sanatorium in the French Alps.",
    type: "family",
  },
  {
    year: 1935,
    title: "Daughter Irène wins her own Nobel",
    description:
      "Irène and Frédéric Joliot-Curie share the Chemistry prize for synthesizing radioactive isotopes — the family's third Nobel.",
    type: "family",
  },
];

const marieCuriePlaceCoords: Record<string, LatLng> = {
  "Warsaw, Poland": { lat: 52.2297, lng: 21.0122 },
  "Paris, France": { lat: 48.8566, lng: 2.3522 },
  "Sceaux, France": { lat: 48.7779, lng: 2.2906 },
  "Kielce, Poland": { lat: 50.8661, lng: 20.6286 },
  "Skłody-Piotrowice, Poland": { lat: 53.0681, lng: 22.5111 },
  "Zawieprzyce, Poland": { lat: 51.3069, lng: 22.9383 },
  "New York, United States": { lat: 40.7128, lng: -74.006 },
  "Sancellemoz, Passy, Haute-Savoie, France": { lat: 45.9241, lng: 6.6802 },
};

export const CURATED_FIGURES: CuratedFigure[] = [
  {
    match: {
      firstName: ["marie", "maria", "marya"],
      lastName: ["curie", "skłodowska", "sklodowska", "skłodowska-curie", "sklodowska-curie"],
    },
    focus: marieCurie,
    family: marieCurieFamily,
    migrations: marieCurieMigrations,
    timelineEvents: marieCurieTimeline,
    placeCoords: marieCuriePlaceCoords,
    country: "Poland",
    narrative:
      "From Russian-occupied Warsaw to the laboratories of Paris — Marie Skłodowska-Curie's life traces one of the great intellectual migrations of the late 19th century, and helped redraw the boundaries of what science (and immigrant women) could be.",
  },
];

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

export function findCurated(
  firstName: string,
  lastName: string
): CuratedFigure | null {
  const fn = normalize(firstName);
  const ln = normalize(lastName);
  for (const figure of CURATED_FIGURES) {
    const fnMatch =
      !figure.match.firstName ||
      figure.match.firstName.some((candidate) => normalize(candidate) === fn) ||
      !fn; // accept surname-only searches
    const lnMatch = figure.match.lastName.some(
      (candidate) => normalize(candidate) === ln
    );
    if (fnMatch && lnMatch) return figure;
  }
  return null;
}
