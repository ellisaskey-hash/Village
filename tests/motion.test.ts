import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMotionSafe } from '@/lib/useMotionSafe';
import { motionToken, springSnappy } from '@design/tokens';

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('reduce') ? reduce : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  }));
}

describe('useMotionSafe', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-motion');
  });

  it('returns true when the OS does not request reduced motion', () => {
    mockReducedMotion(false);
    const { result } = renderHook(() => useMotionSafe());
    expect(result.current).toBe(true);
  });

  it('returns false when the OS requests reduced motion', () => {
    mockReducedMotion(true);
    const { result } = renderHook(() => useMotionSafe());
    expect(result.current).toBe(false);
  });

  it('data-motion=reduce overrides the OS query', () => {
    mockReducedMotion(false);
    document.documentElement.setAttribute('data-motion', 'reduce');
    const { result } = renderHook(() => useMotionSafe());
    expect(result.current).toBe(false);
  });

  it('data-motion=full overrides the OS query', () => {
    mockReducedMotion(true);
    document.documentElement.setAttribute('data-motion', 'full');
    const { result } = renderHook(() => useMotionSafe());
    expect(result.current).toBe(true);
  });
});

describe('motion tokens (inherited verbatim)', () => {
  it('durations match the audit', () => {
    expect(motionToken.instant).toBe(120);
    expect(motionToken.fast).toBe(200);
    expect(motionToken.base).toBe(280);
    expect(motionToken.slow).toBe(360);
    expect(motionToken.drawn).toBe(700);
  });
  it('springSnappy is the audit spring', () => {
    expect(springSnappy).toMatchObject({ type: 'spring', stiffness: 420, damping: 32 });
  });
});
