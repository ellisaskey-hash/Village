import { motion } from 'framer-motion';
import { cx } from '@/lib/cx';
import { skeletonShimmer } from '@/lib/motion';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  shape?: 'rect' | 'circle' | 'pill';
  className?: string;
}

const RADIUS: Record<NonNullable<SkeletonProps['shape']>, string> = {
  rect: 'rounded-md',
  circle: 'rounded-full',
  pill: 'rounded-pill',
};

/**
 * Gradient-sweep placeholder. Loading is skeleton, not spinner, so the load-in never
 * jumps. `<MotionConfig reducedMotion>` collapses the shimmer to a static frosted block.
 */
export function Skeleton({ width, height = 16, shape = 'rect', className }: SkeletonProps) {
  return (
    <motion.div
      className={cx('bg-[length:200%_100%]', RADIUS[shape], className)}
      style={{
        width: width ?? '100%',
        height,
        backgroundImage:
          'linear-gradient(90deg, var(--skeleton-from) 0%, var(--skeleton-via) 50%, var(--skeleton-from) 100%)',
      }}
      variants={skeletonShimmer}
      animate="animate"
    />
  );
}

/** Pre-baked layout: a list row (avatar + two lines). */
export function SkeletonListRow({ className }: { className?: string }) {
  return (
    <div className={cx('flex items-center gap-3 p-cardPad', className)}>
      <Skeleton shape="circle" width={40} height={40} />
      <div className="flex-1 space-y-2">
        <Skeleton width="60%" height={12} />
        <Skeleton width="40%" height={10} />
      </div>
    </div>
  );
}

/** Pre-baked layout: a card. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cx('space-y-3 rounded-lg border border-border bg-bgElevated p-cardPad', className)}>
      <Skeleton width="50%" height={14} />
      <Skeleton height={12} />
      <Skeleton width="80%" height={12} />
    </div>
  );
}
