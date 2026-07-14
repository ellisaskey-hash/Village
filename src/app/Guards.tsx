import { Navigate, Outlet, useParams } from 'react-router-dom';
import { BrandLogo } from '@/components/ui';
import { useSession, useSessionStore } from '@/app/state/session';
import { useServices } from '@/lib/services/provider';

function Splash() {
  return (
    <div id="main" className="flex min-h-dvh items-center justify-center">
      <BrandLogo size={56} />
    </div>
  );
}

/** Authenticated (any membership state). Onboarding lives here. */
export function RequireAuthLayout() {
  const status = useSessionStore((s) => s.status);
  if (status === 'loading') return <Splash />;
  if (status === 'anonymous') return <Navigate to="/welcome" replace />;
  return <Outlet />;
}

/** Authenticated AND a member of at least one community. The app shell lives here. */
export function RequireMembershipLayout() {
  const status = useSessionStore((s) => s.status);
  const session = useSession();
  if (status === 'loading') return <Splash />;
  if (status === 'anonymous') return <Navigate to="/welcome" replace />;
  if (!session || session.memberships.length === 0) return <Navigate to="/welcome" replace />;
  return <Outlet />;
}

/** Public-only (welcome + auth). A settled member is bounced to Home. */
export function AnonOnlyLayout() {
  const status = useSessionStore((s) => s.status);
  const session = useSession();
  if (status === 'loading') return <Splash />;
  if (session && session.memberships.length > 0) return <Navigate to="/" replace />;
  return <Outlet />;
}

/**
 * Platform admin routes (spec 07 — admin is a route tree, not the shell). Access needs
 * `platform_role='admin'`; in demo mode (no DB) it's open so the seeding console is
 * reviewable. The real gate is enforced by RLS + Edge middleware regardless.
 */
export function RequireAdminLayout() {
  const status = useSessionStore((s) => s.status);
  const session = useSession();
  const { isMock } = useServices();
  if (status === 'loading') return <Splash />;
  if (status === 'anonymous' || !session) return <Navigate to="/welcome" replace />;
  if (!isMock && session.profile.platformRole !== 'admin') return <Navigate to="/" replace />;
  return <Outlet />;
}

/** /j/:code invite deep link — carry the code into the welcome + join flow. */
export function InviteRedirect() {
  const { code } = useParams();
  return <Navigate to={`/welcome?invite=${encodeURIComponent(code ?? '')}`} replace />;
}
