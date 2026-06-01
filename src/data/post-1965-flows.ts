// Annual U.S. immigration flows, 1965 - 2024.
// Source: U.S. DHS Yearbook of Immigration Statistics (LPR admissions),
// historical Census/INS series, and Migration Policy Institute aggregates.
// Counts are in thousands and are approximate; this file is a visualization
// dataset, not a citation-grade source.

export type Region =
  | "latin-america"
  | "asia"
  | "europe"
  | "africa"
  | "caribbean"
  | "north-america"
  | "oceania"
  | "middle-east";

export type SourceFlow = {
  country: string;
  count: number; // thousands of arrivals in this year
  region: Region;
  // Primary U.S. gateway region for this flow — used to position the arc tip.
  gateway: GatewayKey;
};

export type GatewayKey =
  | "los-angeles"
  | "new-york"
  | "miami"
  | "houston"
  | "chicago"
  | "seattle"
  | "san-francisco"
  | "el-paso"
  | "boston"
  | "washington-dc";

export const GATEWAYS: Record<GatewayKey, { lat: number; lng: number; label: string }> = {
  "los-angeles":   { lat: 34.05,  lng: -118.24, label: "Los Angeles" },
  "new-york":      { lat: 40.71,  lng: -74.01,  label: "New York" },
  "miami":         { lat: 25.76,  lng: -80.19,  label: "Miami" },
  "houston":       { lat: 29.76,  lng: -95.37,  label: "Houston" },
  "chicago":       { lat: 41.88,  lng: -87.63,  label: "Chicago" },
  "seattle":       { lat: 47.61,  lng: -122.33, label: "Seattle" },
  "san-francisco": { lat: 37.77,  lng: -122.42, label: "San Francisco" },
  "el-paso":       { lat: 31.76,  lng: -106.49, label: "El Paso" },
  "boston":        { lat: 42.36,  lng: -71.06,  label: "Boston" },
  "washington-dc": { lat: 38.91,  lng: -77.04,  label: "Washington, DC" },
};

export const COUNTRY_COORDS: Record<string, { lat: number; lng: number }> = {
  "Mexico":              { lat: 23.63,  lng: -102.55 },
  "Canada":              { lat: 56.13,  lng: -106.35 },
  "Cuba":                { lat: 21.52,  lng: -77.78 },
  "Dominican Republic":  { lat: 18.74,  lng: -70.16 },
  "Haiti":               { lat: 18.97,  lng: -72.29 },
  "Jamaica":             { lat: 18.11,  lng: -77.30 },
  "El Salvador":         { lat: 13.79,  lng: -88.90 },
  "Guatemala":           { lat: 15.78,  lng: -90.23 },
  "Honduras":            { lat: 15.20,  lng: -86.24 },
  "Colombia":            { lat: 4.57,   lng: -74.30 },
  "Venezuela":           { lat: 6.42,   lng: -66.59 },
  "Peru":                { lat: -9.19,  lng: -75.02 },
  "Brazil":              { lat: -14.24, lng: -51.93 },
  "Ecuador":             { lat: -1.83,  lng: -78.18 },
  "Philippines":         { lat: 12.88,  lng: 121.77 },
  "China":               { lat: 35.86,  lng: 104.20 },
  "Taiwan":              { lat: 23.70,  lng: 120.96 },
  "Hong Kong":           { lat: 22.32,  lng: 114.17 },
  "India":               { lat: 20.59,  lng: 78.96 },
  "Pakistan":            { lat: 30.38,  lng: 69.35 },
  "Bangladesh":          { lat: 23.68,  lng: 90.36 },
  "South Korea":         { lat: 35.91,  lng: 127.77 },
  "Japan":               { lat: 36.20,  lng: 138.25 },
  "Vietnam":             { lat: 14.06,  lng: 108.28 },
  "Cambodia":            { lat: 12.57,  lng: 104.99 },
  "Laos":                { lat: 19.86,  lng: 102.50 },
  "Thailand":            { lat: 15.87,  lng: 100.99 },
  "Burma":               { lat: 21.91,  lng: 95.96 },
  "Italy":               { lat: 41.87,  lng: 12.57 },
  "Germany":             { lat: 51.17,  lng: 10.45 },
  "United Kingdom":      { lat: 55.38,  lng: -3.44 },
  "Ireland":             { lat: 53.14,  lng: -7.69 },
  "Greece":              { lat: 39.07,  lng: 21.82 },
  "Portugal":            { lat: 39.40,  lng: -8.22 },
  "Poland":              { lat: 51.92,  lng: 19.15 },
  "Soviet Union":        { lat: 60.00,  lng: 90.00 },
  "Russia":              { lat: 61.52,  lng: 105.32 },
  "Ukraine":             { lat: 48.38,  lng: 31.17 },
  "Yugoslavia":          { lat: 44.10,  lng: 20.50 },
  "Bosnia":              { lat: 43.92,  lng: 17.68 },
  "Iran":                { lat: 32.43,  lng: 53.69 },
  "Iraq":                { lat: 33.22,  lng: 43.68 },
  "Syria":               { lat: 34.80,  lng: 38.99 },
  "Lebanon":             { lat: 33.85,  lng: 35.86 },
  "Israel":              { lat: 31.05,  lng: 34.85 },
  "Afghanistan":         { lat: 33.94,  lng: 67.71 },
  "Egypt":               { lat: 26.82,  lng: 30.80 },
  "Nigeria":             { lat: 9.08,   lng: 8.68 },
  "Ethiopia":            { lat: 9.15,   lng: 40.49 },
  "Ghana":               { lat: 7.95,   lng: -1.02 },
  "Kenya":               { lat: -0.02,  lng: 37.91 },
  "South Africa":        { lat: -30.56, lng: 22.94 },
  "Somalia":             { lat: 5.15,   lng: 46.20 },
  "Australia":           { lat: -25.27, lng: 133.78 },
};

export type YearRecord = {
  year: number;
  total: number; // thousands of legal admissions
  sources: SourceFlow[];
  event?: string; // headline policy/event
  context?: string; // one-sentence interpretation
};

// Compact tuple form: [country, count(thousands), region, gateway]
type Row = [string, number, Region, GatewayKey];

const r = (rows: Row[]): SourceFlow[] =>
  rows.map(([country, count, region, gateway]) => ({ country, count, region, gateway }));

