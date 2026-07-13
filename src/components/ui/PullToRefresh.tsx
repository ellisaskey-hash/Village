import { useRef, useState, type ReactNode, type TouchEvent } from 'react';
import { cx } from '@/lib/cx';
import { Icon } from './Icon';

interface PullToRefreshProps {
  onRefresh: () => void | Promise<void>;
  children: ReactNode;
  className?: string;
}

const THRESHOLD = 64;

/**
 * Branded pull-to-refresh (COMPONENT_INVENTORY 5.9). Touch-driven only: wheel + pointer
 * fall through to native scroll. The indicator drops in from the top as you pull past
 * the threshold; `onRefresh` fires once on release.
 */
export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const onTouchStart = (e: TouchEvent) => {
    startY.current = (scrollRef.current?.scrollTop ?? 0) <= 0 ? e.touches[0]!.clientY : null;
  };
  const onTouchMove = (e: TouchEvent) => {
    if (startY.current === null || refreshing) return;
    const delta = e.touches[0]!.clientY - startY.current;
    if (delta > 0) setPull(Math.min(delta * 0.5, 96));
  };
  const onTouchEnd = async () => {
    if (pull > THRESHOLD && !refreshing) {
      setRefreshing(true);
      try {
        await Promise.resolve(onRefresh());
      } finally {
        setRefreshing(false);
      }
    }
    setPull(0);
    startY.current = null;
  };

  const indicatorHeight = refreshing ? THRESHOLD : pull;

  return (
    <div className={cx('relative', className)}>
      <div
        className="flex items-end justify-center overflow-hidden transition-[height] duration-200"
        style={{ height: indicatorHeight }}
        aria-hidden={!refreshing}
      >
        <Icon
          name="refresh"
          size={22}
          className={cx('mb-2 text-accent', refreshing && 'animate-spin')}
          style={{ opacity: Math.min(pull / THRESHOLD, 1) || (refreshing ? 1 : 0) }}
        />
      </div>
      <div
        ref={scrollRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="max-h-full overflow-y-auto"
      >
        {children}
      </div>
    </div>
  );
}
