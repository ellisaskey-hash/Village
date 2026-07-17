import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { screenEnter } from '@/lib/motion';
import { cx } from '@/lib/cx';
import { useActiveMembership } from '@/app/state/session';
import { useServices } from '@/lib/services/provider';
import { Badge, IconButton, type IconName, Icon } from '@/components/ui';
import type { AdminDashboard } from '@/lib/services/types';

const SECTIONS: { to: string; label: string; icon: IconName; end?: boolean; badge?: keyof AdminDashboard }[] = [
  { to: '/admin', label: 'Dashboard', icon: 'home', end: true },
  { to: '/admin/reports', label: 'Reports', icon: 'shield', badge: 'openReports' },
  { to: '/admin/hidden', label: 'Hidden', icon: 'eye', badge: 'hiddenItems' },
  { to: '/admin/delays', label: 'First posts', icon: 'clock', badge: 'delayedPosts' },
  { to: '/admin/members', label: 'Members', icon: 'users' },
  { to: '/admin/log', label: 'Action log', icon: 'listings' },
  { to: '/admin/config', label: 'Config', icon: 'settings' },
  { to: '/admin/seeding', label: 'Seeding', icon: 'sparkle' },
];

/** Shared scaffold for the admin console (spec 07 §Admin). Header + section nav + Outlet. On
 *  desktop the nav is a persistent left rail and the console widens to a real two-column tool;
 *  on mobile it stays a scrolling pill row. Platform-role gated upstream by RequireAdminLayout. */
export function AdminLayout() {
  const navigate = useNavigate();
  const active = useActiveMembership();
  const services = useServices();
  const communityId = active?.communityId ?? '';
  const dash = useQuery({
    queryKey: ['admin', 'dashboard', communityId],
    queryFn: () => services.moderation.dashboard(communityId),
    enabled: Boolean(communityId),
    refetchInterval: 30_000,
  });

  return (
    <motion.main
      id="main"
      variants={screenEnter}
      initial="initial"
      animate="animate"
      className="mx-auto max-w-3xl px-screenX py-6 lg:max-w-6xl"
    >
      <header className="flex items-center gap-2">
        <IconButton icon="back" ariaLabel="Back to app" size="sm" onClick={() => navigate('/home')} />
        <div>
          <h1 className="font-display text-h1 font-bold text-text">Admin</h1>
          <p className="text-small text-textMuted">{active?.name ?? 'No community selected'}</p>
        </div>
      </header>

      <div className="mt-4 lg:flex lg:gap-6">
        <nav
          aria-label="Admin sections"
          className="flex gap-1 overflow-x-auto pb-2 lg:w-52 lg:shrink-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0"
        >
          {SECTIONS.map((s) => {
            const count = s.badge ? (dash.data?.[s.badge] ?? 0) : 0;
            return (
              <NavLink
                key={s.to}
                to={s.to}
                end={s.end ?? false}
                className={({ isActive }) =>
                  cx(
                    'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-small transition-colors lg:w-full lg:rounded-lg lg:py-2',
                    isActive
                      ? 'border-transparent bg-accent text-textOnAccent lg:bg-surface lg:text-accent'
                      : 'border-border text-textMuted hover:border-borderStrong hover:text-text lg:border-transparent lg:hover:bg-surface',
                  )
                }
              >
                <Icon name={s.icon} size={15} />
                <span className="lg:flex-1">{s.label}</span>
                {count > 0 && <Badge count={count} tone="warn" />}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-5 flex-1 space-y-sectionGap lg:mt-0 lg:min-w-0">
          <Outlet />
        </div>
      </div>
    </motion.main>
  );
}