// ---------------------------------------------------------------------------
// Annual data, 1965 - 2024. Counts in thousands, top sources only.
// Numbers approximate DHS/INS published totals.
// ---------------------------------------------------------------------------
export const POST_1965_DATA: YearRecord[] = [
  { year: 1965, total: 297, event: "Hart–Celler Act signed (Oct 3) — national-origin quotas abolished", context: "The last year under the 1924 quota regime. European arrivals still dominant; flows from Asia and Latin America capped.", sources: r([
    ["Mexico", 38, "latin-america", "el-paso"],
    ["Canada", 38, "north-america", "new-york"],
    ["United Kingdom", 27, "europe", "new-york"],
    ["Germany", 24, "europe", "new-york"],
    ["Cuba", 19, "caribbean", "miami"],
    ["Italy", 11, "europe", "new-york"],
    ["Philippines", 3, "asia", "san-francisco"],
    ["China", 4, "asia", "san-francisco"],
  ])},
  { year: 1966, total: 323, event: "First fiscal year under new law", sources: r([
    ["Mexico", 45, "latin-america", "el-paso"],
    ["Canada", 28, "north-america", "new-york"],
    ["Cuba", 17, "caribbean", "miami"],
    ["United Kingdom", 24, "europe", "new-york"],
    ["Germany", 21, "europe", "new-york"],
    ["Italy", 25, "europe", "new-york"],
    ["Philippines", 6, "asia", "san-francisco"],
    ["China", 6, "asia", "san-francisco"],
  ])},
  { year: 1967, total: 362, sources: r([
    ["Mexico", 43, "latin-america", "el-paso"],
    ["Cuba", 33, "caribbean", "miami"],
    ["Canada", 23, "north-america", "new-york"],
    ["Italy", 27, "europe", "new-york"],
    ["United Kingdom", 22, "europe", "new-york"],
    ["Germany", 11, "europe", "new-york"],
    ["Philippines", 11, "asia", "los-angeles"],
    ["Greece", 14, "europe", "new-york"],
  ])},
  { year: 1968, total: 454, event: "Western Hemisphere ceilings phased in", sources: r([
    ["Mexico", 44, "latin-america", "el-paso"],
    ["Cuba", 99, "caribbean", "miami"],
    ["Italy", 23, "europe", "new-york"],
    ["United Kingdom", 19, "europe", "new-york"],
    ["Philippines", 16, "asia", "los-angeles"],
    ["Greece", 13, "europe", "new-york"],
    ["China", 12, "asia", "san-francisco"],
    ["Canada", 22, "north-america", "new-york"],
  ])},
  { year: 1969, total: 359, sources: r([
    ["Mexico", 44, "latin-america", "el-paso"],
    ["Cuba", 52, "caribbean", "miami"],
    ["Philippines", 20, "asia", "los-angeles"],
    ["Italy", 24, "europe", "new-york"],
    ["United Kingdom", 16, "europe", "new-york"],
    ["Greece", 17, "europe", "new-york"],
    ["China", 16, "asia", "san-francisco"],
    ["Korea", 6, "asia", "los-angeles"],
  ])},
  { year: 1970, total: 373, sources: r([
    ["Mexico", 44, "latin-america", "el-paso"],
    ["Cuba", 49, "caribbean", "miami"],
    ["Philippines", 31, "asia", "los-angeles"],
    ["Italy", 25, "europe", "new-york"],
    ["United Kingdom", 14, "europe", "new-york"],
    ["China", 17, "asia", "san-francisco"],
    ["South Korea", 9, "asia", "los-angeles"],
    ["India", 10, "asia", "new-york"],
  ])},
  { year: 1971, total: 370, sources: r([
    ["Mexico", 50, "latin-america", "el-paso"],
    ["Cuba", 21, "caribbean", "miami"],
    ["Philippines", 28, "asia", "los-angeles"],
    ["Italy", 22, "europe", "new-york"],
    ["China", 17, "asia", "san-francisco"],
    ["India", 14, "asia", "new-york"],
    ["South Korea", 14, "asia", "los-angeles"],
    ["Dominican Republic", 13, "caribbean", "new-york"],
  ])},
  { year: 1972, total: 385, sources: r([
    ["Mexico", 64, "latin-america", "el-paso"],
    ["Philippines", 29, "asia", "los-angeles"],
    ["Cuba", 20, "caribbean", "miami"],
    ["Italy", 22, "europe", "new-york"],
    ["South Korea", 18, "asia", "los-angeles"],
    ["China", 22, "asia", "san-francisco"],
    ["India", 16, "asia", "new-york"],
    ["Dominican Republic", 11, "caribbean", "new-york"],
  ])},
  { year: 1973, total: 400, sources: r([
    ["Mexico", 70, "latin-america", "el-paso"],
    ["Philippines", 30, "asia", "los-angeles"],
    ["Cuba", 24, "caribbean", "miami"],
    ["South Korea", 22, "asia", "los-angeles"],
    ["China", 21, "asia", "san-francisco"],
    ["India", 13, "asia", "new-york"],
    ["Italy", 22, "europe", "new-york"],
    ["Dominican Republic", 14, "caribbean", "new-york"],
  ])},
  { year: 1974, total: 395, sources: r([
    ["Mexico", 71, "latin-america", "el-paso"],
    ["Philippines", 32, "asia", "los-angeles"],
    ["South Korea", 28, "asia", "los-angeles"],
    ["Cuba", 19, "caribbean", "miami"],
    ["China", 22, "asia", "san-francisco"],
    ["India", 13, "asia", "new-york"],
    ["Italy", 16, "europe", "new-york"],
    ["Dominican Republic", 15, "caribbean", "new-york"],
  ])},
  { year: 1975, total: 386, event: "Fall of Saigon (Apr 30) — first Vietnamese refugee wave", context: "U.S. evacuates ~125,000 Vietnamese; resettlement begins through Camp Pendleton and Fort Chaffee.", sources: r([
    ["Mexico", 62, "latin-america", "el-paso"],
    ["Philippines", 31, "asia", "los-angeles"],
    ["South Korea", 28, "asia", "los-angeles"],
    ["Vietnam", 3, "asia", "los-angeles"],
    ["China", 18, "asia", "san-francisco"],
    ["Cuba", 25, "caribbean", "miami"],
    ["India", 15, "asia", "new-york"],
    ["Dominican Republic", 14, "caribbean", "new-york"],
  ])},
  { year: 1976, total: 399, sources: r([
    ["Mexico", 58, "latin-america", "el-paso"],
    ["Philippines", 38, "asia", "los-angeles"],
    ["South Korea", 30, "asia", "los-angeles"],
    ["Vietnam", 3, "asia", "los-angeles"],
    ["China", 18, "asia", "san-francisco"],
    ["Cuba", 30, "caribbean", "miami"],
    ["India", 17, "asia", "new-york"],
    ["Dominican Republic", 13, "caribbean", "new-york"],
  ])},
  { year: 1977, total: 462, sources: r([
    ["Mexico", 44, "latin-america", "el-paso"],
    ["Philippines", 39, "asia", "los-angeles"],
    ["South Korea", 30, "asia", "los-angeles"],
    ["Cuba", 69, "caribbean", "miami"],
    ["Vietnam", 5, "asia", "los-angeles"],
    ["China", 19, "asia", "san-francisco"],
    ["India", 18, "asia", "new-york"],
    ["Dominican Republic", 12, "caribbean", "new-york"],
  ])},
  { year: 1978, total: 601, event: "Indochina Migration & Refugee Assistance amendments expanded", sources: r([
    ["Mexico", 92, "latin-america", "el-paso"],
    ["Vietnam", 88, "asia", "los-angeles"],
    ["Philippines", 37, "asia", "los-angeles"],
    ["Cuba", 30, "caribbean", "miami"],
    ["South Korea", 29, "asia", "los-angeles"],
    ["China", 21, "asia", "san-francisco"],
    ["India", 20, "asia", "new-york"],
    ["Dominican Republic", 19, "caribbean", "new-york"],
  ])},
  { year: 1979, total: 460, event: "Iranian Revolution — first wave of Iranian exiles arrives", sources: r([
    ["Mexico", 52, "latin-america", "el-paso"],
    ["Philippines", 41, "asia", "los-angeles"],
    ["Vietnam", 78, "asia", "los-angeles"],
    ["South Korea", 29, "asia", "los-angeles"],
    ["China", 24, "asia", "san-francisco"],
    ["Iran", 8, "middle-east", "los-angeles"],
    ["India", 19, "asia", "new-york"],
    ["Cuba", 16, "caribbean", "miami"],
  ])},
  { year: 1980, total: 530, event: "Refugee Act of 1980; Mariel boatlift — 125,000 Cubans arrive in Miami", context: "Refugee Act creates a uniform definition aligned with the 1951 UN Convention; Mariel reshapes Miami.", sources: r([
    ["Mexico", 57, "latin-america", "el-paso"],
    ["Vietnam", 95, "asia", "los-angeles"],
    ["Cuba", 122, "caribbean", "miami"],
    ["Philippines", 42, "asia", "los-angeles"],
    ["South Korea", 32, "asia", "los-angeles"],
    ["China", 27, "asia", "san-francisco"],
    ["India", 22, "asia", "new-york"],
    ["Dominican Republic", 17, "caribbean", "new-york"],
  ])},
  { year: 1981, total: 597, sources: r([
    ["Mexico", 101, "latin-america", "el-paso"],
    ["Vietnam", 56, "asia", "los-angeles"],
    ["Philippines", 43, "asia", "los-angeles"],
    ["South Korea", 32, "asia", "los-angeles"],
    ["China", 26, "asia", "san-francisco"],
    ["Cuba", 11, "caribbean", "miami"],
    ["India", 21, "asia", "new-york"],
    ["Dominican Republic", 18, "caribbean", "new-york"],
  ])},
  { year: 1982, total: 594, sources: r([
    ["Mexico", 56, "latin-america", "el-paso"],
    ["Vietnam", 73, "asia", "los-angeles"],
    ["Philippines", 45, "asia", "los-angeles"],
    ["South Korea", 31, "asia", "los-angeles"],
    ["China", 28, "asia", "san-francisco"],
    ["India", 22, "asia", "new-york"],
    ["Dominican Republic", 18, "caribbean", "new-york"],
    ["El Salvador", 8, "latin-america", "los-angeles"],
  ])},
  { year: 1983, total: 559, sources: r([
    ["Mexico", 59, "latin-america", "el-paso"],
    ["Philippines", 41, "asia", "los-angeles"],
    ["South Korea", 33, "asia", "los-angeles"],
    ["Vietnam", 37, "asia", "los-angeles"],
    ["China", 26, "asia", "san-francisco"],
    ["India", 25, "asia", "new-york"],
    ["Dominican Republic", 22, "caribbean", "new-york"],
    ["El Salvador", 8, "latin-america", "los-angeles"],
  ])},
  { year: 1984, total: 544, sources: r([
    ["Mexico", 57, "latin-america", "el-paso"],
    ["Philippines", 42, "asia", "los-angeles"],
    ["Vietnam", 37, "asia", "los-angeles"],
    ["South Korea", 33, "asia", "los-angeles"],
    ["China", 24, "asia", "san-francisco"],
    ["India", 25, "asia", "new-york"],
    ["Dominican Republic", 23, "caribbean", "new-york"],
    ["El Salvador", 8, "latin-america", "los-angeles"],
  ])},
  { year: 1985, total: 570, sources: r([
    ["Mexico", 61, "latin-america", "el-paso"],
    ["Philippines", 48, "asia", "los-angeles"],
    ["South Korea", 35, "asia", "los-angeles"],
    ["Vietnam", 32, "asia", "los-angeles"],
    ["China", 25, "asia", "san-francisco"],
    ["India", 26, "asia", "new-york"],
    ["Dominican Republic", 23, "caribbean", "new-york"],
    ["El Salvador", 11, "latin-america", "los-angeles"],
  ])},
  { year: 1986, total: 602, event: "Immigration Reform and Control Act (IRCA) — amnesty for 2.7M+ undocumented", sources: r([
    ["Mexico", 67, "latin-america", "el-paso"],
    ["Philippines", 52, "asia", "los-angeles"],
    ["South Korea", 36, "asia", "los-angeles"],
    ["Vietnam", 30, "asia", "los-angeles"],
    ["China", 26, "asia", "san-francisco"],
    ["India", 27, "asia", "new-york"],
    ["Dominican Republic", 26, "caribbean", "new-york"],
    ["El Salvador", 11, "latin-america", "los-angeles"],
  ])},
  { year: 1987, total: 601, sources: r([
    ["Mexico", 72, "latin-america", "el-paso"],
    ["Philippines", 51, "asia", "los-angeles"],
    ["South Korea", 36, "asia", "los-angeles"],
    ["China", 26, "asia", "san-francisco"],
    ["India", 27, "asia", "new-york"],
    ["Vietnam", 24, "asia", "los-angeles"],
    ["Dominican Republic", 25, "caribbean", "new-york"],
    ["Jamaica", 23, "caribbean", "new-york"],
  ])},
  { year: 1988, total: 643, sources: r([
    ["Mexico", 95, "latin-america", "el-paso"],
    ["Philippines", 50, "asia", "los-angeles"],
    ["South Korea", 35, "asia", "los-angeles"],
    ["China", 29, "asia", "san-francisco"],
    ["India", 26, "asia", "new-york"],
    ["Vietnam", 25, "asia", "los-angeles"],
    ["Dominican Republic", 27, "caribbean", "new-york"],
    ["El Salvador", 12, "latin-america", "los-angeles"],
  ])},
  { year: 1989, total: 1091, event: "IRCA legalizations begin reflected in LPR totals", sources: r([
    ["Mexico", 405, "latin-america", "el-paso"],
    ["Philippines", 57, "asia", "los-angeles"],
    ["El Salvador", 58, "latin-america", "los-angeles"],
    ["South Korea", 34, "asia", "los-angeles"],
    ["China", 32, "asia", "san-francisco"],
    ["India", 31, "asia", "new-york"],
    ["Vietnam", 38, "asia", "los-angeles"],
    ["Dominican Republic", 27, "caribbean", "new-york"],
  ])},
  { year: 1990, total: 1536, event: "Immigration Act of 1990 — caps raised, diversity visa created", context: "Peak IRCA legalization year; total LPRs spike as ~880K former undocumented immigrants regularize status.", sources: r([
    ["Mexico", 680, "latin-america", "el-paso"],
    ["El Salvador", 80, "latin-america", "los-angeles"],
    ["Philippines", 63, "asia", "los-angeles"],
    ["Vietnam", 49, "asia", "los-angeles"],
    ["South Korea", 32, "asia", "los-angeles"],
    ["China", 32, "asia", "san-francisco"],
    ["India", 30, "asia", "new-york"],
    ["Dominican Republic", 32, "caribbean", "new-york"],
  ])},
  { year: 1991, total: 1827, event: "Continued IRCA backlog processing", sources: r([
    ["Mexico", 946, "latin-america", "el-paso"],
    ["Soviet Union", 57, "europe", "new-york"],
    ["Philippines", 64, "asia", "los-angeles"],
    ["Vietnam", 55, "asia", "los-angeles"],
    ["El Salvador", 47, "latin-america", "los-angeles"],
    ["India", 45, "asia", "new-york"],
    ["China", 33, "asia", "san-francisco"],
    ["Dominican Republic", 41, "caribbean", "new-york"],
  ])},
  { year: 1992, total: 974, sources: r([
    ["Mexico", 213, "latin-america", "el-paso"],
    ["Vietnam", 77, "asia", "los-angeles"],
    ["Philippines", 61, "asia", "los-angeles"],
    ["Soviet Union", 43, "europe", "new-york"],
    ["Dominican Republic", 42, "caribbean", "new-york"],
    ["India", 37, "asia", "new-york"],
    ["China", 39, "asia", "san-francisco"],
    ["El Salvador", 26, "latin-america", "los-angeles"],
  ])},
  { year: 1993, total: 904, sources: r([
    ["Mexico", 127, "latin-america", "el-paso"],
    ["China", 65, "asia", "san-francisco"],
    ["Philippines", 63, "asia", "los-angeles"],
    ["Vietnam", 60, "asia", "los-angeles"],
    ["Soviet Union", 58, "europe", "new-york"],
    ["Dominican Republic", 45, "caribbean", "new-york"],
    ["India", 40, "asia", "new-york"],
    ["Poland", 28, "europe", "chicago"],
  ])},
  { year: 1994, total: 804, sources: r([
    ["Mexico", 111, "latin-america", "el-paso"],
    ["China", 53, "asia", "san-francisco"],
    ["Philippines", 53, "asia", "los-angeles"],
    ["Dominican Republic", 51, "caribbean", "new-york"],
    ["Vietnam", 41, "asia", "los-angeles"],
    ["India", 35, "asia", "new-york"],
    ["Russia", 34, "europe", "new-york"],
    ["Ukraine", 21, "europe", "new-york"],
  ])},
  { year: 1995, total: 720, sources: r([
    ["Mexico", 89, "latin-america", "el-paso"],
    ["Philippines", 51, "asia", "los-angeles"],
    ["Vietnam", 41, "asia", "los-angeles"],
    ["Dominican Republic", 38, "caribbean", "new-york"],
    ["China", 36, "asia", "san-francisco"],
    ["India", 35, "asia", "new-york"],
    ["Cuba", 17, "caribbean", "miami"],
    ["Ukraine", 17, "europe", "new-york"],
  ])},
  { year: 1996, total: 916, event: "Illegal Immigration Reform & Immigrant Responsibility Act (IIRIRA)", sources: r([
    ["Mexico", 164, "latin-america", "el-paso"],
    ["Philippines", 56, "asia", "los-angeles"],
    ["India", 45, "asia", "new-york"],
    ["Vietnam", 42, "asia", "los-angeles"],
    ["China", 42, "asia", "san-francisco"],
    ["Dominican Republic", 39, "caribbean", "new-york"],
    ["Cuba", 26, "caribbean", "miami"],
    ["Ukraine", 21, "europe", "new-york"],
  ])},
  { year: 1997, total: 798, sources: r([
    ["Mexico", 147, "latin-america", "el-paso"],
    ["Philippines", 49, "asia", "los-angeles"],
    ["China", 41, "asia", "san-francisco"],
    ["Vietnam", 38, "asia", "los-angeles"],
    ["India", 39, "asia", "new-york"],
    ["Cuba", 33, "caribbean", "miami"],
    ["Dominican Republic", 27, "caribbean", "new-york"],
    ["Russia", 16, "europe", "new-york"],
  ])},
  { year: 1998, total: 654, sources: r([
    ["Mexico", 131, "latin-america", "el-paso"],
    ["China", 36, "asia", "san-francisco"],
    ["India", 36, "asia", "new-york"],
    ["Philippines", 34, "asia", "los-angeles"],
    ["Dominican Republic", 20, "caribbean", "new-york"],
    ["Vietnam", 17, "asia", "los-angeles"],
    ["Cuba", 17, "caribbean", "miami"],
    ["Haiti", 13, "caribbean", "miami"],
  ])},
  { year: 1999, total: 647, sources: r([
    ["Mexico", 147, "latin-america", "el-paso"],
    ["China", 32, "asia", "san-francisco"],
    ["India", 30, "asia", "new-york"],
    ["Philippines", 31, "asia", "los-angeles"],
    ["Dominican Republic", 18, "caribbean", "new-york"],
    ["El Salvador", 14, "latin-america", "los-angeles"],
    ["Vietnam", 20, "asia", "los-angeles"],
    ["Cuba", 14, "caribbean", "miami"],
  ])},
  { year: 2000, total: 841, sources: r([
    ["Mexico", 173, "latin-america", "el-paso"],
    ["China", 46, "asia", "san-francisco"],
    ["Philippines", 42, "asia", "los-angeles"],
    ["India", 42, "asia", "new-york"],
    ["Vietnam", 26, "asia", "los-angeles"],
    ["Dominican Republic", 18, "caribbean", "new-york"],
    ["El Salvador", 22, "latin-america", "los-angeles"],
    ["Cuba", 20, "caribbean", "miami"],
  ])},
  { year: 2001, total: 1059, event: "9/11 — sweeping security review of visa & border systems begins", sources: r([
    ["Mexico", 206, "latin-america", "el-paso"],
    ["India", 70, "asia", "new-york"],
    ["China", 56, "asia", "san-francisco"],
    ["Philippines", 53, "asia", "los-angeles"],
    ["Vietnam", 35, "asia", "los-angeles"],
    ["El Salvador", 31, "latin-america", "los-angeles"],
    ["Cuba", 27, "caribbean", "miami"],
    ["Dominican Republic", 21, "caribbean", "new-york"],
  ])},
  { year: 2002, total: 1059, event: "Homeland Security Act — INS replaced by DHS components", sources: r([
    ["Mexico", 219, "latin-america", "el-paso"],
    ["India", 71, "asia", "new-york"],
    ["China", 61, "asia", "san-francisco"],
    ["Philippines", 51, "asia", "los-angeles"],
    ["Vietnam", 33, "asia", "los-angeles"],
    ["El Salvador", 31, "latin-america", "los-angeles"],
    ["Cuba", 29, "caribbean", "miami"],
    ["Bosnia", 25, "europe", "chicago"],
  ])},
  { year: 2003, total: 706, sources: r([
    ["Mexico", 116, "latin-america", "el-paso"],
    ["India", 50, "asia", "new-york"],
    ["Philippines", 45, "asia", "los-angeles"],
    ["China", 40, "asia", "san-francisco"],
    ["El Salvador", 28, "latin-america", "los-angeles"],
    ["Dominican Republic", 26, "caribbean", "new-york"],
    ["Vietnam", 22, "asia", "los-angeles"],
    ["Cuba", 9, "caribbean", "miami"],
  ])},
  { year: 2004, total: 957, sources: r([
    ["Mexico", 175, "latin-america", "el-paso"],
    ["India", 70, "asia", "new-york"],
    ["China", 51, "asia", "san-francisco"],
    ["Philippines", 57, "asia", "los-angeles"],
    ["Vietnam", 31, "asia", "los-angeles"],
    ["Dominican Republic", 30, "caribbean", "new-york"],
    ["El Salvador", 30, "latin-america", "los-angeles"],
    ["Cuba", 20, "caribbean", "miami"],
  ])},
  { year: 2005, total: 1122, sources: r([
    ["Mexico", 161, "latin-america", "el-paso"],
    ["India", 84, "asia", "new-york"],
    ["China", 70, "asia", "san-francisco"],
    ["Philippines", 60, "asia", "los-angeles"],
    ["Cuba", 36, "caribbean", "miami"],
    ["Vietnam", 32, "asia", "los-angeles"],
    ["Dominican Republic", 27, "caribbean", "new-york"],
    ["El Salvador", 21, "latin-america", "los-angeles"],
  ])},
  { year: 2006, total: 1266, sources: r([
    ["Mexico", 173, "latin-america", "el-paso"],
    ["China", 87, "asia", "san-francisco"],
    ["Philippines", 74, "asia", "los-angeles"],
    ["India", 61, "asia", "new-york"],
    ["Cuba", 45, "caribbean", "miami"],
    ["Colombia", 43, "latin-america", "miami"],
    ["Vietnam", 30, "asia", "los-angeles"],
    ["Dominican Republic", 38, "caribbean", "new-york"],
  ])},
  { year: 2007, total: 1052, sources: r([
    ["Mexico", 149, "latin-america", "el-paso"],
    ["China", 76, "asia", "san-francisco"],
    ["Philippines", 72, "asia", "los-angeles"],
    ["India", 65, "asia", "new-york"],
    ["Cuba", 29, "caribbean", "miami"],
    ["Dominican Republic", 28, "caribbean", "new-york"],
    ["Vietnam", 28, "asia", "los-angeles"],
    ["Colombia", 33, "latin-america", "miami"],
  ])},
  { year: 2008, total: 1107, sources: r([
    ["Mexico", 190, "latin-america", "el-paso"],
    ["China", 80, "asia", "san-francisco"],
    ["India", 63, "asia", "new-york"],
    ["Philippines", 54, "asia", "los-angeles"],
    ["Cuba", 49, "caribbean", "miami"],
    ["Dominican Republic", 32, "caribbean", "new-york"],
    ["Vietnam", 31, "asia", "los-angeles"],
    ["Colombia", 30, "latin-america", "miami"],
  ])},
  { year: 2009, total: 1130, sources: r([
    ["Mexico", 165, "latin-america", "el-paso"],
    ["China", 65, "asia", "san-francisco"],
    ["Philippines", 60, "asia", "los-angeles"],
    ["India", 57, "asia", "new-york"],
    ["Dominican Republic", 49, "caribbean", "new-york"],
    ["Cuba", 39, "caribbean", "miami"],
    ["Vietnam", 29, "asia", "los-angeles"],
    ["Colombia", 27, "latin-america", "miami"],
  ])},
  { year: 2010, total: 1042, sources: r([
    ["Mexico", 139, "latin-america", "el-paso"],
    ["China", 71, "asia", "san-francisco"],
    ["India", 69, "asia", "new-york"],
    ["Philippines", 58, "asia", "los-angeles"],
    ["Dominican Republic", 53, "caribbean", "new-york"],
    ["Cuba", 33, "caribbean", "miami"],
    ["Vietnam", 30, "asia", "los-angeles"],
    ["Haiti", 22, "caribbean", "miami"],
  ])},
  { year: 2011, total: 1062, sources: r([
    ["Mexico", 143, "latin-america", "el-paso"],
    ["China", 87, "asia", "san-francisco"],
    ["India", 69, "asia", "new-york"],
    ["Philippines", 57, "asia", "los-angeles"],
    ["Dominican Republic", 46, "caribbean", "new-york"],
    ["Cuba", 36, "caribbean", "miami"],
    ["Vietnam", 35, "asia", "los-angeles"],
    ["El Salvador", 18, "latin-america", "los-angeles"],
  ])},
  { year: 2012, total: 1031, sources: r([
    ["Mexico", 146, "latin-america", "el-paso"],
    ["China", 82, "asia", "san-francisco"],
    ["India", 66, "asia", "new-york"],
    ["Philippines", 57, "asia", "los-angeles"],
    ["Dominican Republic", 42, "caribbean", "new-york"],
    ["Cuba", 33, "caribbean", "miami"],
    ["Vietnam", 28, "asia", "los-angeles"],
    ["Haiti", 22, "caribbean", "miami"],
  ])},
  { year: 2013, total: 991, event: "China overtakes Mexico as the top single-year source of new immigrants", sources: r([
    ["China", 147, "asia", "san-francisco"],
    ["Mexico", 135, "latin-america", "el-paso"],
    ["India", 99, "asia", "new-york"],
    ["Philippines", 54, "asia", "los-angeles"],
    ["Cuba", 32, "caribbean", "miami"],
    ["Dominican Republic", 41, "caribbean", "new-york"],
    ["Vietnam", 27, "asia", "los-angeles"],
    ["El Salvador", 18, "latin-america", "los-angeles"],
  ])},
  { year: 2014, total: 1016, sources: r([
    ["Mexico", 134, "latin-america", "el-paso"],
    ["India", 77, "asia", "new-york"],
    ["China", 76, "asia", "san-francisco"],
    ["Philippines", 50, "asia", "los-angeles"],
    ["Cuba", 46, "caribbean", "miami"],
    ["Dominican Republic", 44, "caribbean", "new-york"],
    ["Vietnam", 30, "asia", "los-angeles"],
    ["South Korea", 20, "asia", "los-angeles"],
  ])},
  { year: 2015, total: 1051, sources: r([
    ["Mexico", 158, "latin-america", "el-paso"],
    ["China", 74, "asia", "san-francisco"],
    ["India", 64, "asia", "new-york"],
    ["Philippines", 57, "asia", "los-angeles"],
    ["Cuba", 54, "caribbean", "miami"],
    ["Dominican Republic", 50, "caribbean", "new-york"],
    ["Vietnam", 31, "asia", "los-angeles"],
    ["Iraq", 21, "middle-east", "chicago"],
  ])},
  { year: 2016, total: 1184, sources: r([
    ["Mexico", 175, "latin-america", "el-paso"],
    ["China", 81, "asia", "san-francisco"],
    ["Cuba", 66, "caribbean", "miami"],
    ["India", 64, "asia", "new-york"],
    ["Dominican Republic", 61, "caribbean", "new-york"],
    ["Philippines", 53, "asia", "los-angeles"],
    ["Vietnam", 41, "asia", "los-angeles"],
    ["Haiti", 23, "caribbean", "miami"],
  ])},
  { year: 2017, total: 1127, event: "Travel ban executive orders; refugee admissions cut sharply", sources: r([
    ["Mexico", 170, "latin-america", "el-paso"],
    ["China", 71, "asia", "san-francisco"],
    ["Cuba", 65, "caribbean", "miami"],
    ["India", 60, "asia", "new-york"],
    ["Dominican Republic", 58, "caribbean", "new-york"],
    ["Philippines", 49, "asia", "los-angeles"],
    ["Vietnam", 38, "asia", "los-angeles"],
    ["El Salvador", 25, "latin-america", "los-angeles"],
  ])},
  { year: 2018, total: 1097, sources: r([
    ["Mexico", 161, "latin-america", "el-paso"],
    ["Cuba", 76, "caribbean", "miami"],
    ["China", 65, "asia", "san-francisco"],
    ["India", 59, "asia", "new-york"],
    ["Dominican Republic", 57, "caribbean", "new-york"],
    ["Philippines", 47, "asia", "los-angeles"],
    ["Vietnam", 33, "asia", "los-angeles"],
    ["Venezuela", 9, "latin-america", "miami"],
  ])},
  { year: 2019, total: 1031, sources: r([
    ["Mexico", 156, "latin-america", "el-paso"],
    ["India", 55, "asia", "new-york"],
    ["China", 62, "asia", "san-francisco"],
    ["Cuba", 41, "caribbean", "miami"],
    ["Dominican Republic", 49, "caribbean", "new-york"],
    ["Philippines", 45, "asia", "los-angeles"],
    ["Vietnam", 39, "asia", "los-angeles"],
    ["El Salvador", 18, "latin-america", "los-angeles"],
  ])},
  { year: 2020, total: 707, event: "COVID-19 — embassies close, visa processing collapses", context: "Pandemic restrictions drove LPR admissions to a 16-year low.", sources: r([
    ["Mexico", 100, "latin-america", "el-paso"],
    ["India", 46, "asia", "new-york"],
    ["China", 41, "asia", "san-francisco"],
    ["Cuba", 16, "caribbean", "miami"],
    ["Dominican Republic", 30, "caribbean", "new-york"],
    ["Philippines", 25, "asia", "los-angeles"],
    ["Vietnam", 30, "asia", "los-angeles"],
    ["Venezuela", 9, "latin-america", "miami"],
  ])},
  { year: 2021, total: 740, sources: r([
    ["Mexico", 156, "latin-america", "el-paso"],
    ["India", 49, "asia", "new-york"],
    ["China", 31, "asia", "san-francisco"],
    ["Dominican Republic", 27, "caribbean", "new-york"],
    ["Vietnam", 27, "asia", "los-angeles"],
    ["Philippines", 25, "asia", "los-angeles"],
    ["Cuba", 21, "caribbean", "miami"],
    ["Afghanistan", 18, "middle-east", "washington-dc"],
  ])},
  { year: 2022, total: 1018, event: "Backlogs ease; Afghan, Ukrainian, Haitian humanitarian flows surge", sources: r([
    ["Mexico", 122, "latin-america", "el-paso"],
    ["India", 75, "asia", "new-york"],
    ["Cuba", 76, "caribbean", "miami"],
    ["China", 50, "asia", "san-francisco"],
    ["Philippines", 51, "asia", "los-angeles"],
    ["Dominican Republic", 47, "caribbean", "new-york"],
    ["Afghanistan", 38, "middle-east", "washington-dc"],
    ["Venezuela", 13, "latin-america", "miami"],
  ])},
  { year: 2023, total: 1172, event: "CHNV parole program for Cuban, Haitian, Nicaraguan, Venezuelan arrivals", sources: r([
    ["Mexico", 138, "latin-america", "el-paso"],
    ["India", 81, "asia", "new-york"],
    ["Cuba", 49, "caribbean", "miami"],
    ["China", 57, "asia", "san-francisco"],
    ["Philippines", 47, "asia", "los-angeles"],
    ["Dominican Republic", 51, "caribbean", "new-york"],
    ["Venezuela", 24, "latin-america", "miami"],
    ["Haiti", 26, "caribbean", "miami"],
  ])},
  { year: 2024, total: 1280, event: "Asylum at the southern border restricted; family-based backlogs cleared", context: "India remains the top single-year origin for new LPRs; Venezuelan and Haitian arrivals at multi-decade highs.", sources: r([
    ["India", 92, "asia", "new-york"],
    ["Mexico", 132, "latin-america", "el-paso"],
    ["Cuba", 54, "caribbean", "miami"],
    ["China", 60, "asia", "san-francisco"],
    ["Philippines", 49, "asia", "los-angeles"],
    ["Dominican Republic", 53, "caribbean", "new-york"],
    ["Venezuela", 38, "latin-america", "miami"],
    ["Haiti", 32, "caribbean", "miami"],
  ])},
];

