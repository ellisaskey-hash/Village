// Live ingestion (spec 08 stage 1). Fetches real sources — OpenStreetMap Overpass, FSA FHRS,
// and Companies House (key-gated) — and runs them through the pure transformers in ./index.
// Network only; NO database writes. The Node runner (scripts/db/ingest-horsmonden.mjs) and the
// Vercel function (api/seed-ingest.ts) both call runLiveIngestion, so there is one code path.
import {
  ingestCompaniesHouse,
  ingestFhrs,
  ingestOverpass,
  type CompaniesHouseItem,
  type FhrsEstablishment,
  type OverpassElement,
  type SeedProposalDraft,
} from './index';

export interface LiveIngestConfig {
  name: string; // community display name, e.g. "Horsmonden"
  lat: number; // centre for the Overpass radius query
  lon: number;
  radiusMetres: number; // e.g. 2500
  fhrsQuery: string; // FHRS free-text address, e.g. "Horsmonden"
  /** Postcode districts to keep, e.g. ["TN12"]. FHRS address search is fuzzy (it matches
   *  "Horsenden" in Perivale for "Horsmonden"), so results are filtered to these. */
  postcodeDistricts?: string[];
  companiesHouseKey?: string | undefined; // Companies House REST key, or undefined → skipped
  fetchImpl?: typeof fetch; // injectable for tests
}

// Overpass and some public APIs 406/403 a request with no User-Agent — always send one.
const UA = 'LocalOS-seed/1.0 (community directory seeding; contact: updates@thelocal)';

/** Outward postcode district from a full UK postcode, e.g. "TN12 8LH" → "TN12". */
export function postcodeDistrict(pc: string): string {
  const s = (pc || '').replace(/\s+/g, '').toUpperCase();
  return s.length <= 3 ? s : s.slice(0, -3);
}

export interface SourceReport {
  source: string;
  ok: boolean;
  rawCount: number;
  draftCount: number;
  note?: string;
}

export interface LiveIngestResult {
  drafts: SeedProposalDraft[];
  reports: SourceReport[];
}

// Public Overpass instances are frequently busy (504) or rate-limited (429); try a few.
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];
const FHRS_ENDPOINT = 'https://api.ratings.food.gov.uk/Establishments';
const CH_ENDPOINT = 'https://api.company-information.service.gov.uk/search/companies';

function overpassQuery(lat: number, lon: number, r: number): string {
  const a = `(around:${r},${lat},${lon})`;
  // Named amenities/shops/leisure only; `out center tags` gives ways a centroid for pinning.
  return `[out:json][timeout:30];(` +
    `node["amenity"]${a};way["amenity"]${a};` +
    `node["shop"]${a};way["shop"]${a};` +
    `node["leisure"]${a};way["leisure"]${a};` +
    `);out center tags;`;
}

export async function fetchOverpass(cfg: LiveIngestConfig): Promise<OverpassElement[]> {
  const f = cfg.fetchImpl ?? fetch;
  const body = 'data=' + encodeURIComponent(overpassQuery(cfg.lat, cfg.lon, cfg.radiusMetres));
  let lastErr = 'unknown';
  // Try each mirror, twice, before giving up — 429/504 from a busy instance is transient.
  for (const endpoint of OVERPASS_ENDPOINTS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await f(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': UA },
          body,
        });
        if (res.ok) {
          const json = (await res.json()) as { elements?: OverpassElement[] };
          return json.elements ?? [];
        }
        lastErr = `HTTP ${res.status} @ ${new URL(endpoint).host}`;
      } catch (e) {
        lastErr = `${(e as Error).message} @ ${new URL(endpoint).host}`;
      }
    }
  }
  throw new Error(`Overpass unavailable (${lastErr})`);
}

