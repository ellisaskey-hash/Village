import { useEffect, useState, lazy, Suspense } from 'react';
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
import { EventDetail } from '@/screens/events/EventDetail';
import { EquipmentDetail } from '@/screens/directory/EquipmentDetail';
// Code-split the admin console + dev gallery: most members never open them, so they should not
// sit in everyone's main chunk (M8 performance pass, spec 10 / PERFORMANCE.md code-split).
const SeedingConsole = lazy(() => import('@/screens/admin/SeedingConsole').then((m) => ({ default: m.SeedingConsole })));
const AdminLayout = lazy(() => import('@/screens/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const AdminDashboard = lazy(() => import('@/screens/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const ReportsQueue = lazy(() => import('@/screens/admin/ReportsQueue').then((m) => ({ default: m.ReportsQueue })));
const HiddenQueue = lazy(() => import('@/screens/admin/AdminQueues').then((m) => ({ default: m.HiddenQueue })));
const DelaysQueue = lazy(() => import('@/screens/admin/AdminQueues').then((m) => ({ default: m.DelaysQueue })));
const ModerationLog = lazy(() => import('@/screens/admin/AdminQueues').then((m) => ({ default: m.ModerationLog })));
const MembersQueue = lazy(() => import('@/screens/admin/MembersQueue').then((m) => ({ default: m.MembersQueue })));
const CommunityConfig = lazy(() => import('@/screens/admin/CommunityConfig').then((m) => ({ default: m.CommunityConfig })));
const GalleryScreen = lazy(() => import('@/dev/gallery/GalleryScreen').then((m) => ({ default: m.GalleryScreen })));
import { WelcomeScreen } from '@/screens/auth/WelcomeScreen';
import { SignInScreen } from '@/screens/auth/SignInScreen';
import { SignUpScreen } from '@/screens/auth/SignUpScreen';
import { OnboardingScreen } from '@/screens/auth/OnboardingScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { ExploreScreen } from '@/screens/ExploreScreen';
import { InboxScreen } from '@/screens/InboxScreen';
import { MeScreen } from '@/screens/MeScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { LandingScreen } from '@/screens/LandingScreen';
import { BrandLogo } from '@/components/ui';
import { useSession, useSessionStore } from '@/app/state/session';
import { readStore } from '@/lib/storage';

/** Public landing for logged-out visitors; members go straight to the app. */
function RootSwitch() {
  const status = useSessionStore((s) => s.status);
  const session = useSession();
  if (status === 'loading') {
    return (
      <div id="main" className="flex min-h-dvh items-center justify-center">
        <BrandLogo size={56} />
      </div>
    );
  }
  if (session) {
    return <Navigate to={session.memberships.length > 0 ? '/home' : '/welcome'} replace />;
  }
  return <LandingScreen />;
}

/** Fallback while a lazily-loaded route chunk (admin console / dev gallery) fetches. */
function RouteFallback() {
  return (
    <div id="main" className="flex min-h-dvh items-center justify-center">
      <BrandLogo size={56} />
    </div>
  );
}

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
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<RootSwitch />} />

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
              <Route path="/home" element={<HomeScreen />} />
              <Route path="/explore" element={<ExploreScreen />} />
              <Route path="/inbox" element={<InboxScreen />} />
              <Route path="/me" element={<MeScreen />} />
              <Route path="/me/settings" element={<SettingsScreen />} />
              <Route path="/businesses/:id" element={<BusinessDetail />} />
              <Route path="/places/:id" element={<PlaceDetail />} />
              <Route path="/organisations/:id" element={<OrganisationDetail />} />
              <Route path="/listings/:id" element={<ListingDetail />} />
              <Route path="/requests/:id" element={<RequestDetail />} />
              <Route path="/events/:id" element={<EventDetail />} />
              <Route path="/equipment/:id" element={<EquipmentDetail />} />
              <Route path="/inbox/t/:id" element={<ThreadScreen />} />
            </Route>
          </Route>

          <Route element={<RequireAdminLayout />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/reports" element={<ReportsQueue />} />
              <Route path="/admin/hidden" element={<HiddenQueue />} />
              <Route path="/admin/delays" element={<DelaysQueue />} />
              <Route path="/admin/members" element={<MembersQueue />} />
              <Route path="/admin/log" element={<ModerationLog />} />
              <Route path="/admin/config" element={<CommunityConfig />} />
            </Route>
            <Route path="/admin/seeding" element={<SeedingConsole />} />
          </Route>

          <Route
            path="/dev/gallery"
            element={devEnabled() ? <GalleryScreen /> : <Navigate to="/" replace />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </AppBootstrap>
    </BrowserRouter>
  );
}
