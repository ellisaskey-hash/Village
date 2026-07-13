import { useState, type ReactNode } from 'react';
import {
  Avatar,
  Badge,
  Banner,
  BrandLogo,
  Button,
  Card,
  Checkbox,
  Chip,
  EmptyState,
  Field,
  Icon,
  IconBadge,
  IconButton,
  InfoCallout,
  ListRow,
  MetricStat,
  Modal,
  PullToRefresh,
  RadioGroup,
  SearchBar,
  SegmentedControl,
  Select,
  Sheet,
  Skeleton,
  SkeletonCard,
  SkeletonListRow,
  StaggeredBody,
  StatCard,
  SwipeAction,
  Tabs,
  Textarea,
  TextLink,
  Toggle,
  useToasts,
  type Tone,
} from '@/components/ui';
import { useThemeStore, type ThemePref, type Skin } from '@/app/state/theme';
import {
  useA11yStore,
  type Accent,
  type Density,
  type FontPref,
  type Contrast,
  type MotionPref,
} from '@/app/state/a11y';
import { Section, Specimen } from './Section';

const SWATCHES: { name: string; cls: string; ink?: boolean }[] = [
  { name: 'bg', cls: 'bg-bg' },
  { name: 'bgElevated', cls: 'bg-bgElevated' },
  { name: 'bgSunken', cls: 'bg-bgSunken' },
  { name: 'accent', cls: 'bg-accent' },
  { name: 'accentWarm', cls: 'bg-accentWarm' },
  { name: 'positive', cls: 'bg-positive' },
  { name: 'warn', cls: 'bg-warn' },
  { name: 'danger', cls: 'bg-danger' },
  { name: 'info', cls: 'bg-info' },
  { name: 'purple', cls: 'bg-purple' },
  { name: 'text', cls: 'bg-text' },
  { name: 'textMuted', cls: 'bg-textMuted' },
  { name: 'textFaint', cls: 'bg-textFaint' },
];

const TYPE_SCALE: { name: string; cls: string }[] = [
  { name: 'display', cls: 'text-display font-display' },
  { name: 'h1', cls: 'text-h1 font-display' },
  { name: 'h2', cls: 'text-h2' },
  { name: 'h3', cls: 'text-h3' },
  { name: 'body', cls: 'text-body' },
  { name: 'small', cls: 'text-small' },
  { name: 'micro', cls: 'text-micro' },
  { name: 'eyebrow', cls: 'text-eyebrow uppercase' },
];

const RADII: { name: string; cls: string }[] = [
  { name: 'sm 8', cls: 'rounded-sm' },
  { name: 'md 12', cls: 'rounded-md' },
  { name: 'lg 16', cls: 'rounded-lg' },
  { name: 'xl 20', cls: 'rounded-xl' },
  { name: 'sheet 24', cls: 'rounded-sheet' },
  { name: 'pill', cls: 'rounded-pill' },
];

const SHADOWS: { name: string; cls: string }[] = [
  { name: 'card', cls: 'shadow-card' },
  { name: 'raised', cls: 'shadow-raised' },
  { name: 'glowAccent', cls: 'shadow-glowAccent' },
  { name: 'glowWarm', cls: 'shadow-glowWarm' },
];

const TONES: Tone[] = ['accent', 'positive', 'warn', 'danger', 'info', 'purple', 'neutral'];

