/**
 * src/lib/motion.ts — the named choreography library (MOTION_AND_ANIMATION.md).
 *
 * Components import motion from here; they never inline a transition config. Every
 * duration/spring/easing comes from design/tokens.ts. This is the "feel" being cloned
 * from Elevra verbatim, so the numbers below are the audit's numbers.
 */
import type { Transition, Variants } from 'framer-motion';
import {
  motionToken,
  springSnappy,
  springSheet,
  springGentle,
  easeOut as easeOutToken,
  easeInOut as easeInOutToken,
} from '@design/tokens';

const { instant, fast, base, drawn } = motionToken;

// Framer's bezier easing wants a mutable 4-tuple; tokens store it readonly.
export const easeOut = [...easeOutToken] as [number, number, number, number];
export const easeInOut = [...easeInOutToken] as [number, number, number, number];

export { springSnappy, springSheet, springGentle };

/** screenEnter — route transitions. Parent fades; children stay opaque (blur-safe). */
export const screenEnter: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.2, ease: easeOut, staggerChildren: 0.08 },
  },
  exit: { opacity: 0, transition: { duration: fast / 1000, ease: easeOut } },
};

/** cardEnter — per-card cascade, y-only rise over 1000ms expo-out. */
export const cardEnter: Variants = {
  initial: { y: 24 },
  animate: { y: 0, transition: { duration: 1.0, ease: easeOut } },
};

/** cardEnterPlus — paired hero card, lands ~70ms after its sibling. */
export const cardEnterPlus: Variants = {
  initial: { y: 24 },
  animate: { y: 0, transition: { duration: 1.0, ease: easeOut, delay: 0.07 } },
};

/** sheetMotion + backdropMotion — bottom sheets / drawers. Spring in, linear slide out. */
export const sheetMotion: Variants = {
  initial: { y: '100%' },
  animate: { y: 0, transition: springSheet },
  exit: { y: '100%', transition: { duration: base / 1000, ease: easeOut } },
};
export const backdropMotion: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 0.6, transition: { duration: fast / 1000 } },
  exit: { opacity: 0, transition: { duration: fast / 1000 } },
};

/** modalMotion — centred dialogs. Scale 96%→100% + fade, no spring. */
export const modalMotion: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: { duration: fast / 1000, ease: easeOut } },
  exit: { opacity: 0, scale: 0.96, transition: { duration: fast / 1000, ease: easeOut } },
};

/** listContainer + listItem — inline lists that appear after data loads. */
export const listContainer: Variants = {
  animate: { transition: { staggerChildren: 0.04 } },
};
export const listItem: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: springGentle },
};

/** pressable — tap feedback. Spread onto any pressable motion element. */
export const pressable = {
  whileTap: { scale: 0.97 },
  transition: springSnappy as Transition,
};

/** tab-bar / tab-switch. */
export const tabIconSpring = springSnappy;
export const tabScreenCrossfade: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: instant / 1000 } },
  exit: { opacity: 0, transition: { duration: instant / 1000 } },
};

/** drawTransition — ring fills, chart draws. 700ms expo-out. */
export const drawTransition: Transition = { duration: drawn / 1000, ease: easeOut };

/** toastMotion — drop 16px in (spring), lift 16px out (linear). */
export const toastMotion: Variants = {
  initial: { opacity: 0, y: -16 },
  animate: { opacity: 1, y: 0, transition: springSnappy },
  exit: { opacity: 0, y: -16, transition: { duration: fast / 1000, ease: easeOut } },
};

/** statusPulse — at-risk indicator. 2s opacity loop; frozen under reduced motion. */
export const statusPulse: Variants = {
  animate: { opacity: [1, 0.4, 1], transition: { duration: 2, repeat: Infinity, ease: easeOut } },
};

/** skeletonShimmer — 1.4s linear sweep. The one deliberate linear tween. */
export const skeletonShimmer: Variants = {
  animate: {
    backgroundPosition: ['0% 0%', '100% 0%'],
    transition: { duration: 1.4, repeat: Infinity, ease: 'linear' },
  },
};

/**
 * alert arrival (spec 05, the one new choreography) — toast drop + a single warm-glow
 * breath pulse, for platform-tier alerts on the Home alerts strip. Composed here so it
 * exists as a named choreography; wired to the alerts strip in a later milestone.
 */
export const alertArrival: Variants = {
  initial: { opacity: 0, y: -16 },
  animate: {
    opacity: 1,
    y: 0,
    boxShadow: [
      '0 0 0 0 rgba(240,185,90,0.15), 0 0 6px 0 rgba(240,185,90,0.25)',
      '0 0 0 6px rgba(240,185,90,0.05), 0 0 18px 2px rgba(240,185,90,0.4)',
      '0 0 0 0 rgba(240,185,90,0.15), 0 0 6px 0 rgba(240,185,90,0.25)',
    ],
    transition: { default: springSnappy, boxShadow: { duration: 2.4, ease: easeInOut } },
  },
  exit: { opacity: 0, y: -16, transition: { duration: fast / 1000, ease: easeOut } },
};
