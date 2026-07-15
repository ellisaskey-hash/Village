import { describe, it, expect } from 'vitest';
import { fetchFhrs, fetchOverpass, draftKey, postcodeDistrict, type LiveIngestConfig } from '@/lib/ingest/live';

const base: LiveIngestConfig = { name: 'Horsmonden', lat: 51.1268, lon: 0.4368, radiusMetres: 2500, fhrsQuery: 'Horsmonden' };

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as unknown as Response;
}

describe('draftKey — cross-source dedup normalisation', () => {
  it('treats "&" as "and" so FHRS and Overpass variants collapse', () => {
    expect(draftKey('business', 'The Gun & Spitroast')).toBe(draftKey('business', 'The Gun And Spitroast'));
  });
  it('drops a trailing company suffix', () => {
    expect(draftKey('business', 'Weald Plumbing Ltd')).toBe(draftKey('business', 'Weald Plumbing'));
  });
  it('keeps genuinely different names apart', () => {
    expect(draftKey('place', "St Margaret's Church Hall")).not.toBe(draftKey('place', "St Margaret's, Horsmonden"));
  });
});

describe('postcodeDistrict', () => {
  it('extracts the outward district', () => {
    expect(postcodeDistrict('TN12 8LH')).toBe('TN12');
    expect(postcodeDistrict('UB6 0PB')).toBe('UB6');
  });
});

describe('fetchFhrs — filters out fuzzy out-of-area matches', () => {
  it('keeps only establishments in the community districts (drops Horsenden/Perivale UB6)', async () => {
    const establishments = [
      { BusinessName: 'The Gun And Spitroast', PostCode: 'TN12 8HT' },
      { BusinessName: 'Davenport Vineyards', PostCode: 'TN12 8EF' },
      { BusinessName: 'The Horsenden Pantry', PostCode: 'UB6 0PB' },
      { BusinessName: 'Perivale Brewery', PostCode: 'UB6 7PQ' },
    ];
    const fetchImpl = (async () => jsonResponse({ establishments })) as unknown as typeof fetch;
    const kept = await fetchFhrs({ ...base, postcodeDistricts: ['TN12'], fetchImpl });
    expect(kept.map((e) => e.BusinessName)).toEqual(['The Gun And Spitroast', 'Davenport Vineyards']);
  });
});

describe('fetchOverpass — mirror + retry fallback', () => {
  it('falls through a 504 mirror to a healthy one', async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls++;
      if (calls === 1) return jsonResponse(null, 504); // first mirror busy
      return jsonResponse({ elements: [{ type: 'node', id: 1, tags: { name: 'The Heath', leisure: 'park' } }] });
    }) as unknown as typeof fetch;
    const els = await fetchOverpass({ ...base, fetchImpl });
    expect(els).toHaveLength(1);
    expect(calls).toBeGreaterThanOrEqual(2);
  });

  it('sends a User-Agent (the header whose absence 406s the real endpoint)', async () => {
    let sawUA = false;
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      const h = (init.headers ?? {}) as Record<string, string>;
      if (h['user-agent']) sawUA = true;
      return jsonResponse({ elements: [] });
    }) as unknown as typeof fetch;
    await fetchOverpass({ ...base, fetchImpl });
    expect(sawUA).toBe(true);
  });
});
