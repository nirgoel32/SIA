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

// ---------------------------------------------------------------------------
// Albert Einstein (1879–1955) — Württemberg → Munich → Switzerland → Berlin → Princeton
// ---------------------------------------------------------------------------

const einsteinFamily: Person[] = [
  { id: "hermann-einstein", firstName: "Hermann", lastName: "Einstein", birthDate: "1847", deathDate: "1902", birthPlace: "Buchau, Württemberg, Germany", deathPlace: "Milan, Italy", source: "curated" },
  { id: "pauline-koch", firstName: "Pauline", lastName: "Koch", birthDate: "1858", deathDate: "1920", birthPlace: "Cannstatt, Württemberg, Germany", deathPlace: "Berlin, Germany", source: "curated" },
  { id: "maja-einstein", firstName: "Maja", lastName: "Einstein", birthDate: "1881", deathDate: "1951", birthPlace: "Munich, Germany", deathPlace: "Princeton, United States", parents: ["hermann-einstein", "pauline-koch"], source: "curated" },
  { id: "mileva-maric", firstName: "Mileva", lastName: "Marić", birthDate: "1875", deathDate: "1948", birthPlace: "Titel, Vojvodina, Serbia", deathPlace: "Zürich, Switzerland", source: "curated", profileUrl: "https://en.wikipedia.org/wiki/Mileva_Marić" },
  { id: "hans-albert-einstein", firstName: "Hans Albert", lastName: "Einstein", birthDate: "1904", deathDate: "1973", birthPlace: "Bern, Switzerland", deathPlace: "Berkeley, United States", parents: ["albert-einstein", "mileva-maric"], source: "curated" },
  { id: "eduard-einstein", firstName: "Eduard", lastName: "Einstein", birthDate: "1910", deathDate: "1965", birthPlace: "Zürich, Switzerland", deathPlace: "Zürich, Switzerland", parents: ["albert-einstein", "mileva-maric"], source: "curated" },
  { id: "elsa-einstein", firstName: "Elsa", lastName: "Einstein", birthDate: "1876", deathDate: "1936", birthPlace: "Hechingen, Germany", deathPlace: "Princeton, United States", source: "curated", profileUrl: "https://en.wikipedia.org/wiki/Elsa_Einstein" },
  { id: "margot-einstein", firstName: "Margot", lastName: "Einstein", birthDate: "1899", deathDate: "1986", birthPlace: "Berlin, Germany", deathPlace: "Princeton, United States", source: "curated" },
];

const einsteinFocus: Person = {
  id: "albert-einstein",
  firstName: "Albert",
  lastName: "Einstein",
  birthDate: "1879-03-14",
  deathDate: "1955-04-18",
  birthPlace: "Ulm, Württemberg, Germany",
  deathPlace: "Princeton, United States",
  parents: ["hermann-einstein", "pauline-koch"],
  wikidataId: "Q937",
  source: "curated",
  profileUrl: "https://en.wikipedia.org/wiki/Albert_Einstein",
};

const einsteinMigrations: MigrationEvent[] = [
  { year: 1879, from: "Ulm, Württemberg, Germany", to: "Ulm, Württemberg, Germany", kind: "pin", label: "Albert born in Ulm", source: "Born March 14 in the kingdom of Württemberg — eight years after German unification.", wikipediaPage: "Ulm" },
  { year: 1880, from: "Ulm, Württemberg, Germany", to: "Munich, Germany", kind: "route", label: "Family moves to Munich", source: "Hermann and Jakob Einstein found an electrotechnical firm in Munich.", wikipediaPage: "Munich" },
  { year: 1894, from: "Munich, Germany", to: "Pavia, Italy", kind: "route", label: "Family relocates to Italy after business fails", source: "Albert, 15, is left behind to finish school in Munich; he soon follows.", wikipediaPage: "Pavia" },
  { year: 1895, from: "Pavia, Italy", to: "Aarau, Switzerland", kind: "route", label: "Renounces German citizenship; finishes school in Aarau", source: "Stateless until 1901, when he becomes a Swiss citizen.", wikipediaPage: "Aarau" },
  { year: 1896, from: "Aarau, Switzerland", to: "Zürich, Switzerland", kind: "route", label: "Enrolls at ETH Zürich", source: "Studies physics and mathematics; meets fellow student Mileva Marić.", wikipediaPage: "ETH_Zurich" },
  { year: 1902, from: "Zürich, Switzerland", to: "Bern, Switzerland", kind: "route", label: "Takes job at the Swiss Patent Office", source: "Three years later — in 1905 — he writes the 'annus mirabilis' papers in his off-hours.", wikipediaPage: "Swiss_Federal_Institute_of_Intellectual_Property" },
  { year: 1914, from: "Zürich, Switzerland", to: "Berlin, Germany", kind: "route", label: "Joins Prussian Academy of Sciences in Berlin", source: "Holds the chair at the new Kaiser Wilhelm Institute of Physics. Reluctantly resumes German citizenship.", wikipediaPage: "Prussian_Academy_of_Sciences" },
  { year: 1933, from: "Berlin, Germany", to: "Princeton, United States", kind: "route", label: "Flees Nazi Germany for the Institute for Advanced Study", source: "On a US lecture tour when Hitler takes power; never returns. The Nazis seize his German bank account and burn his books.", wikipediaPage: "Institute_for_Advanced_Study" },
  { year: 1955, from: "Princeton, United States", to: "Princeton, United States", kind: "pin", label: "Dies in Princeton", source: "Refuses surgery for an abdominal aortic aneurysm. 'I want to go when I want… It is tasteless to prolong life artificially.'", wikipediaPage: "Albert_Einstein" },
];

