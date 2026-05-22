import surnameOrigins from "@/data/surname-origins.json";
import migrationWaves from "@/data/migration-waves.json";

type SurnameOrigin = {
  country: string;
  region?: string;
  notes?: string;
};

type MigrationWave = {
  typicalPorts: string[];
  settlementRegions: string[];
  keyYears: number[];
  narrative: string;
};

const origins = surnameOrigins as Record<string, SurnameOrigin>;
const waves = migrationWaves as Record<string, MigrationWave>;

// Small lookup of places → modern country. Used when a real profile's
// birthPlace string contains a region/city we should map to a country.
const PLACE_TO_COUNTRY: Array<{ pattern: RegExp; country: string }> = [
  { pattern: /\b(Poland|Polska|Warsaw|Warszawa|Warszawskie|Krakow|Krak[oó]w|Cracow|Lodz|Łódź|Gdansk|Gdańsk|Wroclaw|Wrocław|Posen|Pozna[nń]|Galicia)\b/i, country: "Poland" },
  { pattern: /\b(Germany|Deutschland|Bavaria|Bayern|Baden|Württemberg|Wuerttemberg|Saxony|Sachsen|Prussia|Preußen|Preussen|Hamburg|Berlin|Munich|München|Cologne|Köln|Frankfurt|Dresden|Leipzig|Stuttgart|Heidelberg|Hannover|Bremen|Königsfeld|Villingen|Schwarzwald)\b/i, country: "Germany" },
  { pattern: /\b(France|Paris|Lyon|Lyons|Marseille|Marseilles|Bordeaux|Normandy|Normandie|Provence|Alsace|Lorraine|Toulouse|Nice|Strasbourg)\b/i, country: "France" },
  { pattern: /\b(Italy|Italia|Rome|Roma|Milan|Milano|Naples|Napoli|Sicily|Sicilia|Tuscany|Toscana|Venice|Venezia|Florence|Firenze|Turin|Torino|Genoa|Genova|Calabria|Apulia)\b/i, country: "Italy" },
  { pattern: /\b(Ireland|Éire|Eire|Dublin|Cork|Galway|Belfast|Limerick|Donegal|Munster|Leinster|Connacht|Ulster)\b/i, country: "Ireland" },
  { pattern: /\b(Scotland|Edinburgh|Glasgow|Aberdeen|Ayrshire|Highlands|Dundee|Fife|Inverness|Lothian)\b/i, country: "Scotland" },
  { pattern: /\b(England|London|Liverpool|Manchester|Yorkshire|Cornwall|Devon|Birmingham|Leeds|Sheffield|Bristol|Newcastle|Lancashire|Sussex|Kent|Lichfield|Staffordshire)\b/i, country: "England" },
  { pattern: /\b(Wales|Cymru|Cardiff|Swansea|Glamorgan|Gwynedd)\b/i, country: "Wales" },
  { pattern: /\b(United Kingdom|Britain|British Isles|U\.K\.|UK)\b/i, country: "United Kingdom" },
  { pattern: /\b(Austria|Österreich|Oesterreich|Vienna|Wien|Salzburg|Tyrol|Tirol|Graz|Linz)\b/i, country: "Austria" },
  { pattern: /\b(Hungary|Magyarország|Magyarorszag|Budapest|Debrecen|Szeged)\b/i, country: "Hungary" },
  { pattern: /\b(Czech|Bohemia|Moravia|Prague|Praha|Brno|Olomouc|Plzeň|Plzen)\b/i, country: "Czechia" },
  { pattern: /\b(Slovakia|Bratislava|Košice|Kosice)\b/i, country: "Slovakia" },
  { pattern: /\b(Switzerland|Schweiz|Suisse|Zurich|Zürich|Geneva|Bern|Basel|Lausanne)\b/i, country: "Switzerland" },
  { pattern: /\b(Belgium|Belgique|Brussels|Bruxelles|Antwerp|Antwerpen|Flanders|Wallonia)\b/i, country: "Belgium" },
  { pattern: /\b(India|Bharat|Gujarat|Punjab|Bengal|Mumbai|Bombay|Delhi|Calcutta|Kolkata|Chennai|Madras|Bangalore|Hyderabad|Tamil Nadu|Kerala|Maharashtra|Rajasthan)\b/i, country: "India" },
  { pattern: /\b(China|中国|Beijing|Peking|Shanghai|Guangdong|Canton|Hong Kong|Taiwan|Sichuan|Fujian|Tianjin|Chengdu)\b/i, country: "China" },
  { pattern: /\b(Japan|日本|Tokyo|Osaka|Kyoto|Yokohama|Nagoya|Hiroshima|Sapporo|Kobe|Ueno)\b/i, country: "Japan" },
  { pattern: /\b(South Korea|Republic of Korea|대한민국|Seoul|Busan|Incheon|Daegu)\b/i, country: "South Korea" },
  { pattern: /\b(Korea|조선|Pyongyang)\b/i, country: "Korea" },
  { pattern: /\b(Mexico|México|Ciudad de México|Mexico City|Jalisco|Oaxaca|Sonora|Guadalajara|Monterrey|Puebla|Yucatán|Yucatan)\b/i, country: "Mexico" },
  { pattern: /\b(Philippines|Pilipinas|Manila|Cebu|Luzon|Mindanao|Quezon City|Davao)\b/i, country: "Philippines" },
  { pattern: /\b(Vietnam|Việt Nam|Hanoi|Hà Nội|Saigon|Sài Gòn|Ho Chi Minh|Da Nang|Đà Nẵng)\b/i, country: "Vietnam" },
  { pattern: /\b(Russia|Россия|Rossiya|Moscow|Moskva|St\.?\s*Petersburg|Sankt-Peterburg|Petersburg|Petrograd|Leningrad|Yekaterinburg|Novosibirsk|Volgograd|Kazan)\b/i, country: "Russia" },
  { pattern: /\b(Ukraine|Україна|Ukrayina|Kyiv|Kiev|Lviv|Lvov|Odesa|Odessa|Kharkiv|Kharkov)\b/i, country: "Ukraine" },
  { pattern: /\b(Spain|España|Espana|Madrid|Barcelona|Catalonia|Catalu[ñn]a|Andalusia|Andalucía|Valencia|Seville|Sevilla|Galicia)\b/i, country: "Spain" },
  { pattern: /\b(Portugal|Lisbon|Lisboa|Porto|Coimbra|Braga|Madeira|Açores|Azores)\b/i, country: "Portugal" },
  { pattern: /\b(Greece|Hellas|Ελλάδα|Athens|Athína|Thessaloniki|Crete|Kriti|Patras)\b/i, country: "Greece" },
  { pattern: /\b(Sweden|Sverige|Stockholm|Gothenburg|Göteborg|Malmö|Malmo)\b/i, country: "Sweden" },
  { pattern: /\b(Norway|Norge|Oslo|Bergen|Trondheim|Stavanger)\b/i, country: "Norway" },
  { pattern: /\b(Denmark|Danmark|Copenhagen|København|Aarhus|Odense)\b/i, country: "Denmark" },
  { pattern: /\b(Finland|Suomi|Helsinki|Tampere|Turku)\b/i, country: "Finland" },
  { pattern: /\b(Netherlands|Holland|Amsterdam|Rotterdam|The Hague|Den Haag|Utrecht|Eindhoven)\b/i, country: "Netherlands" },
  { pattern: /\b(Romania|România|Bucharest|București|Cluj|Timișoara|Timisoara|Transylvania)\b/i, country: "Romania" },
  { pattern: /\b(Bulgaria|България|Sofia|Plovdiv)\b/i, country: "Bulgaria" },
  { pattern: /\b(Serbia|Србија|Belgrade|Beograd|Novi Sad)\b/i, country: "Serbia" },
  { pattern: /\b(Croatia|Hrvatska|Zagreb|Split|Dubrovnik)\b/i, country: "Croatia" },
  { pattern: /\b(Turkey|Türkiye|Turkiye|Istanbul|İstanbul|Ankara|Constantinople|Smyrna|Izmir)\b/i, country: "Turkey" },
  { pattern: /\b(Egypt|مصر|Cairo|Alexandria|Giza)\b/i, country: "Egypt" },
  { pattern: /\b(Nigeria|Lagos|Abuja|Kano|Ibadan)\b/i, country: "Nigeria" },
  { pattern: /\b(Ethiopia|Addis Ababa|Eritrea|Asmara)\b/i, country: "Ethiopia" },
  { pattern: /\b(Kenya|Nairobi|Mombasa)\b/i, country: "Kenya" },
  { pattern: /\b(South Africa|Johannesburg|Cape Town|Durban|Pretoria)\b/i, country: "South Africa" },
  { pattern: /\b(Israel|ישראל|Tel Aviv|Jerusalem|Haifa|Yerushalayim)\b/i, country: "Israel" },
  { pattern: /\b(Lebanon|لبنان|Beirut|Bayrut)\b/i, country: "Lebanon" },
  { pattern: /\b(Syria|سوريا|Damascus|Aleppo|Halab)\b/i, country: "Syria" },
  { pattern: /\b(Iran|ایران|Tehran|Isfahan|Shiraz|Persia)\b/i, country: "Iran" },
  { pattern: /\b(Iraq|العراق|Baghdad|Basra|Mosul)\b/i, country: "Iraq" },
  { pattern: /\b(Pakistan|پاکستان|Karachi|Lahore|Islamabad)\b/i, country: "Pakistan" },
  { pattern: /\b(Bangladesh|বাংলাদেশ|Dhaka|Chittagong)\b/i, country: "Bangladesh" },
  { pattern: /\b(Cuba|Havana|La Habana|Santiago de Cuba)\b/i, country: "Cuba" },
  { pattern: /\b(Brazil|Brasil|Rio de Janeiro|São Paulo|Sao Paulo|Salvador|Brasília|Brasilia)\b/i, country: "Brazil" },
  { pattern: /\b(Argentina|Buenos Aires|Córdoba|Cordoba|Rosario)\b/i, country: "Argentina" },
  { pattern: /\b(Colombia|Bogotá|Bogota|Medellín|Medellin|Cali)\b/i, country: "Colombia" },
  { pattern: /\b(Canada|Ontario|Quebec|Québec|British Columbia|Alberta|Toronto|Montreal|Vancouver|Ottawa|Nova Scotia)\b/i, country: "Canada" },
  { pattern: /\b(Australia|Sydney|Melbourne|Brisbane|Perth|Adelaide|Queensland|Victoria|New South Wales|Tasmania)\b/i, country: "Australia" },
  { pattern: /\b(New Zealand|Auckland|Wellington|Christchurch|Aotearoa)\b/i, country: "New Zealand" },
  // United States – check last so foreign places win
  { pattern: /\b(United States|USA|U\.S\.A?\.?|America)\b/i, country: "United States" },
];

