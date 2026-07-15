import { Icon } from '@/components/ui';

/**
 * Honest label for the no-database dev build (PROGRESS.md). Not shown once a Supabase
 * project is wired (the app selects the real data layer and this component never renders).
 * Fully click-through (pointer-events-none) so it can never intercept a tap on the content
 * behind it — it's an informational label, not a control.
 */
export function MockBanner() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-toast flex justify-center p-2">
      <div className="flex items-center gap-2 rounded-pill border border-warn/40 bg-bgElevated/90 px-3 py-1.5 text-small text-textMuted shadow-card backdrop-blur-md">
        <Icon name="info" size={14} className="text-warn" />
        <span>Demo mode. Data lives in this browser.</span>
      </div>
    </div>
  );
}