const einsteinTimeline: TimelineEvent[] = [
  { year: 1871, title: "German unification under Prussia", description: "Otto von Bismarck welds 25 states into the German Empire — the political world Einstein is born into eight years later.", type: "historical" },
  { year: 1879, title: "Albert Einstein born in Ulm", description: "Born to secular Jewish parents on March 14 in the kingdom of Württemberg.", type: "family" },
  { year: 1894, title: "Family business fails; relocation to Italy", description: "Hermann's electrical firm loses its bid for Munich's street lighting. The family decamps to Pavia.", type: "family" },
  { year: 1896, title: "Albert renounces German citizenship", description: "To avoid mandatory military service. He is stateless for five years.", type: "immigration" },
  { year: 1901, title: "Naturalized Swiss citizen", description: "Sworn in in Zürich; he will hold Swiss citizenship for the rest of his life — including through US naturalization in 1940.", type: "immigration" },
  { year: 1905, title: "Annus mirabilis", description: "Four papers in Annalen der Physik: photoelectric effect, Brownian motion, special relativity, and E=mc². Still works as a patent clerk.", type: "family" },
  { year: 1914, title: "Returns to Germany as Prussian Academy member", description: "Within months, WWI breaks out. Einstein co-authors a pacifist 'Manifesto to the Europeans.'", type: "historical" },
  { year: 1921, title: "Nobel Prize in Physics", description: "For the photoelectric effect, not relativity — the Nobel committee feared relativity was 'too speculative.'", type: "family" },
  { year: 1924, title: "Johnson-Reed Act tightens US borders", description: "National-origin quotas slash Eastern and Southern European immigration to the US — the regime Einstein will eventually slip through as an exceptional case in 1933.", type: "law" },
  { year: 1933, title: "Hitler takes power; Einstein flees", description: "Aboard a steamer returning from a US tour, he is told never to return to Germany. The Nazis raid his summer house and burn his books.", type: "immigration" },
  { year: 1933, title: "Joins the Institute for Advanced Study, Princeton", description: "Offered a permanent position at the brand-new institute. Settles at 112 Mercer Street.", type: "immigration" },
  { year: 1939, title: "Signs the Einstein-Szilárd letter to FDR", description: "Warns Roosevelt that Nazi Germany may be developing atomic weapons. Catalyst for the Manhattan Project.", type: "historical" },
  { year: 1940, title: "Becomes US citizen", description: "Sworn in October 1 in Trenton, NJ. Retains his Swiss citizenship.", type: "immigration" },
  { year: 1948, title: "Offered the presidency of Israel", description: "He declines. 'I am deeply moved by the offer… and at once saddened and ashamed that I cannot accept.'", type: "historical" },
  { year: 1952, title: "McCarran-Walter Act preserves quota system", description: "Einstein is among many naturalized refugees who lobby — unsuccessfully — for repeal of the national-origin quotas.", type: "law" },
  { year: 1955, title: "Albert Einstein dies in Princeton", description: "Cremated; his ashes are scattered at an undisclosed location. His brain is removed (without consent) for study.", type: "family" },
];

const einsteinPlaceCoords: Record<string, LatLng> = {
  "Ulm, Württemberg, Germany": { lat: 48.4011, lng: 9.9876 },
  "Munich, Germany": { lat: 48.1351, lng: 11.582 },
  "Pavia, Italy": { lat: 45.1847, lng: 9.1582 },
  "Milan, Italy": { lat: 45.4642, lng: 9.19 },
  "Aarau, Switzerland": { lat: 47.3925, lng: 8.0444 },
  "Zürich, Switzerland": { lat: 47.3769, lng: 8.5417 },
  "Bern, Switzerland": { lat: 46.948, lng: 7.4474 },
  "Berlin, Germany": { lat: 52.52, lng: 13.405 },
  "Princeton, United States": { lat: 40.3573, lng: -74.6672 },
  "Buchau, Württemberg, Germany": { lat: 48.0625, lng: 9.6125 },
  "Cannstatt, Württemberg, Germany": { lat: 48.806, lng: 9.218 },
  "Hechingen, Germany": { lat: 48.3536, lng: 8.9614 },
  "Titel, Vojvodina, Serbia": { lat: 45.2058, lng: 20.2933 },
  "Berkeley, United States": { lat: 37.8716, lng: -122.273 },
};

// ---------------------------------------------------------------------------
// Hannah Arendt (1906–1975) — Hanover → Königsberg → Berlin → Paris → New York
// ---------------------------------------------------------------------------

const arendtFamily: Person[] = [
  { id: "paul-arendt", firstName: "Paul", lastName: "Arendt", birthDate: "1873", deathDate: "1913", birthPlace: "Königsberg, East Prussia", deathPlace: "Königsberg, East Prussia", source: "curated" },
  { id: "martha-cohn-arendt", firstName: "Martha", lastName: "Cohn", birthDate: "1874", deathDate: "1948", birthPlace: "Königsberg, East Prussia", deathPlace: "Belfast, Northern Ireland", source: "curated" },
  { id: "gunther-anders", firstName: "Günther", lastName: "Anders", birthDate: "1902", deathDate: "1992", birthPlace: "Breslau, Germany", deathPlace: "Vienna, Austria", source: "curated", profileUrl: "https://en.wikipedia.org/wiki/Günther_Anders" },
  { id: "heinrich-blucher", firstName: "Heinrich", lastName: "Blücher", birthDate: "1899", deathDate: "1970", birthPlace: "Berlin, Germany", deathPlace: "New York, United States", source: "curated", profileUrl: "https://en.wikipedia.org/wiki/Heinrich_Blücher" },
];

