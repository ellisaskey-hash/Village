import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { VirtualList } from '@/components/ui/VirtualList';

// happy-dom lacks ResizeObserver (react-virtual measures with it) and computes no layout, so we
// polyfill ResizeObserver and pin a window height for the windowing maths to have something real.
beforeAll(() => {
  class RO { observe() {} unobserve() {} disconnect() {} }
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = RO;
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
});
afterEach(cleanup);

const makeItems = (n: number) => Array.from({ length: n }, (_, i) => ({ id: String(i), label: `Row ${i}` }));

describe('VirtualList', () => {
  it('renders every row when at or below the threshold', () => {
    render(<VirtualList items={makeItems(40)} getKey={(x) => x.id} renderItem={(x) => <div data-testid="row">{x.label}</div>} />);
    expect(screen.getAllByTestId('row').length).toBe(40);
  });

  it('windows a 1000-item list instead of rendering all of it', () => {
    render(<VirtualList items={makeItems(1000)} getKey={(x) => x.id} estimateSize={72} renderItem={(x) => <div data-testid="row">{x.label}</div>} />);
    // happy-dom computes no layout, so it over-renders vs a browser; the contract it CAN prove is
    // that not all 1000 land in the DOM. The pixel-accurate ~20-row window is proven in a real
    // browser in e2e/scale.spec.ts (1000 listings → < 80 DOM rows).
    expect(screen.queryAllByTestId('row').length).toBeLessThan(1000);
  });
});
