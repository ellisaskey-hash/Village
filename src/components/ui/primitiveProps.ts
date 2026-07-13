import type { ButtonHTMLAttributes, HTMLAttributes } from 'react';

/**
 * Framer's `motion.*` elements override a handful of DOM event props (drag + animation
 * lifecycle). Omitting them here lets a primitive extend the native attribute set and
 * still spread cleanly onto a `motion.button` / `motion.div` without a type clash.
 */
type MotionConflicts =
  | 'style' // React CSSProperties vs framer MotionStyle — set style directly, not via rest
  | 'onAnimationStart'
  | 'onAnimationEnd'
  | 'onAnimationIteration'
  | 'onDrag'
  | 'onDragStart'
  | 'onDragEnd'
  | 'onDragEnter'
  | 'onDragExit'
  | 'onDragLeave'
  | 'onDragOver'
  | 'onDrop';

export type NativeButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, MotionConflicts>;
export type NativeDivProps = Omit<HTMLAttributes<HTMLDivElement>, MotionConflicts>;