const arendtFocus: Person = {
  id: "hannah-arendt",
  firstName: "Hannah",
  lastName: "Arendt",
  birthDate: "1906-10-14",
  deathDate: "1975-12-04",
  birthPlace: "Linden, Hanover, Germany",
  deathPlace: "New York, United States",
  parents: ["paul-arendt", "martha-cohn-arendt"],
  wikidataId: "Q57309",
  source: "curated",
  profileUrl: "https://en.wikipedia.org/wiki/Hannah_Arendt",
};

const arendtMigrations: MigrationEvent[] = [
  { year: 1906, from: "Linden, Hanover, Germany", to: "Linden, Hanover, Germany", kind: "pin", label: "Hannah born in Linden, Hanover", source: "Only child of secular Jewish parents Paul and Martha Arendt.", wikipediaPage: "Linden-Limmer" },
  { year: 1909, from: "Linden, Hanover, Germany", to: "Königsberg, East Prussia", kind: "route", label: "Family moves to Königsberg", source: "Her father's hometown — also Kant's. Hannah will later say Kant was 'one of the household gods.'", wikipediaPage: "Königsberg" },
  { year: 1924, from: "Königsberg, East Prussia", to: "Marburg, Germany", kind: "route", label: "Studies philosophy under Heidegger at Marburg", source: "Begins a turbulent affair with her professor, Martin Heidegger.", wikipediaPage: "Philipps-Universität_Marburg" },
  { year: 1926, from: "Marburg, Germany", to: "Heidelberg, Germany", kind: "route", label: "Moves to Heidelberg to study under Jaspers", source: "Doctoral dissertation on St. Augustine's concept of love (1929).", wikipediaPage: "Heidelberg_University" },
  { year: 1933, from: "Berlin, Germany", to: "Paris, France", kind: "route", label: "Flees Nazi Germany via Czechoslovakia", source: "Arrested by the Gestapo for researching antisemitic propaganda for the German Zionist Federation. Released after eight days; flees the same week.", wikipediaPage: "Hannah_Arendt" },
  { year: 1940, from: "Paris, France", to: "Gurs, France", kind: "route", label: "Interned at Camp Gurs by Vichy France", source: "As a 'hostile alien.' Escapes during the chaos following the French defeat.", wikipediaPage: "Camp_Gurs" },
  { year: 1941, from: "Marseille, France", to: "New York, United States", kind: "route", label: "Escapes to New York via Lisbon", source: "Travels on emergency visas obtained by Varian Fry's Emergency Rescue Committee.", wikipediaPage: "Varian_Fry" },
  { year: 1975, from: "New York, United States", to: "New York, United States", kind: "pin", label: "Dies in her Riverside Drive apartment", source: "Heart attack while entertaining friends after dinner, Dec 4. Buried at Bard College.", wikipediaPage: "Hannah_Arendt" },
];

const arendtTimeline: TimelineEvent[] = [
  { year: 1906, title: "Hannah Arendt is born in Hanover", description: "Only child of engineer Paul Arendt and Martha Cohn, secular German Jews.", type: "family" },
  { year: 1913, title: "Father dies of syphilis", description: "Hannah, age 7, is told the truth about his illness. Her mother raises her alone.", type: "family" },
  { year: 1924, title: "Marburg — meets Heidegger", description: "Begins a love affair with her married professor. Their correspondence will resume after the war despite his Nazi affiliation.", type: "family" },
  { year: 1929, title: "PhD on St. Augustine", description: "Awarded at Heidelberg under Karl Jaspers. Marries Günther Stern (later Anders) the same year.", type: "family" },
  { year: 1933, title: "Reichstag fire; flees Germany", description: "Arrested by the Gestapo and held for eight days, then flees illegally across the Erzgebirge mountains into Czechoslovakia.", type: "immigration" },
  { year: 1937, title: "Stripped of German citizenship", description: "Becomes stateless for fourteen years. 'Once one has lost one's political rights,' she will later write, 'one has lost one's right to have rights.'", type: "immigration" },
  { year: 1940, title: "Interned at Camp Gurs", description: "Imprisoned by Vichy France as an 'enemy alien' — a Jewish refugee from Germany.", type: "historical" },
  { year: 1941, title: "Reaches New York via Lisbon", description: "May 22 — arrives at Ellis Island with her mother and second husband, Heinrich Blücher.", type: "immigration" },
  { year: 1944, title: "Refugee Board lobbies for visa expansion", description: "FDR's War Refugee Board admits ~200,000 displaced persons in the war's final years — a temporary loosening of the 1924 quotas.", type: "law" },
  { year: 1951, title: "The Origins of Totalitarianism", description: "Published shortly after she finally gains US citizenship in December. The book traces antisemitism, imperialism, and totalitarianism.", type: "family" },
  { year: 1951, title: "Becomes a US citizen", description: "After eighteen years stateless. 'For me,' she said, 'America is, before all else, a republic.'", type: "immigration" },
  { year: 1963, title: "Eichmann in Jerusalem", description: "Reports for The New Yorker on the trial of Adolf Eichmann. Coins 'the banality of evil' — and is denounced by many Jewish friends.", type: "family" },
  { year: 1965, title: "Hart-Celler Immigration Act", description: "Abolishes the 1924 national-origin quotas under which Arendt herself had barely squeezed in twenty-four years earlier.", type: "law" },
  { year: 1975, title: "Hannah Arendt dies in New York", description: "December 4. Last public lecture had been the night before. Found at her typewriter, page one of the third volume of The Life of the Mind.", type: "family" },
];

