import { useRef, type ReactNode } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  getKey: (item: T, index: number) => string;
  /** Approx row height incl. the gap below it, px. */
  estimateSize?: number;
  /** Rows above this count get windowed; at or below it we render them all (no overhead,
   *  keeps small lists simple and screenshot-stable). WEAKNESSES fix: virtualise > 50. */
  threshold?: number;
  className?: string;
}

/**
 * Window-scrolled virtualised list (spec 02 / PERFORMANCE.md: virtualise lists > 50 items).
 * Uses the page scroll (not an inner scroll box) so the shell's scroll UX is unchanged. Only
 * the visible window + overscan is in the DOM, so 1000 rows render as ~20.
 */
export function VirtualList<T>({
  items,
  renderItem,
  getKey,
  estimateSize = 76,
  threshold = 50,
  className,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useWindowVirtualizer({
    count: items.length,
    estimateSize: () => estimateSize,
    overscan: 8,
    scrollMargin: parentRef.current?.offsetTop ?? 0,
    getItemKey: (index) => getKey(items[index]!, index),
  });

  // Small lists: render everything. Avoids absolute-positioning + measurement overhead and
  // keeps the DOM simple for the common case (and for e2e/screenshots).
  if (items.length <= threshold) {
    return (
      <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, i) => (
          <div key={getKey(item, i)}>{renderItem(item, i)}</div>
        ))}
      </div>
    );
  }

  const virtualItems = virtualizer.getVirtualItems();
  return (
    <div ref={parentRef} className={className}>
      <div data-virtual-spacer style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
        {virtualItems.map((vi) => (
          <div
            key={vi.key}
            data-index={vi.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${vi.start - virtualizer.options.scrollMargin}px)`,
              paddingBottom: 8,
            }}
          >
            {renderItem(items[vi.index]!, vi.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