// ---------------------------------------------------------------------------
// Aggregates that the visualization derives at runtime.
// ---------------------------------------------------------------------------

const REGION_LABEL: Record<Region, string> = {
  "latin-america": "Latin America",
  "asia": "Asia",
  "europe": "Europe",
  "africa": "Africa",
  "caribbean": "Caribbean",
  "north-america": "North America",
  "oceania": "Oceania",
  "middle-east": "Middle East",
};

export function regionLabel(r: Region): string {
  return REGION_LABEL[r];
}

export function regionTotals(year: YearRecord): Array<{ region: Region; count: number }> {
  const map = new Map<Region, number>();
  for (const s of year.sources) {
    map.set(s.region, (map.get(s.region) ?? 0) + s.count);
  }
  return Array.from(map.entries()).map(([region, count]) => ({ region, count })).sort((a, b) => b.count - a.count);
}

export const YEAR_MIN = POST_1965_DATA[0].year;
export const YEAR_MAX = POST_1965_DATA[POST_1965_DATA.length - 1].year;

export function getYear(year: number): YearRecord {
  const clamped = Math.max(YEAR_MIN, Math.min(YEAR_MAX, Math.round(year)));
  return POST_1965_DATA.find((d) => d.year === clamped) ?? POST_1965_DATA[0];
}

