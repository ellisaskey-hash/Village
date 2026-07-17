import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cx } from '@/lib/cx';
import { toastMotion } from '@/lib/motion';
import { Icon, type IconName } from './Icon';
import { badgeFg, type Tone } from './tones';

export type ToastVariant = 'info' | 'success' | 'error' | 'update';

interface ToastInput {
  title: string;
  body?: string;
  variant?: ToastVariant;
  /** 0 = sticky (used by the PWA update toast). Default 3000ms. */
  durationMs?: number;
  action?: { label: string; onClick: () => void };
}
interface ToastItem extends ToastInput {
  id: number;
}

const VARIANT: Record<ToastVariant, { icon: IconName; tone: Tone }> = {
  info: { icon: 'info', tone: 'info' },
  success: { icon: 'check', tone: 'positive' },
  error: { icon: 'alert', tone: 'danger' },
  update: { icon: 'refresh', tone: 'accent' },
};

const ToastContext = createContext<((t: ToastInput) => void) | null>(null);

/** Top-anchored, auto-dismiss toasts (COMPONENT_INVENTORY 3.1). Capped at 3 (drop-oldest) so a
 *  burst of failures can't paper the screen, while an action toast (e.g. Undo) isn't instantly
 *  destroyed by a following success. Action toasts default to 5s so they can be read and acted on. */
const MAX_TOASTS = 3;
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (t: ToastInput) => {
      const id = ++idRef.current;
      setItems((prev) => [...prev, { ...t, id }].slice(-MAX_TOASTS));
      const duration = t.durationMs ?? (t.action ? 5000 : 3000);
      if (duration > 0) window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={push}>
      {children}
      <ToastHost items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToasts(): (t: ToastInput) => void {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToasts must be used within a ToastProvider');
  return ctx;
}

function ToastHost({ items, onDismiss }: { items: ToastItem[]; onDismiss: (id: number) => void }) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-0 z-toast flex flex-col items-center gap-2 p-4">
      <AnimatePresence>
        {items.map((t) => {
          const v = VARIANT[t.variant ?? 'info'];
          return (
            <motion.div
              key={t.id}
              layout
              variants={toastMotion}
              initial="initial"
              animate="animate"
              exit="exit"
              role={v.tone === 'danger' ? 'alert' : 'status'}
              aria-live={v.tone === 'danger' ? 'assertive' : 'polite'}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-border bg-bgElevated p-3 shadow-raised"
            >
              <span className={cx('mt-0.5 shrink-0', badgeFg[v.tone])}>
                <Icon name={v.icon} size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-body font-medium text-text">{t.title}</p>
                {t.body && <p className="text-small text-textMuted">{t.body}</p>}
              </div>
              {t.action && (
                <button
                  type="button"
                  onClick={() => {
                    t.action?.onClick();
                    onDismiss(t.id);
                  }}
                  className="shrink-0 text-small font-semibold text-accent"
                >
                  {t.action.label}
                </button>
              )}
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => onDismiss(t.id)}
                className="relative shrink-0 text-textMuted transition-colors after:absolute after:-inset-2.5 after:content-[''] hover:text-text"
              >
                <Icon name="close" size={16} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