const arendtPlaceCoords: Record<string, LatLng> = {
  "Linden, Hanover, Germany": { lat: 52.3625, lng: 9.7106 },
  "Königsberg, East Prussia": { lat: 54.7104, lng: 20.4522 },
  "Marburg, Germany": { lat: 50.8021, lng: 8.7666 },
  "Heidelberg, Germany": { lat: 49.3988, lng: 8.6724 },
  "Berlin, Germany": { lat: 52.52, lng: 13.405 },
  "Paris, France": { lat: 48.8566, lng: 2.3522 },
  "Gurs, France": { lat: 43.2553, lng: -0.7472 },
  "Marseille, France": { lat: 43.2965, lng: 5.3698 },
  "New York, United States": { lat: 40.7128, lng: -74.006 },
  "Breslau, Germany": { lat: 51.1079, lng: 17.0385 },
  "Belfast, Northern Ireland": { lat: 54.5973, lng: -5.9301 },
  "Vienna, Austria": { lat: 48.2082, lng: 16.3738 },
};

// ---------------------------------------------------------------------------
// Madeleine Albright (1937–2022) — Prague → London → Belgrade → Denver → DC
// ---------------------------------------------------------------------------

const albrightFamily: Person[] = [
  { id: "josef-korbel", firstName: "Josef", lastName: "Korbel", birthDate: "1909", deathDate: "1977", birthPlace: "Geršov, Bohemia, Austria-Hungary", deathPlace: "Denver, United States", source: "curated", profileUrl: "https://en.wikipedia.org/wiki/Josef_Korbel" },
  { id: "anna-spieglova", firstName: "Anna", lastName: "Spieglová", birthDate: "1910", deathDate: "1989", birthPlace: "Kostelec nad Orlicí, Bohemia, Austria-Hungary", deathPlace: "United States", source: "curated" },
  { id: "katherine-korbel", firstName: "Katherine", lastName: "Korbel", birthDate: "1942", birthPlace: "London, United Kingdom", parents: ["josef-korbel", "anna-spieglova"], source: "curated" },
  { id: "john-korbel", firstName: "John", lastName: "Korbel", birthDate: "1947", birthPlace: "Belgrade, Yugoslavia", parents: ["josef-korbel", "anna-spieglova"], source: "curated" },
  { id: "joseph-albright", firstName: "Joseph Medill Patterson", lastName: "Albright", birthDate: "1937", birthPlace: "Chicago, United States", source: "curated" },
];

const albrightFocus: Person = {
  id: "madeleine-albright",
  firstName: "Madeleine",
  lastName: "Albright",
  birthDate: "1937-05-15",
  deathDate: "2022-03-23",
  birthPlace: "Prague, Czechoslovakia",
  deathPlace: "Washington, D.C., United States",
  parents: ["josef-korbel", "anna-spieglova"],
  wikidataId: "Q189145",
  source: "curated",
  profileUrl: "https://en.wikipedia.org/wiki/Madeleine_Albright",
};

const albrightMigrations: MigrationEvent[] = [
  { year: 1937, from: "Prague, Czechoslovakia", to: "Prague, Czechoslovakia", kind: "pin", label: "Born Marie Jana Korbelová in Prague", source: "Born May 15 to a Czech diplomat and his wife. Family is Jewish; both parents will later convert to Catholicism.", wikipediaPage: "Prague" },
  { year: 1939, from: "Prague, Czechoslovakia", to: "London, United Kingdom", kind: "route", label: "Family flees Nazi occupation for London", source: "Ten days after the Nazis enter Prague, the family escapes via Belgrade and Greece. Three of Madeleine's grandparents will die in the camps.", wikipediaPage: "Munich_Agreement" },
  { year: 1945, from: "London, United Kingdom", to: "Prague, Czechoslovakia", kind: "route", label: "Returns to liberated Prague", source: "Her father resumes his diplomatic career as Czechoslovak ambassador to Yugoslavia.", wikipediaPage: "History_of_Czechoslovakia" },
  { year: 1948, from: "Belgrade, Yugoslavia", to: "New York, United States", kind: "route", label: "Family flees the Communist coup; asylum in the US", source: "Her father defects after the February coup. They sail on the SS America, arriving in NYC in November.", wikipediaPage: "1948_Czechoslovak_coup_d'état" },
  { year: 1949, from: "New York, United States", to: "Denver, United States", kind: "route", label: "Father takes a post at the University of Denver", source: "Founds what becomes the Josef Korbel School of International Studies. Madeleine is 12.", wikipediaPage: "University_of_Denver" },
  { year: 1957, from: "Denver, United States", to: "Wellesley, United States", kind: "route", label: "Wellesley College", source: "Becomes a US citizen the same year — at 20 — after eight years on a refugee visa.", wikipediaPage: "Wellesley_College" },
  { year: 1997, from: "New York, United States", to: "Washington, D.C., United States", kind: "route", label: "First woman US Secretary of State", source: "Sworn in January 23. Discovers her Jewish heritage from a Washington Post reporter weeks later.", wikipediaPage: "Madeleine_Albright" },
  { year: 2022, from: "Washington, D.C., United States", to: "Washington, D.C., United States", kind: "pin", label: "Dies in Washington", source: "March 23, of cancer. Buried at Oak Hill Cemetery.", wikipediaPage: "Madeleine_Albright" },
];

