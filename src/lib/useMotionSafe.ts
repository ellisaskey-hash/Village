import { useSyncExternalStore } from 'react';

/**
 * useMotionSafe — for JS-driven motion (imperative timelines). Returns false when the
 * user has reduced motion on. Honours the data-motion override (`reduce` / `full`)
 * layered over the OS `prefers-reduced-motion` query (MOTION_AND_ANIMATION.md, layer 3).
 */
function resolve(): boolean {
  if (typeof document === 'undefined') return true;
  const attr = document.documentElement.getAttribute('data-motion');
  if (attr === 'reduce') return false;
  if (attr === 'full') return true;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return true;
}

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', callback);

  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-motion'],
  });

  return () => {
    mq.removeEventListener('change', callback);
    observer.disconnect();
  };
}

export function useMotionSafe(): boolean {
  return useSyncExternalStore(subscribe, resolve, () => true);
}
