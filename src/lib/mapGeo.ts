import countryCoords from "@/data/country-coordinates.json";
import { inferCountryFromPlace } from "@/lib/surnameOrigin";

export type LatLng = { lat: number; lng: number };

const coords = countryCoords as Record<string, LatLng>;

const CITY_COORDS: Record<string, LatLng> = {
  // US — kept from original
  "New York": { lat: 40.7128, lng: -74.006 },
  "Ellis Island": { lat: 40.6994, lng: -74.0396 },
  "San Francisco": { lat: 37.7749, lng: -122.4194 },
  "Los Angeles": { lat: 34.0522, lng: -118.2437 },
  California: { lat: 36.7783, lng: -119.4179 },
  Virginia: { lat: 37.4316, lng: -78.6569 },
  "Virginia Colony": { lat: 37.4316, lng: -78.6569 },
  "El Paso": { lat: 31.7619, lng: -106.485 },
  Chicago: { lat: 41.8781, lng: -87.6298 },
  Boston: { lat: 42.3601, lng: -71.0589 },
  Seattle: { lat: 47.6062, lng: -122.3321 },
  Texas: { lat: 31.9686, lng: -99.9018 },
  "New Jersey": { lat: 40.0583, lng: -74.4057 },
  Pennsylvania: { lat: 41.2033, lng: -77.1945 },
  Maryland: { lat: 39.0458, lng: -76.6413 },
  Hawaii: { lat: 19.8968, lng: -155.5828 },
  "Washington, D.C.": { lat: 38.9072, lng: -77.0369 },
  Philadelphia: { lat: 39.9526, lng: -75.1652 },
  Detroit: { lat: 42.3314, lng: -83.0458 },
  Cleveland: { lat: 41.4993, lng: -81.6944 },
  Baltimore: { lat: 39.2904, lng: -76.6122 },
  Atlanta: { lat: 33.749, lng: -84.388 },

  // Europe
  Warsaw: { lat: 52.2297, lng: 21.0122 },
  Krakow: { lat: 50.0647, lng: 19.945 },
  Lodz: { lat: 51.7592, lng: 19.456 },
  Gdansk: { lat: 54.352, lng: 18.6466 },
  Wroclaw: { lat: 51.1079, lng: 17.0385 },
  Poznan: { lat: 52.4064, lng: 16.9252 },
  Kielce: { lat: 50.8661, lng: 20.6286 },
  Lublin: { lat: 51.2465, lng: 22.5684 },

  Paris: { lat: 48.8566, lng: 2.3522 },
  Lyon: { lat: 45.764, lng: 4.8357 },
  Marseille: { lat: 43.2965, lng: 5.3698 },
  Bordeaux: { lat: 44.8378, lng: -0.5792 },
  Nice: { lat: 43.7102, lng: 7.262 },
  Strasbourg: { lat: 48.5734, lng: 7.7521 },

  Berlin: { lat: 52.52, lng: 13.405 },
  Munich: { lat: 48.1351, lng: 11.582 },
  Hamburg: { lat: 53.5511, lng: 9.9937 },
  Frankfurt: { lat: 50.1109, lng: 8.6821 },
  Cologne: { lat: 50.9375, lng: 6.9603 },
  Stuttgart: { lat: 48.7758, lng: 9.1829 },
  Dresden: { lat: 51.0504, lng: 13.7373 },
  Leipzig: { lat: 51.3397, lng: 12.3731 },
  Hannover: { lat: 52.3759, lng: 9.732 },
  Bremen: { lat: 53.0793, lng: 8.8017 },
  Heidelberg: { lat: 49.3988, lng: 8.6724 },
  Ulm: { lat: 48.3984, lng: 9.9916 },
  Königsfeld: { lat: 48.123, lng: 8.357 },
  Villingen: { lat: 48.0608, lng: 8.4596 },
  Baden: { lat: 48.6669, lng: 8.2519 },
  Bavaria: { lat: 48.7904, lng: 11.4979 },
  Saxony: { lat: 51.1045, lng: 13.2017 },

  London: { lat: 51.5074, lng: -0.1278 },
  Liverpool: { lat: 53.4084, lng: -2.9916 },
  Manchester: { lat: 53.4808, lng: -2.2426 },
  Birmingham: { lat: 52.4862, lng: -1.8904 },
  Edinburgh: { lat: 55.9533, lng: -3.1883 },
  Glasgow: { lat: 55.8642, lng: -4.2518 },
  Dublin: { lat: 53.3498, lng: -6.2603 },
  Cork: { lat: 51.8985, lng: -8.4756 },
  Belfast: { lat: 54.5973, lng: -5.9301 },
  Cardiff: { lat: 51.4816, lng: -3.1791 },

  Rome: { lat: 41.9028, lng: 12.4964 },
  Milan: { lat: 45.4642, lng: 9.19 },
  Naples: { lat: 40.8518, lng: 14.2681 },
  Florence: { lat: 43.7696, lng: 11.2558 },
  Venice: { lat: 45.4408, lng: 12.3155 },
  Turin: { lat: 45.0703, lng: 7.6869 },
  Genoa: { lat: 44.4056, lng: 8.9463 },
  Palermo: { lat: 38.1157, lng: 13.3615 },

  Madrid: { lat: 40.4168, lng: -3.7038 },
  Barcelona: { lat: 41.3851, lng: 2.1734 },
  Seville: { lat: 37.3891, lng: -5.9845 },
  Lisbon: { lat: 38.7223, lng: -9.1393 },
  Porto: { lat: 41.1579, lng: -8.6291 },
  Athens: { lat: 37.9838, lng: 23.7275 },

  Amsterdam: { lat: 52.3676, lng: 4.9041 },
  Rotterdam: { lat: 51.9244, lng: 4.4777 },
  Brussels: { lat: 50.8503, lng: 4.3517 },
  Vienna: { lat: 48.2082, lng: 16.3738 },
  Salzburg: { lat: 47.8095, lng: 13.055 },
  Budapest: { lat: 47.4979, lng: 19.0402 },
  Prague: { lat: 50.0755, lng: 14.4378 },
  Bucharest: { lat: 44.4268, lng: 26.1025 },
  Sofia: { lat: 42.6977, lng: 23.3219 },
  Belgrade: { lat: 44.7866, lng: 20.4489 },
  Zagreb: { lat: 45.815, lng: 15.9819 },

  Stockholm: { lat: 59.3293, lng: 18.0686 },
  Oslo: { lat: 59.9139, lng: 10.7522 },
  Copenhagen: { lat: 55.6761, lng: 12.5683 },
  Helsinki: { lat: 60.1699, lng: 24.9384 },

  Zurich: { lat: 47.3769, lng: 8.5417 },
  Geneva: { lat: 46.2044, lng: 6.1432 },
  Bern: { lat: 46.948, lng: 7.4474 },

  Moscow: { lat: 55.7558, lng: 37.6173 },
  "St. Petersburg": { lat: 59.9343, lng: 30.3351 },
  Kyiv: { lat: 50.4501, lng: 30.5234 },
  Lviv: { lat: 49.8397, lng: 24.0297 },
  Odesa: { lat: 46.4825, lng: 30.7233 },

  Istanbul: { lat: 41.0082, lng: 28.9784 },
  Ankara: { lat: 39.9334, lng: 32.8597 },

  // Asia
  Beijing: { lat: 39.9042, lng: 116.4074 },
  Shanghai: { lat: 31.2304, lng: 121.4737 },
  Guangzhou: { lat: 23.1291, lng: 113.2644 },
  "Hong Kong": { lat: 22.3193, lng: 114.1694 },
  Taipei: { lat: 25.033, lng: 121.5654 },
  Tokyo: { lat: 35.6762, lng: 139.6503 },
  Osaka: { lat: 34.6937, lng: 135.5023 },
  Kyoto: { lat: 35.0116, lng: 135.7681 },
  Seoul: { lat: 37.5665, lng: 126.978 },
  Busan: { lat: 35.1796, lng: 129.0756 },
  Manila: { lat: 14.5995, lng: 120.9842 },
  Hanoi: { lat: 21.0285, lng: 105.8542 },
  "Ho Chi Minh City": { lat: 10.8231, lng: 106.6297 },
  Bangkok: { lat: 13.7563, lng: 100.5018 },
  Singapore: { lat: 1.3521, lng: 103.8198 },
  "New Delhi": { lat: 28.6139, lng: 77.209 },
  Mumbai: { lat: 19.076, lng: 72.8777 },
  Kolkata: { lat: 22.5726, lng: 88.3639 },
  Chennai: { lat: 13.0827, lng: 80.2707 },
  Bangalore: { lat: 12.9716, lng: 77.5946 },
  Hyderabad: { lat: 17.385, lng: 78.4867 },
  Karachi: { lat: 24.8607, lng: 67.0011 },
  Lahore: { lat: 31.5204, lng: 74.3587 },
  Dhaka: { lat: 23.8103, lng: 90.4125 },
  Tehran: { lat: 35.6892, lng: 51.389 },
  Baghdad: { lat: 33.3152, lng: 44.3661 },
  Jerusalem: { lat: 31.7683, lng: 35.2137 },
  "Tel Aviv": { lat: 32.0853, lng: 34.7818 },
  Beirut: { lat: 33.8938, lng: 35.5018 },
  Damascus: { lat: 33.5138, lng: 36.2765 },

  // Africa
  Cairo: { lat: 30.0444, lng: 31.2357 },
  Alexandria: { lat: 31.2001, lng: 29.9187 },
  Lagos: { lat: 6.5244, lng: 3.3792 },
  "Addis Ababa": { lat: 9.03, lng: 38.7469 },
  Nairobi: { lat: -1.2921, lng: 36.8219 },
  Johannesburg: { lat: -26.2041, lng: 28.0473 },
  "Cape Town": { lat: -33.9249, lng: 18.4241 },

  // Americas
  "Mexico City": { lat: 19.4326, lng: -99.1332 },
  Havana: { lat: 23.1136, lng: -82.3666 },
  "Rio de Janeiro": { lat: -22.9068, lng: -43.1729 },
  "São Paulo": { lat: -23.5505, lng: -46.6333 },
  "Buenos Aires": { lat: -34.6037, lng: -58.3816 },
  Bogota: { lat: 4.711, lng: -74.0721 },
  Toronto: { lat: 43.6532, lng: -79.3832 },
  Montreal: { lat: 45.5017, lng: -73.5673 },
  Vancouver: { lat: 49.2827, lng: -123.1207 },

  Sydney: { lat: -33.8688, lng: 151.2093 },
  Melbourne: { lat: -37.8136, lng: 144.9631 },
  Auckland: { lat: -36.8485, lng: 174.7633 },
};

