// Checked-in Horsmonden-shaped sample datasets (spec 08 fixture mode). These stand in for
// live Overpass / FHRS / Companies House / URL-extract results so the whole
// proposal -> review -> accept pipeline runs end to end with no network and no keys.
// Shapes mirror each real source so the same transformers consume fixture and live data.
import {
  ingestCompaniesHouse,
  ingestFhrs,
  ingestOverpass,
  ingestUrlExtract,
  type CompaniesHouseItem,
  type ExtractedOrg,
  type FhrsEstablishment,
  type OverpassElement,
  type SeedProposalDraft,
} from './index';

export const OVERPASS_HORSMONDEN: OverpassElement[] = [
  { type: 'node', id: 1, tags: { name: 'The Gun & Spitroast', amenity: 'pub' } },
  { type: 'node', id: 2, tags: { name: 'Horsmonden Village Stores', shop: 'convenience' } },
  { type: 'node', id: 3, tags: { name: 'The Village Green', leisure: 'park' } },
  { type: 'node', id: 4, tags: { name: 'St Margaret’s Church', amenity: 'place_of_worship' } },
  { type: 'node', id: 5, tags: { name: 'Horsmonden Primary School', amenity: 'school' } },
  { type: 'node', id: 6, tags: { name: 'The Village Hall', amenity: 'community_centre' } },
  { type: 'node', id: 7, tags: { name: 'Horsmonden Pharmacy', amenity: 'pharmacy' } },
  { type: 'node', id: 8, tags: { name: 'The Butcher on the Green', shop: 'butcher' } },
  { type: 'node', id: 9, tags: { name: 'Recreation Ground', leisure: 'recreation_ground' } },
  { type: 'node', id: 10, tags: { name: 'Furnace Pond', amenity: 'bench' } }, // no mappable kind -> skipped
];

export const FHRS_HORSMONDEN: FhrsEstablishment[] = [
  { BusinessName: 'The Gun & Spitroast', BusinessType: 'Pub/bar/nightclub', AddressLine1: 'Gun Green', RatingValue: '5' },
  { BusinessName: 'The Green Café', BusinessType: 'Restaurant/Cafe/Canteen', AddressLine1: 'The Green', RatingValue: '5' },
  { BusinessName: 'Horsmonden Fish Bar', BusinessType: 'Takeaway/sandwich shop', AddressLine1: 'High Street', RatingValue: '4' },
];

export const CH_HORSMONDEN: CompaniesHouseItem[] = [
  { company_name: 'Weald Plumbing & Heating Ltd', company_status: 'active', address_snippet: 'Horsmonden, Kent', sic_codes: ['43220'] },
  { company_name: 'Green Fingers Garden Services Ltd', company_status: 'active', address_snippet: 'Horsmonden', sic_codes: ['81300'] },
  { company_name: 'Old Oast Joinery Ltd', company_status: 'dissolved', address_snippet: 'Horsmonden' }, // filtered out
];

export const ORGS_HORSMONDEN: ExtractedOrg[] = [
  { name: 'Horsmonden Parish Council', kind: 'council', description: 'Local council for the parish', verified_source: true },
  { name: 'Horsmonden Primary School', kind: 'school', description: 'The village primary school', verified_source: true },
  { name: 'Horsmonden PTA', kind: 'pta', description: 'Parent-teacher association', verified_source: true },
  { name: 'Horsmonden Cricket Club', kind: 'club', description: 'Village cricket on the Heath' },
];

/** Run every fixture through its transformer to produce the review queue for Horsmonden. */
export function horsmondenDrafts(): SeedProposalDraft[] {
  return [
    ...ingestOverpass(OVERPASS_HORSMONDEN),
    ...ingestFhrs(FHRS_HORSMONDEN),
    ...ingestCompaniesHouse(CH_HORSMONDEN),
    ...ingestUrlExtract(ORGS_HORSMONDEN),
  ];
}