const US_STATES =
  /\b(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)\b/;

export function inferCountryFromPlace(
  place?: string
): { country: string; region?: string } | null {
  if (!place) return null;
  for (const { pattern, country } of PLACE_TO_COUNTRY) {
    if (pattern.test(place)) {
      const region = place.split(",")[0]?.trim();
      return { country, region: region && region !== country ? region : undefined };
    }
  }
  if (US_STATES.test(place)) {
    return { country: "United States", region: place.split(",")[0]?.trim() };
  }
  return null;
}

export function inferOriginFromSurname(surname: string): SurnameOrigin | null {
  const key = surname.toLowerCase().replace(/[^a-z']/g, "");
  return origins[key] ?? null;
}

export function resolveCountry(
  surname: string,
  country?: string,
  options?: { birthPlace?: string }
): { country: string; region?: string; inferred: boolean } {
  if (country) return { country, inferred: false };

  const fromPlace = inferCountryFromPlace(options?.birthPlace);
  if (fromPlace) {
    return { country: fromPlace.country, region: fromPlace.region, inferred: false };
  }

  const origin = inferOriginFromSurname(surname);
  if (origin) {
    return { country: origin.country, region: origin.region, inferred: true };
  }
  return { country: "United States", inferred: true };
}

export function getMigrationWave(country: string): MigrationWave {
  return waves[country] ?? waves.default;
}

export function decadeToYear(decade?: string): number {
  if (!decade) return 1972;
  const fourDigit = decade.match(/((?:18|19|20)\d{2})/);
  if (fourDigit) return parseInt(fourDigit[1], 10) + 2;
  return 1972;
}