// ---------------------------------------------------------------------------
// Counterfactual: what immigration would look like if the 1965 Hart–Celler
// Act had never passed and the 1924 National Origins quota system had been
// preserved indefinitely (as the 1952 McCarran–Walter Act in fact did until
// 1965).
//
// Under those quotas: ~150K admissions/year, with ~70% of slots reserved
// for Northern/Western Europe (UK, Germany, Ireland) and effectively a
// closed door to Asia (China=105 slots/yr, Japan=100 slots/yr, Asia-Pacific
// Triangle=2K total). Mexico was outside the quota but politically capped.
//
// Refugee admissions (Cuban, Vietnamese, Soviet) are kept because the
// Refugee Act of 1980 — and its precursors — were administered separately
// from the quota system. Volumes are reduced because without 1965 the
// political appetite for refugee parole was lower.
// ---------------------------------------------------------------------------
export function counterfactualSourcesFor(year: number): SourceFlow[] {
  const base: SourceFlow[] = [
    { country: "United Kingdom", count: 32, region: "europe", gateway: "new-york" },
    { country: "Germany",        count: 26, region: "europe", gateway: "new-york" },
    { country: "Ireland",        count: 17, region: "europe", gateway: "boston" },
    { country: "Italy",          count: 6,  region: "europe", gateway: "new-york" },
    { country: "Poland",         count: 5,  region: "europe", gateway: "chicago" },
    { country: "Canada",         count: 20, region: "north-america", gateway: "new-york" },
    { country: "Mexico",         count: 14, region: "latin-america", gateway: "el-paso" },
  ];
  // Refugee waves — additive, outside the quota.
  if (year >= 1965 && year <= 1973) {
    base.push({ country: "Cuba", count: 12, region: "caribbean", gateway: "miami" });
  }
  if (year >= 1975 && year <= 1981) {
    base.push({ country: "Vietnam", count: 18, region: "asia", gateway: "los-angeles" });
  }
  if (year >= 1980 && year <= 1981) {
    // Mariel — even a counterfactual U.S. would have accepted these arrivals.
    base.push({ country: "Cuba", count: 38, region: "caribbean", gateway: "miami" });
  }
  if (year >= 1989 && year <= 1995) {
    base.push({ country: "Soviet Union", count: 22, region: "europe", gateway: "new-york" });
  }
  if (year >= 2022 && year <= YEAR_MAX) {
    base.push({ country: "Ukraine", count: 18, region: "europe", gateway: "new-york" });
  }
  return base;
}

