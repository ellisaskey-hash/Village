import { useCallback, type KeyboardEvent } from 'react';

type Orientation = 'horizontal' | 'vertical';

/**
 * Shared roving arrow-key navigation (Elevra fix #14). Returns an onKeyDown handler for
 * a container; it moves focus across children carrying `[data-arrow-item]`, skipping
 * disabled ones, with Home/End support. Used by SegmentedControl and Tabs.
 */
export function useArrowNavigation(orientation: Orientation = 'horizontal') {
  return useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      const nextKey = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown';
      const prevKey = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
      if (!['Home', 'End', nextKey, prevKey].includes(e.key)) return;

      const container = e.currentTarget;
      const items = Array.from(
        container.querySelectorAll<HTMLElement>('[data-arrow-item]:not([disabled])'),
      );
      if (items.length === 0) return;

      const currentIndex = items.indexOf(document.activeElement as HTMLElement);
      let nextIndex = currentIndex;

      if (e.key === 'Home') nextIndex = 0;
      else if (e.key === 'End') nextIndex = items.length - 1;
      else if (e.key === nextKey) nextIndex = (currentIndex + 1) % items.length;
      else if (e.key === prevKey) nextIndex = (currentIndex - 1 + items.length) % items.length;

      const target = items[nextIndex];
      if (target) {
        e.preventDefault();
        target.focus();
      }
    },
    [orientation],
  );
}
