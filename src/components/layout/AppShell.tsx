import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cx } from '@/lib/cx';
import { pressable, tabIconSpring } from '@/lib/motion';
import { BrandLogo, Icon, IconButton, RadioGroup, Sheet, type IconName } from '@/components/ui';
import { CommunitySwitcher } from '@/components/layout/CommunitySwitcher';
import { RequestComposer } from '@/screens/compose/RequestComposer';
import { ListingComposer } from '@/screens/compose/ListingComposer';
import { EventComposer } from '@/screens/compose/EventComposer';
import { ServiceComposer } from '@/screens/compose/ServiceComposer';
import { SkillComposer } from '@/screens/compose/SkillComposer';
import { EquipmentComposer } from '@/screens/compose/EquipmentComposer';
import { AlertComposer } from '@/screens/compose/AlertComposer';
import { SearchSheet } from '@/screens/SearchSheet';

type Composer = 'none' | 'request' | 'sell' | 'equipment' | 'event' | 'service' | 'skill' | 'alert';

interface Tab {
  to: string;
  label: string;
  icon: IconName;
}
const TABS: Tab[] = [
  { to: '/home', label: 'Home', icon: 'home' },
  { to: '/explore', label: 'Explore', icon: 'search' },
  { to: '/inbox', label: 'Inbox', icon: 'messages' },
  { to: '/me', label: 'Me', icon: 'user' },
];

const POST_OPTIONS = [
  { value: 'request', label: 'Request help', helper: 'Ask a neighbour for a hand' },
  { value: 'sell', label: 'Sell or give away', helper: 'List something' },
  { value: 'lend', label: 'Lend or offer equipment', helper: 'Add to the lending library' },
  { value: 'event', label: 'Event', helper: 'Something happening locally' },
  { value: 'alert', label: 'Alert', helper: 'Lost pet, road closure, notice' },
  { value: 'service', label: 'Offer a service', helper: 'Trades and professionals' },
  { value: 'skill', label: 'Share a skill', helper: 'Something you can help with' },
];

