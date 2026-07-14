import { useEffect, useState } from 'react';
import { Icon } from './Icon';

/** Subtle banner shown when the device is offline (COMPONENT_INVENTORY 3.12, spec 09). */
export function OfflinePill() {
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' && !navigator.onLine);
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (!offline) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-toast flex justify-center p-2">
      <div className="pointer-events-auto flex items-center gap-2 rounded-pill border border-border bg-bgElevated/90 px-3 py-1.5 text-small text-textMuted shadow-card backdrop-blur-md">
        <Icon name="refresh" size={14} className="text-textFaint" />
        Offline, showing your latest.
      </div>
    </div>
  );
}
