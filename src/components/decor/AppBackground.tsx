import { motion } from 'framer-motion';
import { useMotionSafe } from '@/lib/useMotionSafe';

/**
 * AppBackground — the hearth ambient (spec 05). Warm amber-and-green ember glows behind
 * every screen so the app quietly reads "you're somewhere warm" before a component paints.
 * This is the app's ambient background layer (analogous to Elevra's iridescence layer),
 * not UI choreography; its slow drift pauses entirely under reduced motion.
 *
 * The blobs are painted from the `--bg-ambient-*` CSS variables so they swap with theme,
 * skin, and accent for free. Decorative and inert: aria-hidden, pointer-events none.
 */
export function AppBackground() {
  const motionSafe = useMotionSafe();

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* static base wash — always present, even under reduced motion */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'var(--bg-ambient-1), var(--bg-ambient-2), var(--bg-ambient-3)',
        }}
      />
      {/* gentle ember drift — compositor-only transform, paused when motion is reduced */}
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage: 'var(--bg-ambient-1), var(--bg-ambient-2)',
          mixBlendMode: 'screen',
        }}
        initial={false}
        animate={
          motionSafe
            ? { opacity: [0.55, 0.9, 0.55], scale: [1, 1.04, 1] }
            : { opacity: 0.7, scale: 1 }
        }
        transition={
          motionSafe
            ? { duration: 18, repeat: Infinity, ease: [0.65, 0, 0.35, 1] }
            : { duration: 0 }
        }
      />
    </div>
  );
}
