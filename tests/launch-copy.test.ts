import { describe, it, expect } from 'vitest';
import { launchCopy } from '@/lib/launch/launchCopy';

describe('launchCopy', () => {
  const copy = launchCopy({ name: 'Horsmonden', slug: 'horsmonden' }, 'https://village.example/');

  it('builds a join link from the origin + slug', () => {
    expect(copy.joinLink).toBe('https://village.example/welcome?community=horsmonden');
  });

  it('embeds the join link and community name in every block', () => {
    for (const block of [copy.facebook, copy.pta, copy.poster]) {
      expect(block).toContain(copy.joinLink);
      expect(block.toLowerCase()).toContain('horsmonden');
    }
  });

  it('stays on-voice (no em dashes in launch copy)', () => {
    const all = copy.joinLink + copy.facebook + copy.pta + copy.poster;
    expect(all).not.toContain('—');
  });
});