const albrightTimeline: TimelineEvent[] = [
  { year: 1937, title: "Marie Jana Korbelová is born in Prague", description: "Her father is a diplomat in the first Czechoslovak Republic.", type: "family" },
  { year: 1939, title: "Nazi occupation of Czechoslovakia", description: "The Korbels flee through Belgrade and Greece, eventually reaching London.", type: "historical" },
  { year: 1940, title: "London Blitz", description: "The family lives through nightly bombing raids. Madeleine, age 3-4, learns English in air-raid shelters.", type: "historical" },
  { year: 1945, title: "Return to Prague after V-E Day", description: "Three of four grandparents have been murdered at Terezín and Auschwitz. The family's Jewish identity is never spoken of.", type: "family" },
  { year: 1948, title: "Communist coup in Czechoslovakia", description: "Her father, then ambassador to Belgrade, defects. The family is granted political asylum in the US.", type: "immigration" },
  { year: 1948, title: "Displaced Persons Act (US)", description: "Authorizes 400,000 European refugees to enter the US over four years — the legal framework under which the Korbels arrive.", type: "law" },
  { year: 1957, title: "Becomes a US citizen", description: "Sworn in the same year she enters Wellesley.", type: "immigration" },
  { year: 1959, title: "Marries Joseph Albright", description: "Three days after graduating from Wellesley. They will divorce in 1982.", type: "family" },
  { year: 1965, title: "Hart-Celler Immigration Act", description: "Ends national-origin quotas under which her family had counted as exceptional refugees rather than ordinary immigrants.", type: "law" },
  { year: 1976, title: "PhD from Columbia under Brzezinski", description: "Dissertation on the Prague Spring of 1968 — the country she'd been forced to leave twice.", type: "family" },
  { year: 1993, title: "US Ambassador to the United Nations", description: "Nominated by Clinton. Pushes through expanded peacekeeping and tribunal action on Rwanda and Bosnia.", type: "immigration" },
  { year: 1997, title: "First woman US Secretary of State", description: "Sworn in January 23. Six weeks later, learns from a journalist that her parents were Jewish and that three of her grandparents died in the Holocaust.", type: "immigration" },
  { year: 1999, title: "NATO expansion to Czech Republic, Hungary, Poland", description: "Albright presides over the formal entry of her birth country — fifty years after she fled it as a child.", type: "historical" },
  { year: 2022, title: "Madeleine Albright dies in Washington", description: "March 23. Buried at Oak Hill Cemetery in Georgetown.", type: "family" },
];

const albrightPlaceCoords: Record<string, LatLng> = {
  "Prague, Czechoslovakia": { lat: 50.0755, lng: 14.4378 },
  "London, United Kingdom": { lat: 51.5074, lng: -0.1278 },
  "Belgrade, Yugoslavia": { lat: 44.7866, lng: 20.4489 },
  "New York, United States": { lat: 40.7128, lng: -74.006 },
  "Denver, United States": { lat: 39.7392, lng: -104.9903 },
  "Wellesley, United States": { lat: 42.2968, lng: -71.2924 },
  "Washington, D.C., United States": { lat: 38.9072, lng: -77.0369 },
  "Chicago, United States": { lat: 41.8781, lng: -87.6298 },
  "Geršov, Bohemia, Austria-Hungary": { lat: 49.5, lng: 15.5 },
  "Kostelec nad Orlicí, Bohemia, Austria-Hungary": { lat: 50.124, lng: 16.213 },
};

// ---------------------------------------------------------------------------
// Andrew Carnegie (1835–1919) — Dunfermline → Pittsburgh
// ---------------------------------------------------------------------------

const carnegieFamily: Person[] = [
  { id: "william-carnegie", firstName: "William", lastName: "Carnegie", birthDate: "1804", deathDate: "1855", birthPlace: "Patiemuir, Scotland", deathPlace: "Allegheny, Pennsylvania, United States", source: "curated" },
  { id: "margaret-morrison-carnegie", firstName: "Margaret", lastName: "Morrison", birthDate: "1810", deathDate: "1886", birthPlace: "Dunfermline, Scotland", deathPlace: "Allegheny, Pennsylvania, United States", source: "curated" },
  { id: "thomas-carnegie", firstName: "Thomas", lastName: "Carnegie", birthDate: "1843", deathDate: "1886", birthPlace: "Dunfermline, Scotland", deathPlace: "Homewood, Pennsylvania, United States", parents: ["william-carnegie", "margaret-morrison-carnegie"], source: "curated", profileUrl: "https://en.wikipedia.org/wiki/Thomas_M._Carnegie" },
  { id: "louise-whitfield", firstName: "Louise", lastName: "Whitfield", birthDate: "1857", deathDate: "1946", birthPlace: "New York, United States", deathPlace: "New York, United States", source: "curated" },
  { id: "margaret-carnegie-miller", firstName: "Margaret", lastName: "Carnegie Miller", birthDate: "1897", deathDate: "1990", birthPlace: "New York, United States", deathPlace: "New York, United States", parents: ["andrew-carnegie", "louise-whitfield"], source: "curated" },
];

const carnegieFocus: Person = {
  id: "andrew-carnegie",
  firstName: "Andrew",
  lastName: "Carnegie",
  birthDate: "1835-11-25",
  deathDate: "1919-08-11",
  birthPlace: "Dunfermline, Scotland",
  deathPlace: "Lenox, Massachusetts, United States",
  parents: ["william-carnegie", "margaret-morrison-carnegie"],
  wikidataId: "Q484523",
  source: "curated",
  profileUrl: "https://en.wikipedia.org/wiki/Andrew_Carnegie",
};

