import { useState } from 'react';
import { Icon } from '@/components/ui';

/**
 * Honest label for the no-database dev build (PROGRESS.md). Not shown once a Supabase
 * project is wired (the app selects the real data layer and this component never renders).
 */
export function MockBanner() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-toast flex justify-center p-3">
      <div className="pointer-events-auto flex items-center gap-2 rounded-pill border border-warn/40 bg-bgElevated/90 px-3 py-1.5 text-small text-textMuted shadow-card backdrop-blur-md">
        <Icon name="info" size={14} className="text-warn" />
        <span>Demo mode. No database connected, so data lives in this browser.</span>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setOpen(false)}
          className="text-textFaint transition-colors hover:text-text"
        >
          <Icon name="close" size={14} />
        </button>
      </div>
    </div>
  );
}
