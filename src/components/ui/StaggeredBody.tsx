import { Children, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { listContainer, listItem } from '@/lib/motion';

interface StaggeredBodyProps {
  children: ReactNode;
  /** Caller passes its motion policy (from useReducedMotion/useMotionSafe) so the drawer stays coherent. */
  reduce?: boolean;
  className?: string;
}

/** Fades + drifts each direct child up on mount with a small stagger (COMPONENT_INVENTORY 5.11). */
export function StaggeredBody({ children, reduce = false, className }: StaggeredBodyProps) {
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div variants={listContainer} initial="initial" animate="animate" className={className}>
      {Children.map(children, (child) => (
        <motion.div variants={listItem}>{child}</motion.div>
      ))}
    </motion.div>
  );
}