function ControlBar() {
  const { pref, setPref, skin, setSkin } = useThemeStore();
  const { accent, setAccent, density, setDensity, font, setFont, contrast, setContrast, motion, setMotion } =
    useA11yStore();

  return (
    <header className="sticky top-0 z-header border-b border-border bg-[var(--c-glass-panel-bg)] backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-screenX py-3">
        <BrandLogo withWordmark />
        <span className="text-small text-textMuted">Primitive gallery</span>
        <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2">
          <Labelled label="Theme">
            <SegmentedControl<ThemePref>
              ariaLabel="Theme"
              value={pref}
              onChange={setPref}
              options={[
                { value: 'system', label: 'System' },
                { value: 'dark', label: 'Dark' },
                { value: 'light', label: 'Light' },
              ]}
            />
          </Labelled>
          <Labelled label="Skin">
            <SegmentedControl<Skin>
              ariaLabel="Community skin"
              value={skin}
              onChange={setSkin}
              options={[
                { value: 'village', label: 'Village' },
                { value: 'estate', label: 'Estate' },
              ]}
            />
          </Labelled>
          <Labelled label="Accent">
            <SegmentedControl<Accent>
              ariaLabel="Accent"
              value={accent}
              onChange={setAccent}
              options={[
                { value: 'leaf', label: 'Leaf' },
                { value: 'honey', label: 'Honey' },
                { value: 'cobalt', label: 'Cobalt' },
              ]}
            />
          </Labelled>
          <Labelled label="Density">
            <SegmentedControl<Density>
              ariaLabel="Density"
              value={density}
              onChange={setDensity}
              options={[
                { value: 'compact', label: 'S' },
                { value: 'regular', label: 'M' },
                { value: 'spacious', label: 'L' },
              ]}
            />
          </Labelled>
          <Labelled label="Contrast">
            <SegmentedControl<Contrast>
              ariaLabel="Contrast"
              value={contrast}
              onChange={setContrast}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'high', label: 'High' },
              ]}
            />
          </Labelled>
          <Labelled label="Font">
            <SegmentedControl<FontPref>
              ariaLabel="Font"
              value={font}
              onChange={setFont}
              options={[
                { value: 'default', label: 'Default' },
                { value: 'dyslexia', label: 'Dyslexia' },
              ]}
            />
          </Labelled>
          <Labelled label="Motion">
            <SegmentedControl<MotionPref>
              ariaLabel="Motion"
              value={motion}
              onChange={setMotion}
              options={[
                { value: 'system', label: 'System' },
                { value: 'reduce', label: 'Reduce' },
                { value: 'full', label: 'Full' },
              ]}
            />
          </Labelled>
        </div>
      </div>
    </header>
  );
}

function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-eyebrow uppercase text-textFaint">{label}</span>
      {children}
    </label>
  );
}

