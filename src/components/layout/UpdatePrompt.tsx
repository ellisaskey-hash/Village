import { useEffect } from 'react';
import { useToasts } from '@/components/ui';
import { applyUpdate } from '@/lib/pwa';

/** Shows a sticky "update available" toast when a new SW is waiting (registerType: 'prompt'). */
export function UpdatePrompt() {
  const push = useToasts();
  useEffect(() => {
    const handler = () =>
      push({
        title: 'Update available',
        body: 'A new version of Local is ready.',
        variant: 'update',
        durationMs: 0,
        action: { label: 'Refresh', onClick: () => applyUpdate() },
      });
    window.addEventListener('pwa-need-refresh', handler);
    return () => window.removeEventListener('pwa-need-refresh', handler);
  }, [push]);
  return null;
}
