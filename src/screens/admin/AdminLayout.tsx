import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { screenEnter } from '@/lib/motion';
import { cx } from '@/lib/cx';
import { useActiveMembership } from '@/app/state/session';
import { IconButton, type IconName, Icon } from '@/components/ui';

const SECTIONS: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/admin', label: 'Dashboard', icon: 'home', end: true },
  { to: '/admin/reports', label: 'Reports', icon: 'shield' },
  { to: '/admin/hidden', label: 'Hidden', icon: 'eye' },
  { to: '/admin/delays', label: 'First posts', icon: 'clock' },
  { to: '/admin/members', label: 'Members', icon: 'users' },
  { to: '/admin/log', label: 'Action log', icon: 'listings' },
  { to: '/admin/config', label: 'Config', icon: 'settings' },
  { to: '/admin/seeding', label: 'Seeding', icon: 'sparkle' },
];

/** Shared scaffold for the admin console (spec 07 §Admin). Header + section nav + Outlet.
 *  Platform-role gated upstream by RequireAdminLayout. */
export function AdminLayout() {
  const navigate = useNavigate();
  const active = useActiveMembership();
  return (
    <motion.main
      id="main"
      variants={screenEnter}
      initial="initial"
      animate="animate"
      className="mx-auto max-w-3xl px-screenX py-6"
    >
      <header className="flex items-center gap-2">
        <IconButton icon="back" ariaLabel="Back to app" size="sm" onClick={() => navigate('/home')} />
        <div>
          <h1 className="font-display text-h1 font-bold text-text">Admin</h1>
          <p className="text-small text-textMuted">{active?.name ?? 'No community selected'}</p>
        </div>
      </header>

      <nav aria-label="Admin sections" className="mt-4 flex gap-1 overflow-x-auto pb-2">
        {SECTIONS.map((s) => (
          <NavLink
            key={s.to}
            to={s.to}
            end={s.end ?? false}
            className={({ isActive }) =>
              cx(
                'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-small transition-colors',
                isActive
                  ? 'border-transparent bg-accent text-textOnAccent'
                  : 'border-border text-textMuted hover:border-borderStrong hover:text-text',
              )
            }
          >
            <Icon name={s.icon} size={15} />
            {s.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-5 space-y-sectionGap">
        <Outlet />
      </div>
    </motion.main>
  );
}