// Native-language → English aliases so coord lookup works regardless of
// what spelling appeared in the source record.
const PLACE_ALIASES: Record<string, string> = {
  // Polish
  Warszawa: "Warsaw",
  Kraków: "Krakow",
  Łódź: "Lodz",
  Gdańsk: "Gdansk",
  Wrocław: "Wroclaw",
  Poznań: "Poznan",
  Polska: "Poland",
  // German
  München: "Munich",
  Köln: "Cologne",
  Wien: "Vienna",
  Bayern: "Bavaria",
  Sachsen: "Saxony",
  Deutschland: "Germany",
  Österreich: "Austria",
  Oesterreich: "Austria",
  // French
  Lyons: "Lyon",
  Marseilles: "Marseille",
  // Italian / Latin
  Roma: "Rome",
  Milano: "Milan",
  Napoli: "Naples",
  Firenze: "Florence",
  Venezia: "Venice",
  Torino: "Turin",
  Genova: "Genoa",
  Italia: "Italy",
  // Spanish / Portuguese
  Sevilla: "Seville",
  Bruxelles: "Brussels",
  Lisboa: "Lisbon",
  // Czech / Slovak
  Praha: "Prague",
  // Russian / Ukrainian transliteration
  Moskva: "Moscow",
  "Sankt-Peterburg": "St. Petersburg",
  Kiev: "Kyiv",
  Lvov: "Lviv",
  Odessa: "Odesa",
  // Various
  Saigon: "Ho Chi Minh City",
  "Sài Gòn": "Ho Chi Minh City",
  "Hà Nội": "Hanoi",
  Bombay: "Mumbai",
  Calcutta: "Kolkata",
  Madras: "Chennai",
  Peking: "Beijing",
  Tokio: "Tokyo",
  "México": "Mexico City",
  "Ciudad de México": "Mexico City",
  Bogotá: "Bogota",
  "São Paulo": "São Paulo",
};