const carnegieMigrations: MigrationEvent[] = [
  { year: 1835, from: "Dunfermline, Scotland", to: "Dunfermline, Scotland", kind: "pin", label: "Andrew born in a weaver's cottage", source: "Family of handloom weavers — a craft about to be wiped out by industrial power looms.", wikipediaPage: "Dunfermline" },
  { year: 1848, from: "Dunfermline, Scotland", to: "Glasgow, Scotland", kind: "route", label: "Family sails from the Broomielaw for America", source: "Andrew, 12, boards the brig Wiscasset with his parents and brother. They have borrowed £20 for steerage passage.", wikipediaPage: "Broomielaw" },
  { year: 1848, from: "Glasgow, Scotland", to: "New York, United States", kind: "route", label: "Atlantic crossing — fifty days in steerage", source: "Lands at the Castle Garden depot in New York harbor.", wikipediaPage: "Castle_Garden_(immigration_station)" },
  { year: 1848, from: "New York, United States", to: "Allegheny, Pennsylvania, United States", kind: "route", label: "Up the Hudson, west by canal and steamboat to Pittsburgh", source: "Three weeks via the Erie Canal, Lake Erie, and the Ohio canal system to Slabtown in Allegheny City.", wikipediaPage: "Allegheny,_Pennsylvania" },
  { year: 1853, from: "Allegheny, Pennsylvania, United States", to: "Pittsburgh, United States", kind: "route", label: "Hired as private secretary by Pennsylvania Railroad", source: "Thomas A. Scott takes him under his wing. Salary jumps from $4 a week as a bobbin boy to $35 a month.", wikipediaPage: "Pennsylvania_Railroad" },
  { year: 1873, from: "Pittsburgh, United States", to: "Braddock, Pennsylvania, United States", kind: "route", label: "Builds the Edgar Thomson Steel Works", source: "First large-scale Bessemer steel mill in the US. Named for the Pennsylvania Railroad president.", wikipediaPage: "Edgar_Thomson_Steel_Works" },
  { year: 1898, from: "Pittsburgh, United States", to: "Skibo, Sutherland, Scotland", kind: "route", label: "Buys Skibo Castle as summer home", source: "Spends summers in the Scottish Highlands he had left as a 12-year-old.", wikipediaPage: "Skibo_Castle" },
  { year: 1919, from: "New York, United States", to: "Lenox, Massachusetts, United States", kind: "route", label: "Dies at Shadow Brook, his Berkshires estate", source: "August 11, of bronchial pneumonia. Buried at Sleepy Hollow Cemetery, Tarrytown, NY.", wikipediaPage: "Andrew_Carnegie" },
];

const carnegieTimeline: TimelineEvent[] = [
  { year: 1835, title: "Andrew Carnegie born in Dunfermline", description: "His father William is a handloom weaver; the family lives in a single room.", type: "family" },
  { year: 1842, title: "Power loom destroys hand-weaving", description: "William's livelihood collapses. The family slides into poverty.", type: "historical" },
  { year: 1845, title: "Irish Potato Famine triggers mass Atlantic migration", description: "The 1840s see 1.7M Britons and Irish cross to North America. The Carnegies are part of this wave.", type: "immigration" },
  { year: 1848, title: "Carnegies sail from Glasgow to New York", description: "Andrew, 12, will say later he 'never knew what it was to be a child' before the crossing.", type: "immigration" },
  { year: 1850, title: "Telegrapher at Atlantic Telegraph Co.", description: "Age 14. Learns to take messages by ear — a rare skill. Catches the eye of Thomas Scott.", type: "family" },
  { year: 1855, title: "Father William dies in Allegheny", description: "Andrew, 20, is now the family's sole earner.", type: "family" },
  { year: 1862, title: "Homestead Act opens the West", description: "Carnegie does not go west; he stays in railroads and, soon, iron and steel.", type: "law" },
  { year: 1865, title: "Founds Keystone Bridge Company", description: "Builds iron bridges for the post-war railroad boom. First step toward steel.", type: "family" },
  { year: 1882, title: "Chinese Exclusion Act", description: "Federal restriction of immigration by national origin — a sign of the political mood Carnegie's libraries will rise against.", type: "law" },
  { year: 1889, title: "Publishes 'The Gospel of Wealth'", description: "Argues the rich are obligated to give away their fortunes during their lifetime.", type: "family" },
  { year: 1892, title: "Homestead Strike", description: "Carnegie is at Skibo; his deputy Henry Clay Frick uses Pinkerton agents against striking steelworkers. Seven workers killed.", type: "family" },
  { year: 1901, title: "Sells Carnegie Steel to J.P. Morgan for $480M", description: "The deal creates US Steel — the first billion-dollar corporation. Carnegie becomes the richest man in the world.", type: "family" },
  { year: 1902, title: "Carnegie Institution for Science founded", description: "First of the great Carnegie philanthropies. Endowment: $10M.", type: "family" },
  { year: 1906, title: "Carnegie Foundation for the Advancement of Teaching", description: "Funds public libraries — 1,689 in the US, 660 in Britain — and university pensions.", type: "family" },
  { year: 1919, title: "Andrew Carnegie dies at Shadow Brook", description: "He has given away ~$350M (~$5B today) — about 90% of his fortune.", type: "family" },
];

