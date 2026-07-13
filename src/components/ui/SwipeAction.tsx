import { type ReactNode } from 'react';
import { motion, useAnimationControls, type PanInfo } from 'framer-motion';
import { cx } from '@/lib/cx';
import { springSnappy } from '@/lib/motion';
import { Icon, type IconName } from './Icon';

type SwipeTone = 'accent' | 'warn' | 'danger';

interface SwipeActionProps {
  action: { icon: IconName; label: string; tone: SwipeTone; onComplete: () => void };
  children: ReactNode;
  className?: string;
}

const TONE_BG: Record<SwipeTone, string> = {
  accent: 'bg-accent text-textOnAccent',
  warn: 'bg-warn text-textOnAccent',
  danger: 'bg-danger text-textOnAccent',
};

const COMMIT_THRESHOLD = 72;

/**
 * Wrap a row to enable swipe-to-commit (COMPONENT_INVENTORY 5.10). Drag left to reveal the
 * coloured action; release past threshold (or with enough velocity) commits — the row
 * animates off-screen and `onComplete` fires.
 */
export function SwipeAction({ action, children, className }: SwipeActionProps) {
  const controls = useAnimationControls();

  const onDragEnd = (_e: unknown, info: PanInfo) => {
    if (info.offset.x < -COMMIT_THRESHOLD || info.velocity.x < -800) {
      void controls.start({ x: '-100%', opacity: 0, transition: springSnappy }).then(() => {
        action.onComplete();
      });
    } else {
      void controls.start({ x: 0, transition: springSnappy });
    }
  };

  return (
    <div className={cx('relative overflow-hidden rounded-lg', className)}>
      <div
        className={cx(
          'absolute inset-y-0 right-0 flex w-28 items-center justify-center gap-1.5 text-small font-semibold',
          TONE_BG[action.tone],
        )}
      >
        <Icon name={action.icon} size={18} />
        {action.label}
      </div>
      <motion.div
        drag="x"
        dragConstraints={{ left: -112, right: 0 }}
        dragElastic={{ left: 0.15, right: 0 }}
        animate={controls}
        onDragEnd={onDragEnd}
        className="relative touch-pan-y bg-bgElevated"
      >
        {children}
      </motion.div>
    </div>
  );
}