export function GalleryScreen() {
  const push = useToasts();
  const [seg, setSeg] = useState('all');
  const [tab, setTab] = useState('overview');
  const [toggleOn, setToggleOn] = useState(true);
  const [checked, setChecked] = useState(true);
  const [radio, setRadio] = useState('village');
  const [search, setSearch] = useState('');
  const [chipSel, setChipSel] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [centerOpen, setCenterOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [destroyOpen, setDestroyOpen] = useState(false);
  const [swiped, setSwiped] = useState(false);

  return (
    <div className="min-h-dvh">
      <ControlBar />
      <main id="main" className="mx-auto flex max-w-5xl flex-col gap-14 px-screenX py-10">
        <h1 className="sr-only">Local primitive gallery</h1>
        {/* FOUNDATIONS -------------------------------------------------- */}
        <Section id="foundations" title="Foundations" subtitle="Colour, type, radius, shadow, all resolved from tokens.">
          <div className="grid gap-8">
            <Specimen label="Colour tokens">
              <div className="flex flex-wrap gap-3">
                {SWATCHES.map((s) => (
                  <div key={s.name} className="flex flex-col items-center gap-1">
                    <span className={`h-12 w-12 rounded-md border border-border ${s.cls}`} />
                    <span className="text-micro text-textMuted">{s.name}</span>
                  </div>
                ))}
              </div>
            </Specimen>

            <Specimen label="Type scale">
              <div className="flex flex-col gap-2">
                {TYPE_SCALE.map((t) => (
                  <div key={t.name} className="flex items-baseline gap-4">
                    <span className="w-16 shrink-0 text-micro text-textFaint">{t.name}</span>
                    <span className={`${t.cls} text-text`}>Village at dusk</span>
                  </div>
                ))}
              </div>
            </Specimen>

            <div className="grid gap-8 sm:grid-cols-2">
              <Specimen label="Radius">
                <div className="flex flex-wrap gap-3">
                  {RADII.map((r) => (
                    <div key={r.name} className="flex flex-col items-center gap-1">
                      <span className={`h-12 w-12 border border-borderStrong bg-surface ${r.cls}`} />
                      <span className="text-micro text-textMuted">{r.name}</span>
                    </div>
                  ))}
                </div>
              </Specimen>
              <Specimen label="Shadow / glow">
                <div className="flex flex-wrap gap-4">
                  {SHADOWS.map((s) => (
                    <div key={s.name} className="flex flex-col items-center gap-1">
                      <span className={`h-12 w-12 rounded-lg bg-bgElevated ${s.cls}`} />
                      <span className="text-micro text-textMuted">{s.name}</span>
                    </div>
                  ))}
                </div>
              </Specimen>
            </div>
          </div>
        </Section>

        {/* BUTTONS ------------------------------------------------------ */}
        <Section id="buttons" title="Button" subtitle="Two-size canon (sm / xl) across five variants.">
          <div className="grid gap-6">
            <Specimen label="Variants (sm)">
              <Button variant="primary" leadingIcon="check">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Remove</Button>
              <Button variant="pill" leadingIcon="filter">Filter</Button>
            </Specimen>
            <Specimen label="State">
              <Button variant="primary" loading>Saving</Button>
              <Button variant="primary" disabled>Disabled</Button>
              <Button variant="secondary" trailingIcon="chevron-right">Continue</Button>
            </Specimen>
            <Specimen label="Size xl / full width">
              <div className="w-full max-w-xs">
                <Button variant="primary" size="xl" fullWidth leadingIcon="send">Send request</Button>
              </div>
            </Specimen>
          </div>
        </Section>

        {/* ICON BUTTON + CHIPS + BADGES -------------------------------- */}
        <Section id="controls" title="Icon buttons, chips, badges">
          <div className="grid gap-6">
            <Specimen label="IconButton (sm / md / lg, ghost + surface, badge)">
              <IconButton icon="search" ariaLabel="Search" size="sm" />
              <IconButton icon="bell" ariaLabel="Alerts" size="md" showBadge />
              <IconButton icon="settings" ariaLabel="Settings" size="lg" variant="surface" />
              <IconButton icon="close" ariaLabel="Close" size="md" disabled />
            </Specimen>
            <Specimen label="Chip tones: tint (unselected + selected) and solid">
              <Chip>All</Chip>
              <Chip tone="accent" selected={chipSel} onClick={() => setChipSel((v) => !v)} leadingIcon="requests">
                Requests
              </Chip>
              <Chip tone="warn" selected>Alerts</Chip>
              <Chip tone="info" selected variant="solid">This week</Chip>
            </Specimen>
            <Specimen label="Badge">
              <Badge count={3} />
              <Badge count={128} tone="danger" />
              <Badge dot tone="positive" />
              <span className="relative inline-flex">
                <IconButton icon="messages" ariaLabel="Messages" />
                <span className="absolute -right-0.5 -top-0.5">
                  <Badge count={5} />
                </span>
              </span>
            </Specimen>
          </div>
        </Section>

        {/* INPUTS ------------------------------------------------------- */}
        <Section id="inputs" title="Inputs" subtitle="16px floor everywhere; 44px touch targets.">
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Your name" placeholder="e.g. Sam Fletcher" />
            <Field label="Email" type="email" defaultValue="sam@example.com" suffixSlot={<Icon name="check" size={16} />} />
            <Field label="Postcode" error="We don't recognise that postcode" defaultValue="ZZ99" />
            <Field label="Locked" disabled defaultValue="Read only" />
            <Textarea label="Notes" placeholder="Tell your neighbours a little more" maxLength={140} />
            <Select
              label="Community type"
              options={[
                { value: 'village', label: 'Village' },
                { value: 'estate', label: 'Estate' },
                { value: 'retirement', label: 'Retirement' },
              ]}
            />
            <div className="flex flex-col gap-3">
              <SearchBar value={search} onChange={setSearch} placeholder="Search the directory" />
              <Checkbox checked={checked} onChange={setChecked} label="Show my street on my profile" helper="Neighbours only" />
              <label className="flex items-center justify-between">
                <span className="text-body text-text">Weekly digest</span>
                <Toggle checked={toggleOn} onChange={setToggleOn} srLabel="Weekly digest" />
              </label>
            </div>
            <RadioGroup
              ariaLabel="Community type"
              value={radio}
              onChange={setRadio}
              options={[
                { value: 'village', label: 'Village', helper: 'Social boundary, not a radius' },
                { value: 'estate', label: 'Estate', helper: 'A managed block or estate' },
                { value: 'retirement', label: 'Retirement', helper: 'Spacious + high contrast by default' },
              ]}
            />
          </div>
          <div className="mt-6 grid gap-6">
            <Specimen label="SegmentedControl">
              <SegmentedControl
                ariaLabel="Filter"
                value={seg}
                onChange={setSeg}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'near', label: 'Near me' },
                  { value: 'new', label: 'New' },
                  { value: 'mine', label: 'Mine', disabled: true },
                ]}
              />
            </Specimen>
            <Specimen label="Tabs">
              <Tabs
                ariaLabel="Detail tabs"
                value={tab}
                onChange={setTab}
                tabs={[
                  { value: 'overview', label: 'Overview' },
                  { value: 'activity', label: 'Activity' },
                  { value: 'about', label: 'About' },
                ]}
              />
            </Specimen>
          </div>
        </Section>

        {/* DATA DISPLAY ------------------------------------------------- */}
        <Section id="data" title="Data display">
          <div className="grid gap-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <p className="text-h3 font-semibold text-text">Default card</p>
                <p className="mt-1 text-small text-textMuted">Frosted surface, lg radius.</p>
              </Card>
              <Card variant="featured">
                <p className="text-h3 font-semibold text-text">Featured</p>
                <p className="mt-1 text-small text-textMuted">Accent glow for a highlight.</p>
              </Card>
              <Card variant="pressable" onClick={() => push({ title: 'Card tapped', variant: 'info' })}>
                <p className="text-h3 font-semibold text-text">Pressable</p>
                <p className="mt-1 text-small text-textMuted">Hover lifts, press settles.</p>
              </Card>
            </div>

            <Specimen label="IconBadge tones">
              {TONES.map((t) => (
                <IconBadge key={t} icon="sparkle" tone={t} size="md" />
              ))}
            </Specimen>

            <Specimen label="Avatar">
              <Avatar name="Sam Fletcher" size="sm" />
              <Avatar name="Priya Nair" size="md" />
              <Avatar name="Tom Barwell" size="lg" />
              <Avatar size="xl" />
            </Specimen>

            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <MetricStat value="248" label="Neighbours" delta={{ value: '+12 this week', direction: 'up' }} />
              </Card>
              <StatCard icon="requests" tone="accent" eyebrow="Open requests" value="7" footer="3 need a reply" valueGradient />
              <StatCard
                icon="events"
                tone="warn"
                eyebrow="This week"
                value="4"
                footer={<TextLink onClick={() => push({ title: 'See all events' })}>See all</TextLink>}
              />
            </div>

            <Specimen label="ListRow (plain + surface + pressable)">
              <div className="w-full max-w-md space-y-2">
                <ListRow leading={<Avatar name="Priya Nair" size="sm" />} title="Priya Nair" subtitle="Offered to help with the fete" />
                <ListRow
                  surface
                  leading={<IconBadge icon="listings" tone="info" />}
                  title="Garden bench, free to a good home"
                  subtitle="Listed 2 days ago"
                  trailing={<Badge count={2} tone="info" />}
                />
                <ListRow
                  leading={<IconBadge icon="alerts" tone="danger" />}
                  title="Road closure on the High Street"
                  subtitle="Tap for detail"
                  onClick={() => push({ title: 'Opened alert', variant: 'info' })}
                />
              </div>
            </Specimen>

            <Specimen label="Skeleton (loading is skeleton, never a spinner)">
              <div className="w-full max-w-md space-y-3">
                <Skeleton width="40%" height={14} />
                <SkeletonListRow />
                <SkeletonCard />
              </div>
            </Specimen>
          </div>
        </Section>

        {/* FEEDBACK ----------------------------------------------------- */}
        <Section id="feedback" title="Feedback & empty states">
          <div className="grid gap-4">
            <Banner tone="accent" icon="sparkle" title="Welcome to Horsmonden" body="We've seeded the directory so it's useful from day one." action={{ label: 'Take a look', onClick: () => push({ title: 'Off you go' }) }} />
            <Banner tone="warn" icon="alert" title="One thing to confirm" body="Add your street to see nearby requests." />
            <InfoCallout heading="Why we ask">
              We only show your street to neighbours in your community, never publicly.
            </InfoCallout>
            <div className="flex flex-wrap items-center gap-4">
              <TextLink onClick={() => push({ title: 'Learn more' })}>Learn more</TextLink>
              <Button variant="secondary" onClick={() => push({ title: 'Saved', body: 'Your changes are in.', variant: 'success' })}>
                Trigger success toast
              </Button>
              <Button variant="secondary" onClick={() => push({ title: 'Something went wrong', variant: 'error' })}>
                Trigger error toast
              </Button>
              <Button variant="secondary" onClick={() => push({ title: 'Update available', variant: 'update', durationMs: 0, action: { label: 'Refresh', onClick: () => undefined } })}>
                Sticky update toast
              </Button>
            </div>
            <EmptyState
              icon="requests"
              title="No requests yet"
              body="Need a hand with something? Post the first request and your neighbours will see it."
              action={{ label: 'Post a request', onClick: () => push({ title: 'Compose opened' }), leadingIcon: 'plus' }}
            />
          </div>
        </Section>

        {/* OVERLAYS ----------------------------------------------------- */}
        <Section id="overlays" title="Overlays" subtitle="Sheet is the only drawer; Modal is for destructive confirms.">
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" onClick={() => setSheetOpen(true)}>Open bottom sheet</Button>
            <Button variant="secondary" onClick={() => setCenterOpen(true)}>Open center sheet</Button>
            <Button variant="secondary" onClick={() => setModalOpen(true)}>Open confirm modal</Button>
            <Button variant="danger" onClick={() => setDestroyOpen(true)}>Open destructive modal</Button>
          </div>
        </Section>

        {/* GESTURES ----------------------------------------------------- */}
        <Section id="gestures" title="Gestures & motion" subtitle="Touch-driven; try on a phone. Motion respects the reduced-motion axis above.">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <span className="text-eyebrow uppercase text-textFaint">PullToRefresh</span>
              <div className="mt-2 h-40 overflow-hidden rounded-lg border border-border bg-bgElevated">
                <PullToRefresh onRefresh={() => push({ title: 'Refreshed', variant: 'success' })}>
                  <div className="space-y-2 p-3">
                    {['Fete planning', 'Lost cat on Maidstone Road', 'Ladder to borrow'].map((t) => (
                      <ListRow key={t} title={t} subtitle="Pull down from the top" />
                    ))}
                  </div>
                </PullToRefresh>
              </div>
            </div>
            <div>
              <span className="text-eyebrow uppercase text-textFaint">SwipeAction (swipe left)</span>
              <div className="mt-2">
                {swiped ? (
                  <p className="rounded-lg border border-border bg-bgElevated p-4 text-small text-textMuted">
                    Row removed. <TextLink onClick={() => setSwiped(false)}>Undo</TextLink>
                  </p>
                ) : (
                  <SwipeAction action={{ icon: 'remove', label: 'Remove', tone: 'danger', onComplete: () => setSwiped(true) }}>
                    <ListRow title="Old sofa, collected" subtitle="Swipe to remove" />
                  </SwipeAction>
                )}
              </div>
            </div>
            <div className="sm:col-span-2">
              <span className="text-eyebrow uppercase text-textFaint">StaggeredBody</span>
              <StaggeredBody className="mt-2 space-y-2">
                {['People', 'Places', 'Events', 'Listings'].map((t) => (
                  <ListRow key={t} title={t} subtitle="Fades and drifts up on mount" />
                ))}
              </StaggeredBody>
            </div>
          </div>
        </Section>

        {/* BRAND -------------------------------------------------------- */}
        <Section id="brand" title="Brand" subtitle="The mark is drawn from CSS variables, so it re-colours with theme, skin and accent.">
          <div className="flex flex-wrap items-center gap-8">
            <BrandLogo size={24} />
            <BrandLogo size={40} withWordmark />
            <BrandLogo size={64} />
          </div>
        </Section>
      </main>

      {/* Overlay instances */}
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Post to your community"
        hero={{ icon: 'requests', tone: 'accent' }}
        footer={<Button variant="primary" size="xl" fullWidth onClick={() => setSheetOpen(false)}>Post request</Button>}
      >
        <StaggeredBody className="space-y-4">
          <Field label="What do you need?" placeholder="e.g. Borrow a ladder for the weekend" />
          <Textarea label="Any detail?" placeholder="A step ladder would be perfect" maxLength={200} />
          <InfoCallout>Only members of your community will see this.</InfoCallout>
        </StaggeredBody>
      </Sheet>

      <Sheet open={centerOpen} onClose={() => setCenterOpen(false)} position="center" title="Filters">
        <div className="space-y-3">
          <SegmentedControl
            ariaLabel="Sort"
            value={seg}
            onChange={setSeg}
            options={[
              { value: 'all', label: 'All' },
              { value: 'near', label: 'Near me' },
              { value: 'new', label: 'Newest' },
            ]}
          />
          <Checkbox checked={checked} onChange={setChecked} label="Only show open requests" />
        </div>
      </Sheet>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Leave this community?"
        hero={{ icon: 'info', tone: 'info' }}
        secondary={{ label: 'Stay', onClick: () => setModalOpen(false) }}
        primary={{ label: 'Leave', onClick: () => setModalOpen(false) }}
        footerNote="You can rejoin at any time."
      >
        You'll stop seeing requests and alerts from Horsmonden.
      </Modal>

      <Modal
        open={destroyOpen}
        onClose={() => setDestroyOpen(false)}
        title="Remove this listing?"
        destructive
        hero={{ icon: 'remove' }}
        secondary={{ label: 'Keep', onClick: () => setDestroyOpen(false) }}
        primary={{ label: 'Remove', onClick: () => setDestroyOpen(false), leadingIcon: 'remove' }}
      >
        This can't be undone.
      </Modal>
    </div>
  );
}
