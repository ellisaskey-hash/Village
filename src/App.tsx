import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppBootstrap } from '@/app/AppBootstrap';
import {
  AnonOnlyLayout,
  InviteRedirect,
  RequireAdminLayout,
  RequireAuthLayout,
  RequireMembershipLayout,
} from '@/app/Guards';
import { AppShell } from '@/components/layout/AppShell';
import { BusinessDetail } from '@/screens/directory/BusinessDetail';
import { PlaceDetail } from '@/screens/directory/PlaceDetail';
import { OrganisationDetail } from '@/screens/directory/OrganisationDetail';
import { ListingDetail } from '@/screens/content/ListingDetail';
import { RequestDetail } from '@/screens/content/RequestDetail';
import { ThreadScreen } from '@/screens/content/ThreadScreen';
import { SeedingConsole } from '@/screens/admin/SeedingConsole';
import { WelcomeScreen } from '@/screens/auth/WelcomeScreen';
import { SignInScreen } from '@/screens/auth/SignInScreen';
import { SignUpScreen } from '@/screens/auth/SignUpScreen';
import { OnboardingScreen } from '@/screens/auth/OnboardingScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { ExploreScreen } from '@/screens/ExploreScreen';
import { InboxScreen } from '@/screens/InboxScreen';
import { MeScreen } from '@/screens/MeScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { GalleryScreen } from '@/dev/gallery/GalleryScreen';
import { readStore } from '@/lib/storage';

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

export function App() {
  return (
    <BrowserRouter>
      <AppBootstrap>
        <RouteAnnouncer />
        <Routes>
          <Route element={<AnonOnlyLayout />}>
            <Route path="/welcome" element={<WelcomeScreen />} />
            <Route path="/j/:code" element={<InviteRedirect />} />
            <Route path="/auth/sign-in" element={<SignInScreen />} />
            <Route path="/auth/sign-up" element={<SignUpScreen />} />
          </Route>

          <Route element={<RequireAuthLayout />}>
            <Route path="/onboarding" element={<OnboardingScreen />} />
          </Route>

          <Route element={<RequireMembershipLayout />}>
            <Route element={<AppShell />}>
              <Route index element={<HomeScreen />} />
              <Route path="/explore" element={<ExploreScreen />} />
              <Route path="/inbox" element={<InboxScreen />} />
              <Route path="/me" element={<MeScreen />} />
              <Route path="/me/settings" element={<SettingsScreen />} />
              <Route path="/businesses/:id" element={<BusinessDetail />} />
              <Route path="/places/:id" element={<PlaceDetail />} />
              <Route path="/organisations/:id" element={<OrganisationDetail />} />
              <Route path="/listings/:id" element={<ListingDetail />} />
              <Route path="/requests/:id" element={<RequestDetail />} />
              <Route path="/inbox/t/:id" element={<ThreadScreen />} />
            </Route>
          </Route>

          <Route element={<RequireAdminLayout />}>
            <Route path="/admin/seeding" element={<SeedingConsole />} />
          </Route>

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
