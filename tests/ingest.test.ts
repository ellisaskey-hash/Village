import { describe, it, expect } from 'vitest';
import { ingestOverpass, ingestCompaniesHouse } from '@/lib/ingest';
import { horsmondenDrafts } from '@/lib/ingest/horsmondenFixture';

describe('ingestion transformers (fixture mode, no network)', () => {
  it('Overpass maps named amenities to places and commercial ones to business stubs, skipping unmappable', () => {
    const drafts = ingestOverpass([
      { type: 'node', id: 1, tags: { name: 'The Pub', amenity: 'pub' } },
      { type: 'node', id: 2, tags: { name: 'Corner Shop', shop: 'convenience' } },
      { type: 'node', id: 3, tags: { name: 'A Bench', amenity: 'bench' } }, // no mappable kind
    ]);
    const places = drafts.filter((d) => d.kind === 'place');
    const businesses = drafts.filter((d) => d.kind === 'business');
    expect(places.map((p) => p.payload.name)).toEqual(['The Pub', 'Corner Shop']);
    expect(businesses).toHaveLength(2); // pub + shop are commercial; bench skipped entirely
  });

  it('Companies House filters dissolved companies', () => {
    const drafts = ingestCompaniesHouse([
      { company_name: 'Active Ltd', company_status: 'active' },
      { company_name: 'Gone Ltd', company_status: 'dissolved' },
    ]);
    expect(drafts.map((d) => d.payload.name)).toEqual(['Active Ltd']);
  });

  it('the Horsmonden fixture produces a mixed review queue (proposal pipeline end to end)', () => {
    const drafts = horsmondenDrafts();
    const byKind = (k: string) => drafts.filter((d) => d.kind === k).length;
    expect(byKind('place')).toBeGreaterThanOrEqual(8);
    expect(byKind('business')).toBeGreaterThanOrEqual(4);
    expect(byKind('organisation')).toBe(4);
    // every proposal carries a source + payload with a name
    expect(drafts.every((d) => d.source && typeof d.payload.name === 'string')).toBe(true);
  });
});
