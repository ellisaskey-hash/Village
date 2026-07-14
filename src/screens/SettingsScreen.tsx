import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { screenEnter } from '@/lib/motion';
import { useThemeStore, type ThemePref } from '@/app/state/theme';
import {
  useA11yStore,
  type Accent,
  type Contrast,
  type Density,
  type FontPref,
  type MotionPref,
} from '@/app/state/a11y';
import { useServices } from '@/lib/services/provider';
import { useSession, useSessionStore } from '@/app/state/session';
import { Card, IconButton, SegmentedControl, Toggle, useToasts } from '@/components/ui';
import type { DmPrivacy } from '@/lib/services/types';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
      <span className="text-body text-text">{label}</span>
      {children}
    </div>
  );
}

export function SettingsScreen() {
  const navigate = useNavigate();
  const push = useToasts();
  const services = useServices();
  const session = useSession();
  const setSession = useSessionStore((s) => s.setSession);

  const { pref, setPref } = useThemeStore();
  const {
    accent,
    setAccent,
    density,
    setDensity,
    font,
    setFont,
    contrast,
    setContrast,
    motion: motionPref,
    setMotion,
  } = useA11yStore();

  async function patchProfile(patch: { dmPrivacy?: DmPrivacy; peopleDirectoryOptIn?: boolean }) {
    if (!session) return;
    try {
      const updated = await services.profiles.update(patch);
      setSession({ ...session, profile: updated });
    } catch {
      push({ title: 'Could not save that setting', variant: 'error' });
    }
  }

  return (
    <motion.div
      variants={screenEnter}
      initial="initial"
      animate="animate"
      className="mx-auto max-w-2xl space-y-6 px-screenX py-6"
    >
      <header className="flex items-center gap-2">
        <IconButton icon="back" ariaLabel="Back" size="sm" onClick={() => navigate('/me')} />
        <h1 className="font-display text-h1 font-bold text-text">Settings</h1>
      </header>

      <section>
        <h2 className="mb-2 text-h3 font-semibold text-text">Appearance</h2>
        <Card className="divide-y divide-border">
          <Row label="Theme">
            <SegmentedControl<ThemePref>
              ariaLabel="Theme"
              value={pref}
              onChange={setPref}
              options={[
                { value: 'system', label: 'Auto' },
                { value: 'dark', label: 'Dark' },
                { value: 'light', label: 'Light' },
              ]}
            />
          </Row>
          <Row label="Accent">
            <SegmentedControl<Accent>
              ariaLabel="Accent colour"
              value={accent}
              onChange={setAccent}
              options={[
                { value: 'leaf', label: 'Leaf' },
                { value: 'honey', label: 'Honey' },
                { value: 'cobalt', label: 'Cobalt' },
              ]}
            />
          </Row>
          <Row label="Text size">
            <SegmentedControl<Density>
              ariaLabel="Text size"
              value={density}
              onChange={setDensity}
              options={[
                { value: 'compact', label: 'S' },
                { value: 'regular', label: 'M' },
                { value: 'spacious', label: 'L' },
              ]}
            />
          </Row>
          <Row label="Readable font">
            <SegmentedControl<FontPref>
              ariaLabel="Font"
              value={font}
              onChange={setFont}
              options={[
                { value: 'default', label: 'Default' },
                { value: 'dyslexia', label: 'Dyslexia' },
              ]}
            />
          </Row>
          <Row label="High contrast">
            <SegmentedControl<Contrast>
              ariaLabel="Contrast"
              value={contrast}
              onChange={setContrast}
              options={[
                { value: 'normal', label: 'Off' },
                { value: 'high', label: 'On' },
              ]}
            />
          </Row>
          <Row label="Motion">
            <SegmentedControl<MotionPref>
              ariaLabel="Motion"
              value={motionPref}
              onChange={setMotion}
              options={[
                { value: 'system', label: 'Auto' },
                { value: 'reduce', label: 'Reduce' },
                { value: 'full', label: 'Full' },
              ]}
            />
          </Row>
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-h3 font-semibold text-text">Privacy</h2>
        <Card className="divide-y divide-border">
          <Row label="Who can message me directly">
            <SegmentedControl<DmPrivacy>
              ariaLabel="Direct message privacy"
              value={session?.profile.dmPrivacy ?? 'members'}
              onChange={(v) => patchProfile({ dmPrivacy: v })}
              options={[
                { value: 'members', label: 'Members' },
                { value: 'contacts', label: 'Contacts' },
                { value: 'nobody', label: 'Nobody' },
              ]}
            />
          </Row>
          <Row label="Show me in the people directory">
            <Toggle
              srLabel="Show me in the people directory"
              checked={session?.profile.peopleDirectoryOptIn ?? true}
              onChange={(v) => patchProfile({ peopleDirectoryOptIn: v })}
            />
          </Row>
        </Card>
      </section>
    </motion.div>
  );
}
