import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { cx } from '@/lib/cx';
import { sheetMotion, backdropMotion } from '@/lib/motion';
import { useFocusTrap } from '@/lib/useFocusTrap';
import { IconBadge } from './IconBadge';
import { IconButton } from './IconButton';
import { type IconName } from './Icon';
import { type Tone } from './tones';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  hero?: { icon: IconName; tone?: Tone };
  position?: 'bottom' | 'center';
  fluidGlass?: boolean;
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * The one drawer primitive (COMPONENT_INVENTORY 5.1). Bottom-anchored on phones; `center`
 * becomes a centred card on lg+. Backdrop 60% black, focus-trapped, scroll-locked, ESC to
 * close, drag-to-dismiss on the bottom shape. fluidGlass panel is the default since 2026-06-15.
 */
export function Sheet({
  open,
  onClose,
  title,
  hero,
  position = 'bottom',
  fluidGlass = true,
  footer,
  children,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const onDragEnd = (_e: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 500) onClose();
  };

  // Drag-to-dismiss only on the bottom shape; spread conditionally so no prop is ever `undefined`.
  const dragProps =
    position === 'bottom'
      ? {
          drag: 'y' as const,
          dragConstraints: { top: 0, bottom: 0 },
          dragElastic: { top: 0, bottom: 0.4 },
          onDragEnd,
        }
      : {};

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className={cx(
            'fixed inset-0 z-sheet flex justify-center',
            position === 'center' ? 'items-end lg:items-center' : 'items-end',
          )}
        >
          <motion.div
            className="absolute inset-0 bg-[var(--c-glass-backdrop)]"
            variants={backdropMotion}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title ?? 'Dialog'}
            tabIndex={-1}
            className={cx(
              'safe-bottom relative flex max-h-[85vh] w-full flex-col rounded-t-sheet border-t border-border shadow-raised',
              position === 'center' && 'lg:max-w-md lg:rounded-sheet lg:border',
              fluidGlass ? 'bg-[var(--c-glass-panel-bg)] backdrop-blur-md' : 'bg-bgElevated',
            )}
            variants={sheetMotion}
            initial="initial"
            animate="animate"
            exit="exit"
            {...dragProps}
          >
            {position === 'bottom' && (
              <div className="flex justify-center pt-2.5">
                <span className="h-1 w-9 rounded-full bg-borderStrong" />
              </div>
            )}
            <div className="flex items-start gap-3 px-5 pb-3 pt-4">
              {hero && <IconBadge icon={hero.icon} tone={hero.tone ?? 'accent'} size="md" />}
              <div className="min-w-0 flex-1">
                {title && <h2 className="text-h2 font-semibold text-text">{title}</h2>}
              </div>
              <IconButton icon="close" ariaLabel="Close" size="sm" onClick={onClose} />
            </div>
            <div className="sheet-scrollbar flex-1 overflow-y-auto px-5 pb-5">{children}</div>
            {footer && <div className="safe-bottom border-t border-border px-5 py-3">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