export async function fetchFhrs(cfg: LiveIngestConfig): Promise<FhrsEstablishment[]> {
  const f = cfg.fetchImpl ?? fetch;
  const url = `${FHRS_ENDPOINT}?address=${encodeURIComponent(cfg.fhrsQuery)}&pageSize=200`;
  const res = await f(url, { headers: { 'x-api-version': '2', accept: 'application/json', 'user-agent': UA } });
  if (!res.ok) throw new Error(`FHRS HTTP ${res.status}`);
  const json = (await res.json()) as { establishments?: FhrsEstablishment[] };
  const all = json.establishments ?? [];
  const districts = cfg.postcodeDistricts;
  if (!districts || districts.length === 0) return all;
  // FHRS address search is fuzzy — keep only establishments in the community's districts.
  const want = new Set(districts.map((d) => d.toUpperCase()));
  return all.filter((e) => e.PostCode && want.has(postcodeDistrict(e.PostCode)));
}

export async function fetchCompaniesHouse(cfg: LiveIngestConfig): Promise<CompaniesHouseItem[]> {
  if (!cfg.companiesHouseKey) throw new Error('no Companies House key');
  const f = cfg.fetchImpl ?? fetch;
  const url = `${CH_ENDPOINT}?q=${encodeURIComponent(cfg.name)}&items_per_page=100`;
  const auth = btoa(`${cfg.companiesHouseKey}:`);
  const res = await f(url, { headers: { authorization: `Basic ${auth}`, 'user-agent': UA } });
  if (!res.ok) throw new Error(`Companies House HTTP ${res.status}`);
  const json = (await res.json()) as {
    items?: { title?: string; company_status?: string; address_snippet?: string }[];
  };
  return (json.items ?? []).map((i) => ({
    company_name: i.title ?? '',
    ...(i.company_status ? { company_status: i.company_status } : {}),
    ...(i.address_snippet ? { address_snippet: i.address_snippet } : {}),
  }));
}

export async function runLiveIngestion(cfg: LiveIngestConfig): Promise<LiveIngestResult> {
  const drafts: SeedProposalDraft[] = [];
  const reports: SourceReport[] = [];

  // Overpass
  try {
    const raw = await fetchOverpass(cfg);
    const d = ingestOverpass(raw);
    drafts.push(...d);
    reports.push({ source: 'overpass', ok: true, rawCount: raw.length, draftCount: d.length });
  } catch (e) {
    reports.push({ source: 'overpass', ok: false, rawCount: 0, draftCount: 0, note: String((e as Error).message) });
  }

  // FHRS
  try {
    const raw = await fetchFhrs(cfg);
    const d = ingestFhrs(raw);
    drafts.push(...d);
    reports.push({ source: 'fhrs', ok: true, rawCount: raw.length, draftCount: d.length });
  } catch (e) {
    reports.push({ source: 'fhrs', ok: false, rawCount: 0, draftCount: 0, note: String((e as Error).message) });
  }

  // Companies House (key-gated)
  if (cfg.companiesHouseKey) {
    try {
      const raw = await fetchCompaniesHouse(cfg);
      const d = ingestCompaniesHouse(raw);
      drafts.push(...d);
      reports.push({ source: 'companies_house', ok: true, rawCount: raw.length, draftCount: d.length });
    } catch (e) {
      reports.push({ source: 'companies_house', ok: false, rawCount: 0, draftCount: 0, note: String((e as Error).message) });
    }
  } else {
    reports.push({ source: 'companies_house', ok: false, rawCount: 0, draftCount: 0, note: 'AWAITING-KEY (no key provided)' });
  }

  return { drafts, reports };
}

/** Normalised key for deduping a draft by kind + name. Case/punctuation-insensitive, treats
 *  "&" as "and", and drops a trailing company suffix so FHRS/Overpass/Companies-House variants
 *  of the same place collapse (e.g. "The Gun & Spitroast" ≡ "The Gun And Spitroast"). */
export function draftKey(kind: string, name: string): string {
  const norm = name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\b(ltd|limited|plc|llp)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return `${kind}:${norm}`;
}