export function counterfactualTotalFor(year: number): number {
  return Math.round(counterfactualSourcesFor(year).reduce((s, c) => s + c.count, 0));
}

// ---------------------------------------------------------------------------
// Supplemental immigration flows — the long tail of source countries that
// don't make any year's top-8 list but were persistently meaningful streams
// of immigration. Adding them densifies the map (more flights in the air,
// more corridors active at once) and makes the global picture honest:
// post-1965 immigration was never just "Mexico + China + India + Cuba" —
// it was dozens of streams in parallel.
//
// Counts are annual averages (thousands) for the era; the corridor
// accumulator treats them like any other flow.
// ---------------------------------------------------------------------------
export function supplementalFlowsForYear(year: number): SourceFlow[] {
  const flows: SourceFlow[] = [];

  // 1965 – 1980 — late "European" tail, early Asia/Latin America re-openings.
  if (year >= 1965 && year < 1980) {
    flows.push(
      { country: "Greece",       count: 12, region: "europe",       gateway: "new-york" },
      { country: "Portugal",     count: 10, region: "europe",       gateway: "boston" },
      { country: "Yugoslavia",   count: 6,  region: "europe",       gateway: "chicago" },
      { country: "Hong Kong",    count: 9,  region: "asia",         gateway: "san-francisco" },
      { country: "Taiwan",       count: 7,  region: "asia",         gateway: "los-angeles" },
      { country: "Colombia",     count: 9,  region: "latin-america",gateway: "miami" },
      { country: "Argentina",    count: 4,  region: "latin-america",gateway: "miami" },
      { country: "Lebanon",      count: 5,  region: "middle-east",  gateway: "los-angeles" },
      { country: "Egypt",        count: 3,  region: "africa",       gateway: "new-york" },
      { country: "Jamaica",      count: 14, region: "caribbean",    gateway: "new-york" },
      { country: "Haiti",        count: 7,  region: "caribbean",    gateway: "miami" },
    );
  }

  // 1980 – 2000 — Cold War refugees, post-revolution flows, IRCA aftermath.
  if (year >= 1980 && year < 2000) {
    flows.push(
      { country: "Pakistan",     count: 9,  region: "asia",         gateway: "new-york" },
      { country: "Bangladesh",   count: 5,  region: "asia",         gateway: "new-york" },
      { country: "Hong Kong",    count: 11, region: "asia",         gateway: "san-francisco" },
      { country: "Taiwan",       count: 9,  region: "asia",         gateway: "los-angeles" },
      { country: "Thailand",     count: 5,  region: "asia",         gateway: "los-angeles" },
      { country: "Iran",         count: 13, region: "middle-east",  gateway: "los-angeles" },
      { country: "Lebanon",      count: 6,  region: "middle-east",  gateway: "los-angeles" },
      { country: "Iraq",         count: 4,  region: "middle-east",  gateway: "chicago" },
      { country: "Romania",      count: 5,  region: "europe",       gateway: "new-york" },
      { country: "Yugoslavia",   count: 7,  region: "europe",       gateway: "chicago" },
      { country: "Poland",       count: 9,  region: "europe",       gateway: "chicago" },
      { country: "Colombia",     count: 16, region: "latin-america",gateway: "miami" },
      { country: "Peru",         count: 9,  region: "latin-america",gateway: "miami" },
      { country: "Ecuador",      count: 7,  region: "latin-america",gateway: "miami" },
      { country: "Brazil",       count: 6,  region: "latin-america",gateway: "miami" },
      { country: "Guatemala",    count: 8,  region: "latin-america",gateway: "los-angeles" },
      { country: "Honduras",     count: 5,  region: "latin-america",gateway: "houston" },
      { country: "Jamaica",      count: 20, region: "caribbean",    gateway: "new-york" },
      { country: "Haiti",        count: 14, region: "caribbean",    gateway: "miami" },
      { country: "Ethiopia",     count: 4,  region: "africa",       gateway: "washington-dc" },
      { country: "Nigeria",      count: 5,  region: "africa",       gateway: "new-york" },
      { country: "Ghana",        count: 3,  region: "africa",       gateway: "new-york" },
    );
  }

  // 2000 – present — Africa rises, Middle East persists, South Asia surges.
  if (year >= 2000) {
    flows.push(
      { country: "Pakistan",     count: 18, region: "asia",         gateway: "new-york" },
      { country: "Bangladesh",   count: 13, region: "asia",         gateway: "new-york" },
      { country: "Burma",        count: 9,  region: "asia",         gateway: "los-angeles" },
      { country: "Thailand",     count: 6,  region: "asia",         gateway: "los-angeles" },
      { country: "Taiwan",       count: 8,  region: "asia",         gateway: "los-angeles" },
      { country: "Iran",         count: 10, region: "middle-east",  gateway: "los-angeles" },
      { country: "Iraq",         count: 11, region: "middle-east",  gateway: "chicago" },
      { country: "Lebanon",      count: 4,  region: "middle-east",  gateway: "los-angeles" },
      { country: "Syria",        count: 5,  region: "middle-east",  gateway: "chicago" },
      { country: "Egypt",        count: 8,  region: "africa",       gateway: "new-york" },
      { country: "Nigeria",      count: 14, region: "africa",       gateway: "houston" },
      { country: "Ethiopia",     count: 10, region: "africa",       gateway: "washington-dc" },
      { country: "Ghana",        count: 6,  region: "africa",       gateway: "new-york" },
      { country: "Kenya",        count: 5,  region: "africa",       gateway: "washington-dc" },
      { country: "Somalia",      count: 4,  region: "africa",       gateway: "washington-dc" },
      { country: "Colombia",     count: 20, region: "latin-america",gateway: "miami" },
      { country: "Peru",         count: 11, region: "latin-america",gateway: "miami" },
      { country: "Brazil",       count: 13, region: "latin-america",gateway: "miami" },
      { country: "Ecuador",      count: 9,  region: "latin-america",gateway: "miami" },
      { country: "Guatemala",    count: 14, region: "latin-america",gateway: "los-angeles" },
      { country: "Honduras",     count: 12, region: "latin-america",gateway: "houston" },
      { country: "Jamaica",      count: 18, region: "caribbean",    gateway: "new-york" },
      { country: "Haiti",        count: 21, region: "caribbean",    gateway: "miami" },
      { country: "Poland",       count: 7,  region: "europe",       gateway: "chicago" },
      { country: "Ukraine",      count: 9,  region: "europe",       gateway: "new-york" },
    );
  }

  return flows;
}
