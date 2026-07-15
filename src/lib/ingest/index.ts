// Ingestion transformers (spec 08). Pure functions: raw source shape -> seed-proposal
// drafts. No network, no DB. Shared by the mock seeding pipeline (now) and the Vercel
// api/seed-ingest functions (later, AWAITING-KEYS). Ingestion NEVER writes live rows; it
// only produces proposals for admin review.

export type ProposalKind = 'place' | 'business' | 'organisation' | 'event';
export type ProposalSource =
  | 'overpass'
  | 'companies_house'
  | 'fhrs'
  | 'gias'
  | 'url_extract'
  | 'manual';

export interface SeedProposalDraft {
  kind: ProposalKind;
  source: ProposalSource;
  payload: Record<string, unknown>;
}

// ---- OpenStreetMap Overpass -----------------------------------------------------

export interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  /** Present on `way`/`relation` results fetched with `out center` — the geometric centroid. */
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const AMENITY_KIND: Record<string, string> = {
  pub: 'pub',
  bar: 'pub',
  cafe: 'cafe',
  restaurant: 'cafe',
  fast_food: 'cafe',
  place_of_worship: 'church',
  school: 'school',
  community_centre: 'hall',
  village_hall: 'hall',
  pharmacy: 'health',
  doctors: 'health',
  dentist: 'health',
  veterinary: 'health',
  post_office: 'service',
  bank: 'service',
  fuel: 'utility',
  bus_station: 'transport',
};
const LEISURE_KIND: Record<string, string> = {
  park: 'green',
  pitch: 'sports',
  sports_centre: 'sports',
  recreation_ground: 'green',
};
const COMMERCIAL_AMENITIES = new Set(['pub', 'bar', 'cafe', 'restaurant', 'fast_food', 'pharmacy', 'fuel', 'bank']);

function placeKind(tags: Record<string, string>): string | null {
  if (tags.shop) return 'shop';
  if (tags.amenity && AMENITY_KIND[tags.amenity]) return AMENITY_KIND[tags.amenity]!;
  if (tags.leisure && LEISURE_KIND[tags.leisure]) return LEISURE_KIND[tags.leisure]!;
  return null;
}

export function ingestOverpass(elements: OverpassElement[]): SeedProposalDraft[] {
  const out: SeedProposalDraft[] = [];
  for (const el of elements) {
    const tags = el.tags ?? {};
    const name = tags.name;
    if (!name) continue;
    const kind = placeKind(tags);
    if (!kind) continue;
    const address = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ') || undefined;
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    out.push({
      kind: 'place',
      source: 'overpass',
      payload: {
        name,
        kind,
        ...(address ? { address } : {}),
        ...(typeof lat === 'number' && typeof lon === 'number' ? { lat, lon } : {}),
        osm_id: `${el.type}/${el.id}`,
      },
    });
    // Commercial amenities and shops also seed an unclaimed business stub.
    const commercial = Boolean(tags.shop) || (tags.amenity ? COMMERCIAL_AMENITIES.has(tags.amenity) : false);
    if (commercial) {
      const category = tags.shop ?? tags.amenity ?? 'other';
      out.push({
        kind: 'business',
        source: 'overpass',
        payload: { name, categories: [category] },
      });
    }
  }
  return out;
}

// ---- Food Standards Agency FHRS -------------------------------------------------

export interface FhrsEstablishment {
  BusinessName: string;
  BusinessType?: string;
  AddressLine1?: string;
  PostCode?: string;
  RatingValue?: string;
}

export function ingestFhrs(establishments: FhrsEstablishment[]): SeedProposalDraft[] {
  return establishments
    .filter((e) => e.BusinessName)
    .map((e) => ({
      kind: 'business' as const,
      source: 'fhrs' as const,
      payload: {
        name: e.BusinessName,
        categories: e.BusinessType ? [e.BusinessType] : [],
        ...(e.AddressLine1 ? { description: e.AddressLine1 } : {}),
      },
    }));
}

// ---- Companies House (enrichment) -----------------------------------------------

export interface CompaniesHouseItem {
  company_name: string;
  company_status?: string;
  address_snippet?: string;
  sic_codes?: string[];
}

export function ingestCompaniesHouse(items: CompaniesHouseItem[]): SeedProposalDraft[] {
  return items
    .filter((c) => c.company_name && c.company_status !== 'dissolved')
    .map((c) => ({
      kind: 'business' as const,
      source: 'companies_house' as const,
      payload: {
        name: c.company_name,
        categories: c.sic_codes ?? [],
        ...(c.address_snippet ? { description: c.address_snippet } : {}),
      },
    }));
}

// ---- Manual URL extract ---------------------------------------------------------
// The live version pastes URLs to a Claude Haiku tool-use extraction (AWAITING-KEYS).
// The offline version accepts already-extracted records so the pipeline runs end to end.

export interface ExtractedOrg {
  name: string;
  kind: string;
  description?: string;
  verified_source?: boolean;
}

export function ingestUrlExtract(orgs: ExtractedOrg[]): SeedProposalDraft[] {
  return orgs
    .filter((o) => o.name)
    .map((o) => ({
      kind: 'organisation' as const,
      source: 'url_extract' as const,
      payload: {
        name: o.name,
        kind: o.kind,
        ...(o.description ? { description: o.description } : {}),
        verified_source: Boolean(o.verified_source),
      },
    }));
}