const carnegiePlaceCoords: Record<string, LatLng> = {
  "Dunfermline, Scotland": { lat: 56.0719, lng: -3.4528 },
  "Glasgow, Scotland": { lat: 55.8642, lng: -4.2518 },
  "New York, United States": { lat: 40.7128, lng: -74.006 },
  "Allegheny, Pennsylvania, United States": { lat: 40.4602, lng: -80.0084 },
  "Pittsburgh, United States": { lat: 40.4406, lng: -79.9959 },
  "Braddock, Pennsylvania, United States": { lat: 40.4035, lng: -79.8689 },
  "Homewood, Pennsylvania, United States": { lat: 40.4555, lng: -79.8983 },
  "Skibo, Sutherland, Scotland": { lat: 57.875, lng: -4.119 },
  "Lenox, Massachusetts, United States": { lat: 42.3567, lng: -73.2842 },
  "Patiemuir, Scotland": { lat: 56.05, lng: -3.45 },
};

// ---------------------------------------------------------------------------
// Sergey Brin (b. 1973) — Moscow → Maryland → Stanford → Menlo Park
// ---------------------------------------------------------------------------

const brinFamily: Person[] = [
  { id: "mikhail-brin", firstName: "Mikhail", lastName: "Brin", birthDate: "1948", birthPlace: "Moscow, Soviet Union", source: "curated", profileUrl: "https://en.wikipedia.org/wiki/Michael_Brin" },
  { id: "yevgenia-brin", firstName: "Yevgenia", lastName: "Brin", birthDate: "1948", birthPlace: "Moscow, Soviet Union", source: "curated" },
  { id: "sam-brin", firstName: "Sam", lastName: "Brin", birthDate: "1987", birthPlace: "Maryland, United States", parents: ["mikhail-brin", "yevgenia-brin"], source: "curated" },
  { id: "anne-wojcicki", firstName: "Anne", lastName: "Wojcicki", birthDate: "1973", birthPlace: "San Mateo, California, United States", source: "curated", profileUrl: "https://en.wikipedia.org/wiki/Anne_Wojcicki" },
];

const brinFocus: Person = {
  id: "sergey-brin",
  firstName: "Sergey",
  lastName: "Brin",
  birthDate: "1973-08-21",
  birthPlace: "Moscow, Soviet Union",
  parents: ["mikhail-brin", "yevgenia-brin"],
  wikidataId: "Q92531",
  source: "curated",
  profileUrl: "https://en.wikipedia.org/wiki/Sergey_Brin",
};

const brinMigrations: MigrationEvent[] = [
  { year: 1973, from: "Moscow, Soviet Union", to: "Moscow, Soviet Union", kind: "pin", label: "Sergey born to Soviet-Jewish mathematician parents", source: "His father Mikhail is barred from physics graduate study because he is Jewish; he turns to mathematics.", wikipediaPage: "Refusenik" },
  { year: 1979, from: "Moscow, Soviet Union", to: "Vienna, Austria", kind: "route", label: "Family flees the USSR via the Vienna-Rome route", source: "Six years on after applying for an exit visa; Mikhail is fired the day he submits the paperwork. Sergey is six.", wikipediaPage: "Jackson–Vanik_amendment" },
  { year: 1979, from: "Vienna, Austria", to: "Rome, Italy", kind: "route", label: "Awaiting US refugee paperwork in Rome", source: "Processed by HIAS — the Hebrew Immigrant Aid Society — alongside ~28,000 other Soviet Jews that year.", wikipediaPage: "HIAS" },
  { year: 1979, from: "Rome, Italy", to: "College Park, Maryland, United States", kind: "route", label: "Family settles in College Park, Maryland", source: "Mikhail takes a position teaching mathematics at the University of Maryland. Yevgenia later works at NASA Goddard.", wikipediaPage: "College_Park,_Maryland" },
  { year: 1990, from: "College Park, Maryland, United States", to: "College Park, Maryland, United States", kind: "pin", label: "Enters University of Maryland at 17", source: "Graduates in 1993 with degrees in mathematics and computer science.", wikipediaPage: "University_of_Maryland,_College_Park" },
  { year: 1993, from: "College Park, Maryland, United States", to: "Stanford, California, United States", kind: "route", label: "PhD program at Stanford", source: "On a National Science Foundation fellowship. Meets Larry Page in 1995 during graduate orientation.", wikipediaPage: "Stanford_University" },
  { year: 1998, from: "Stanford, California, United States", to: "Menlo Park, California, United States", kind: "route", label: "Founds Google with Larry Page", source: "Incorporated September 4 in a Menlo Park garage rented from Susan Wojcicki — his future sister-in-law.", wikipediaPage: "Google" },
];

