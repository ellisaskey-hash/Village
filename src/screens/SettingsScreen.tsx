import { type ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cardEnter, screenEnter } from '@/lib/motion';
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
import { Button, Card, IconButton, Modal, SegmentedControl, Toggle, useToasts } from '@/components/ui';
import { errorMessage } from '@/lib/errors';
import type { DmPrivacy } from '@/lib/services/types';

const NOTIF_PREFS: { key: string; label: string }[] = [
  { key: 'alert.community', label: 'Community alerts (lost pets, notices)' },
  { key: 'alert.verified', label: 'Official alerts (road closures, safety)' },
  { key: 'message', label: 'Messages' },
  { key: 'event.reminder', label: 'Event reminders' },
];

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

  const [pushBusy, setPushBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeBusy, setRemoveBusy] = useState(false);
  const prefs = session?.profile.notificationPrefs ?? {};

  async function exportData() {
    setExportBusy(true);
    try {
      const data = await services.account.export();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my-local-data.json';
      a.click();
      URL.revokeObjectURL(url);
      push({ title: 'Your data is downloading', variant: 'success' });
    } catch (e) {
      push({ title: errorMessage(e), variant: 'error' });
    } finally {
      setExportBusy(false);
    }
  }

  async function removeAccount() {
    setRemoveBusy(true);
    try {
      await services.account.delete();
      setSession(null);
      navigate('/welcome');
    } catch (e) {
      push({ title: errorMessage(e), variant: 'error' });
      setRemoveBusy(false);
    }
  }

  async function patchProfile(patch: {
    dmPrivacy?: DmPrivacy;
    peopleDirectoryOptIn?: boolean;
    notificationPrefs?: Record<string, boolean>;
  }) {
    if (!session) return;
    try {
      const updated = await services.profiles.update(patch);
      setSession({ ...session, profile: updated });
    } catch {
      push({ title: 'Could not save that setting', variant: 'error' });
    }
  }

  async function enablePush() {
    setPushBusy(true);
    try {
      const ok = await services.notifications.enablePush();
      push({
        title: ok ? "You're set for push notifications" : 'Push needs the installed app on a supported device',
        variant: ok ? 'success' : 'info',
      });
    } finally {
      setPushBusy(false);
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

      <motion.section variants={cardEnter}>
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
      </motion.section>

      <motion.section variants={cardEnter}>
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
      </motion.section>

      <motion.section variants={cardEnter}>
        <h2 className="mb-2 text-h3 font-semibold text-text">Notifications</h2>
        <Card className="divide-y divide-border">
          {NOTIF_PREFS.map((p) => (
            <Row key={p.key} label={p.label}>
              <Toggle
                srLabel={p.label}
                checked={prefs[p.key] ?? true}
                onChange={(v) => patchProfile({ notificationPrefs: { ...prefs, [p.key]: v } })}
              />
            </Row>
          ))}
          <div className="pt-3">
            <Button variant="secondary" size="sm" leadingIcon="bell" loading={pushBusy} onClick={enablePush}>
              Enable push notifications
            </Button>
            <p className="mt-1.5 text-small text-textFaint">
              Emergency alerts always come through. Everything else follows the switches above.
            </p>
          </div>
        </Card>
      </motion.section>

      <motion.section variants={cardEnter}>
        <h2 className="mb-2 text-h3 font-semibold text-text">Your data</h2>
        <Card className="space-y-3">
          <p className="text-small text-textMuted">
            Take a copy of everything you have shared here, any time.
          </p>
          <Button variant="secondary" size="sm" leadingIcon="download" loading={exportBusy} onClick={exportData}>
            Download my data
          </Button>
        </Card>
      </motion.section>

      <motion.section variants={cardEnter}>
        <h2 className="mb-2 text-small font-semibold uppercase tracking-wide text-danger">Danger zone</h2>
        <Card className="space-y-3 border-danger/40">
          <p className="text-small text-textMuted">
            Closing your account removes your name and details; your posts show as from a former
            neighbour so conversations others took part in still make sense. This cannot be undone.
          </p>
          <Button variant="ghost" size="sm" leadingIcon="remove" className="text-danger hover:bg-danger/10" onClick={() => setRemoveOpen(true)}>
            Remove my account
          </Button>
        </Card>
      </motion.section>

      <Modal
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        title="Remove your account?"
        hero={{ icon: 'alert', tone: 'warn' }}
        destructive
        secondary={{ label: 'Keep my account', onClick: () => setRemoveOpen(false) }}
        primary={{ label: 'Remove account', onClick: removeAccount, loading: removeBusy, leadingIcon: 'remove' }}
      >
        <p className="text-body text-textMuted">
          This signs you out and removes your name, email and profile. It cannot be undone. Your
          posts stay so conversations make sense, but they will no longer show your name.
        </p>
      </Modal>
    </motion.div>
  );
}
