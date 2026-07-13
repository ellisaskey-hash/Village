import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cx } from '@/lib/cx';
import { modalMotion, backdropMotion } from '@/lib/motion';
import { useFocusTrap } from '@/lib/useFocusTrap';
import { Button } from './Button';
import { IconBadge } from './IconBadge';
import { type IconName } from './Icon';
import { type Tone } from './tones';

interface ModalAction {
  label: string;
  onClick: () => void;
  loading?: boolean;
  leadingIcon?: IconName;
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children?: ReactNode;
  hero?: { icon: IconName; tone?: Tone };
  footerNote?: ReactNode;
  /** Destructive + irreversible only (COMPONENT_INVENTORY 5.2). */
  destructive?: boolean;
  primary?: ModalAction;
  secondary?: { label: string; onClick: () => void };
}

/** Centre dialog for confirmations. Destructive button sits right (platform convention). */
export function Modal({
  open,
  onClose,
  title,
  children,
  hero,
  footerNote,
  destructive = false,
  primary,
  secondary,
}: ModalProps) {
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

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-5">
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
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className="relative w-full max-w-sm rounded-sheet border border-border bg-bgElevated p-6 shadow-raised"
            variants={modalMotion}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {hero && (
              <div className="mb-3 flex justify-center">
                <IconBadge icon={hero.icon} tone={hero.tone ?? (destructive ? 'danger' : 'accent')} size="lg" />
              </div>
            )}
            <h2 className={cx('text-h2 font-semibold text-text', hero && 'text-center')}>{title}</h2>
            {children && <div className={cx('mt-2 text-body text-textMuted', hero && 'text-center')}>{children}</div>}
            <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
              {primary && (
                <Button
                  variant={destructive ? 'danger' : 'primary'}
                  size="xl"
                  fullWidth
                  onClick={primary.onClick}
                  loading={primary.loading ?? false}
                  {...(primary.leadingIcon ? { leadingIcon: primary.leadingIcon } : {})}
                >
                  {primary.label}
                </Button>
              )}
              {secondary && (
                <Button variant="secondary" size="xl" fullWidth onClick={secondary.onClick}>
                  {secondary.label}
                </Button>
              )}
            </div>
            {footerNote && <p className="mt-3 text-center text-small text-textFaint">{footerNote}</p>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