const brinTimeline: TimelineEvent[] = [
  { year: 1965, title: "Hart-Celler ends US national-origin quotas", description: "The legal framework that will eventually let the Brins enter as refugees rather than under the old USSR quota.", type: "law" },
  { year: 1973, title: "Sergey Brin is born in Moscow", description: "Born August 21 to mathematician Mikhail Brin and economist Yevgenia. Their Jewish heritage caps their academic ceiling.", type: "family" },
  { year: 1974, title: "Jackson-Vanik amendment", description: "Conditions US trade with the USSR on Jewish emigration rights — opens the door the Brins will eventually walk through.", type: "law" },
  { year: 1975, title: "Father applies to leave USSR", description: "Mikhail is fired from the State Planning Committee the day his application is registered. The family waits four years in limbo.", type: "immigration" },
  { year: 1979, title: "Brins emigrate via Vienna and Rome", description: "Part of a ~28,000-person Soviet-Jewish wave that year — the largest annual cohort of the Cold War.", type: "immigration" },
  { year: 1980, title: "Refugee Act of 1980 (US)", description: "Codifies the refugee admission process the Brins had just experienced — for everyone arriving after them.", type: "law" },
  { year: 1985, title: "Granted US permanent residency", description: "Standard timeline for Soviet-Jewish refugees in this era.", type: "immigration" },
  { year: 1990, title: "Sergey enters Maryland at 17", description: "Earns BS in math and computer science by age 19.", type: "family" },
  { year: 1993, title: "Stanford PhD program", description: "Joins on an NSF fellowship.", type: "family" },
  { year: 1995, title: "Meets Larry Page at Stanford orientation", description: "The pair argue about everything; collaborate on a research project the next year called 'BackRub.'", type: "family" },
  { year: 1996, title: "BackRub crawls the early web", description: "Ranks pages by inbound links — what will become PageRank.", type: "family" },
  { year: 1998, title: "Google incorporated", description: "September 4 in Menlo Park. First investor: Andy Bechtolsheim, $100,000 by check.", type: "family" },
  { year: 2004, title: "Google IPO", description: "Brin and Page each net over $1 billion at age 30.", type: "family" },
  { year: 2017, title: "Brin speaks at airport against Muslim travel ban", description: "At SFO, he tells reporters: 'I'm here because I'm a refugee.'", type: "immigration" },
];

const brinPlaceCoords: Record<string, LatLng> = {
  "Moscow, Soviet Union": { lat: 55.7558, lng: 37.6173 },
  "Vienna, Austria": { lat: 48.2082, lng: 16.3738 },
  "Rome, Italy": { lat: 41.9028, lng: 12.4964 },
  "College Park, Maryland, United States": { lat: 38.9897, lng: -76.937 },
  "Stanford, California, United States": { lat: 37.4275, lng: -122.1697 },
  "Menlo Park, California, United States": { lat: 37.4529, lng: -122.1817 },
  "Maryland, United States": { lat: 39.0458, lng: -76.6413 },
  "San Mateo, California, United States": { lat: 37.5629, lng: -122.3255 },
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
  {
    match: {
      firstName: ["albert"],
      lastName: ["einstein"],
    },
    focus: einsteinFocus,
    family: einsteinFamily,
    migrations: einsteinMigrations,
    timelineEvents: einsteinTimeline,
    placeCoords: einsteinPlaceCoords,
    country: "Germany",
    narrative:
      "Einstein's life is a map of twentieth-century displacement: born in a unified Germany barely a decade old, stateless by choice at sixteen, Swiss by twenty-two, German again by necessity at thirty-five, then a refugee to America at fifty-four. He arrived in Princeton in 1933 the same week the Nazis announced their first racial laws.",
  },
  {
    match: {
      firstName: ["hannah"],
      lastName: ["arendt"],
    },
    focus: arendtFocus,
    family: arendtFamily,
    migrations: arendtMigrations,
    timelineEvents: arendtTimeline,
    placeCoords: arendtPlaceCoords,
    country: "Germany",
    narrative:
      "From a Jewish childhood in Königsberg — Kant's hometown — to internment by Vichy France to a Riverside Drive apartment in New York, Hannah Arendt was stateless for eighteen years and a refugee for twenty-five. Her writing on totalitarianism, the rights of refugees, and the 'banality of evil' was born of that crossing.",
  },
  {
    match: {
      firstName: ["madeleine", "marie"],
      lastName: ["albright", "korbel", "korbelová"],
    },
    focus: albrightFocus,
    family: albrightFamily,
    migrations: albrightMigrations,
    timelineEvents: albrightTimeline,
    placeCoords: albrightPlaceCoords,
    country: "Czechoslovakia",
    narrative:
      "Born in Prague three years before the Nazi invasion, Madeleine Albright fled twice as a child — first from Hitler in 1939, then from the Communists in 1948. She became a US citizen at twenty, the first woman Secretary of State at fifty-nine, and learned only in middle age that three of her grandparents had been murdered at Terezín and Auschwitz.",
  },
  {
    match: {
      firstName: ["andrew", "andy"],
      lastName: ["carnegie"],
    },
    focus: carnegieFocus,
    family: carnegieFamily,
    migrations: carnegieMigrations,
    timelineEvents: carnegieTimeline,
    placeCoords: carnegiePlaceCoords,
    country: "Scotland",
    narrative:
      "When the power loom destroyed his weaver father's livelihood in Dunfermline, twelve-year-old Andrew Carnegie crossed the Atlantic in steerage and arrived at Castle Garden with the equivalent of a few pounds. Fifty years later he was the richest man in the world — and gave away nearly all of it to build 2,500 public libraries on three continents.",
  },
  {
    match: {
      firstName: ["sergey", "sergei"],
      lastName: ["brin"],
    },
    focus: brinFocus,
    family: brinFamily,
    migrations: brinMigrations,
    timelineEvents: brinTimeline,
    placeCoords: brinPlaceCoords,
    country: "Soviet Union",
    narrative:
      "Six-year-old Sergey Brin landed in College Park, Maryland in 1979 as one of ~28,000 Soviet-Jewish refugees admitted under the Jackson-Vanik amendment — a Cold-War immigration deal that conditioned US trade on the right of Soviet Jews to leave. Two decades later he co-founded Google. 'I'm here because I'm a refugee,' he said at SFO airport in 2017.",
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
