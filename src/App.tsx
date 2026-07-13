import { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { AppBootstrap } from '@/app/AppBootstrap';
import { GalleryScreen } from '@/dev/gallery/GalleryScreen';
import { BrandLogo, Button } from '@/components/ui';
import { readStore } from '@/lib/storage';

/** /dev/* routes are gated: dev build, `?dev=1`, or a stored unlock (TECH_STACK feature flags). */
function devEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('dev')) return true;
  return readStore('dev-unlock') === '1';
}

/** Announces route changes to assistive tech (Elevra fix #9). */
function RouteAnnouncer() {
  const { pathname } = useLocation();
  const [msg, setMsg] = useState('');
  useEffect(() => {
    setMsg(document.title || pathname);
  }, [pathname]);
  return (
    <div aria-live="polite" className="sr-only">
      {msg}
    </div>
  );
}

function Home() {
  const dev = devEnabled();
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-6 px-screenX text-center">
      <BrandLogo size={72} />
      <div className="space-y-2">
        <h1 className="font-display text-display font-bold text-text">Local</h1>
        <p className="text-body text-textMuted">
          Your community, in one place. Foundation and design system are in place; the first
          screens land next.
        </p>
      </div>
      {dev && (
        <Link to="/dev/gallery">
          <Button variant="primary" size="xl" trailingIcon="chevron-right">
            Open the primitive gallery
          </Button>
        </Link>
      )}
    </main>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppBootstrap>
        <RouteAnnouncer />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/dev/gallery"
            element={devEnabled() ? <GalleryScreen /> : <Navigate to="/" replace />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppBootstrap>
    </BrowserRouter>
  );
}