export function AppShell() {
  const [postOpen, setPostOpen] = useState(false);
  const [postChoice, setPostChoice] = useState('request');
  const [composer, setComposer] = useState<Composer>('none');
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  // Any screen can open a composer by linking to ?compose=<type> (empty-state CTAs, Home quick
  // actions). We consume the param, open the matching composer, and clear it so it doesn't re-fire.
  useEffect(() => {
    const want = params.get('compose');
    if (!want) return;
    const map: Record<string, Composer> = {
      request: 'request', sell: 'sell', lend: 'equipment', event: 'event',
      service: 'service', skill: 'skill', alert: 'alert',
    };
    if (map[want]) setComposer(map[want]);
    setParams((p) => { p.delete('compose'); return p; }, { replace: true });
  }, [params, setParams]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function startPost() {
    setPostOpen(false);
    const map: Record<string, Composer> = {
      request: 'request',
      sell: 'sell',
      lend: 'equipment',
      event: 'event',
      service: 'service',
      skill: 'skill',
      alert: 'alert',
    };
    setComposer(map[postChoice] ?? 'none');
  }

  return (
    <div className="min-h-dvh lg:flex">
      {/* Desktop left rail */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-bgElevated/60 px-3 py-5 backdrop-blur-md lg:flex">
        <div className="px-2">
          <BrandLogo withWordmark />
        </div>
        <div className="mt-3">
          <CommunitySwitcher variant="rail" />
        </div>
        <nav className="mt-4 flex flex-col gap-1">
          {TABS.map((t) => (
            <RailLink key={t.to} {...t} />
          ))}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-body font-medium text-textMuted transition-colors hover:bg-surface hover:text-text"
          >
            <Icon name="search" size={20} /> Search
          </button>
        </nav>
        <button
          type="button"
          onClick={() => setPostOpen(true)}
          className="mt-4 inline-flex items-center gap-2 rounded-pill bg-brand px-4 py-2.5 font-display font-semibold text-textOnAccent shadow-glowAccent"
        >
          <Icon name="plus" size={18} /> Post
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-header flex items-center gap-3 border-b border-border bg-[var(--c-glass-panel-bg)] px-screenX py-3 backdrop-blur-md lg:hidden">
          <BrandLogo />
          <CommunitySwitcher variant="header" />
          <div className="ml-auto flex items-center gap-1">
            <IconButton icon="search" ariaLabel="Search" size="sm" onClick={() => setSearchOpen(true)} />
            <IconButton icon="bell" ariaLabel="Notifications" size="sm" onClick={() => navigate('/inbox')} />
          </div>
        </header>

        <main id="main" className="flex-1 pb-[calc(64px+env(safe-area-inset-bottom)+24px)] lg:pb-10">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="Primary"
        className="safe-bottom fixed inset-x-0 bottom-0 z-tabBar flex min-h-[64px] items-center justify-around border-t border-border bg-[var(--c-glass-panel-bg)] backdrop-blur-md lg:hidden"
      >
        <TabItem {...TABS[0]!} />
        <TabItem {...TABS[1]!} />
        <PostButton onClick={() => setPostOpen(true)} />
        <TabItem {...TABS[2]!} />
        <TabItem {...TABS[3]!} />
      </nav>

      <Sheet open={postOpen} onClose={() => setPostOpen(false)} title="Post to your community" hero={{ icon: 'plus', tone: 'accent' }}>
        <div className="space-y-4">
          <RadioGroup
            ariaLabel="What would you like to post?"
            value={postChoice}
            onChange={setPostChoice}
            options={POST_OPTIONS}
          />
          <button
            type="button"
            onClick={startPost}
            className="w-full rounded-md bg-brand px-4 py-3 font-display font-semibold text-textOnAccent shadow-glowAccent"
          >
            Continue
          </button>
        </div>
      </Sheet>

      <RequestComposer open={composer === 'request'} onClose={() => setComposer('none')} />
      <ListingComposer open={composer === 'sell'} onClose={() => setComposer('none')} />
      <EquipmentComposer open={composer === 'equipment'} onClose={() => setComposer('none')} />
      <EventComposer open={composer === 'event'} onClose={() => setComposer('none')} />
      <ServiceComposer open={composer === 'service'} onClose={() => setComposer('none')} />
      <SkillComposer open={composer === 'skill'} onClose={() => setComposer('none')} />
      <AlertComposer open={composer === 'alert'} onClose={() => setComposer('none')} />
      <SearchSheet open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

function TabItem({ to, label, icon }: Tab) {
  return (
    <NavLink to={to} end={to === '/'} className="flex flex-1 justify-center" aria-label={label}>
      {({ isActive }) => (
        <motion.span
          whileTap={pressable.whileTap}
          transition={pressable.transition}
          className={cx(
            'flex flex-col items-center gap-0.5 text-micro',
            isActive ? 'text-accent' : 'text-textMuted',
          )}
        >
          {/* NavLink sets aria-current="page" on the <a> itself; the active icon springs up
              with an accent glow so the current tab reads at a glance. */}
          <motion.span
            animate={{ scale: isActive ? 1.1 : 1 }}
            transition={tabIconSpring}
            className={cx('inline-flex rounded-full', isActive && 'shadow-glowAccent')}
          >
            <Icon name={icon} size={22} />
          </motion.span>
          {label}
        </motion.span>
      )}
    </NavLink>
  );
}

function RailLink({ to, label, icon }: Tab) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cx(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-body font-medium transition-colors',
          isActive ? 'bg-surface text-accent' : 'text-textMuted hover:bg-surface hover:text-text',
        )
      }
    >
      <Icon name={icon} size={20} />
      {label}
    </NavLink>
  );
}

function PostButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label="Post"
      whileTap={pressable.whileTap}
      transition={pressable.transition}
      className="flex flex-1 justify-center"
    >
      <span className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-textOnAccent shadow-glowAccent motion-safe:animate-breath">
        <Icon name="plus" size={26} />
      </span>
    </motion.button>
  );
}