const REGION_COORDS: Record<string, LatLng> = {
  Gujarat: { lat: 22.2587, lng: 71.1924 },
  Punjab: { lat: 31.1471, lng: 75.3412 },
  "North India": { lat: 28.6139, lng: 77.209 },
  Sonora: { lat: 29.2975, lng: -110.3309 },
  Warszawskie: { lat: 52.2297, lng: 21.0122 },
  Bayern: { lat: 48.7904, lng: 11.4979 },
};

const NON_GEO_PLACES = new Set([
  "United States",
  "U.S.",
  "America",
]);

function normalize(part: string): string {
  return PLACE_ALIASES[part] ?? part;
}

export function resolvePlace(place: string): LatLng | null {
  const trimmed = place.trim();
  if (!trimmed || NON_GEO_PLACES.has(trimmed)) return null;

  // Try the whole string first (lets aliased entries hit directly).
  const whole = normalize(trimmed);
  if (CITY_COORDS[whole]) return CITY_COORDS[whole];
  if (REGION_COORDS[whole]) return REGION_COORDS[whole];
  if (coords[whole]) return coords[whole];

  // Then walk each comma-separated part, most specific first.
  const parts = trimmed
    .split(",")
    .map((p) => normalize(p.trim()))
    .filter(Boolean);

  for (const part of parts) {
    if (CITY_COORDS[part]) return CITY_COORDS[part];
    if (REGION_COORDS[part]) return REGION_COORDS[part];
    if (coords[part]) return coords[part];
  }

  // Case-insensitive country fallback.
  for (const part of parts) {
    const key = Object.keys(coords).find(
      (k) => k.toLowerCase() === part.toLowerCase()
    );
    if (key) return coords[key];
  }

  // Last resort: infer a country from the full string via the place regex
  // and use that country's center.
  const inferred = inferCountryFromPlace(trimmed)?.country;
  if (inferred && coords[inferred]) return coords[inferred];

  return null;
}

export function toGeoJsonPoint(c: LatLng): [number, number] {
  return [c.lng, c.lat];
}

export function shortPlaceLabel(place: string): string {
  const parts = place.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return place;
  // Prefer the most specific (first) part — that's the city/town name.
  const head = normalize(parts[0]);
  if (parts.length === 1) return head;
  return head;
}
