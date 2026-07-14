import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServices } from '@/lib/services/provider';
import { useActiveMembership, useSession } from '@/app/state/session';
import { errorMessage } from '@/lib/errors';
import { Button, Card, Chip, IconBadge, InfoCallout, useToasts } from '@/components/ui';
import type { Identity } from '@/lib/services/types';
import { AuthLayout } from './AuthLayout';

const IDENTITIES: { value: Identity; label: string; adultOnly?: boolean }[] = [
  { value: 'resident', label: 'Resident' },
  { value: 'parent', label: 'Parent' },
  { value: 'tradesperson', label: 'Tradesperson', adultOnly: true },
  { value: 'business', label: 'Business owner', adultOnly: true },
  { value: 'club', label: 'Club or group' },
];

function ageFrom(dob: string): number {
  const d = new Date(dob + 'T00:00:00');
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export function OnboardingScreen() {
  const services = useServices();
  const navigate = useNavigate();
  const push = useToasts();
  const session = useSession();
  const active = useActiveMembership();
  const [selected, setSelected] = useState<Identity[]>(['resident']);
  const [busy, setBusy] = useState(false);

  const isMinor = session ? ageFrom(session.profile.dateOfBirth) < 18 : false;

  function toggle(id: Identity) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  async function requestPush() {
    try {
      if ('Notification' in window) {
        const res = await Notification.requestPermission();
        push({
          title: res === 'granted' ? "You're set for alerts" : 'You can turn alerts on later',
          variant: res === 'granted' ? 'success' : 'info',
        });
      }
    } catch {
      /* not supported */
    }
  }

  async function finish() {
    if (!active) {
      navigate('/welcome');
      return;
    }
    setBusy(true);
    try {
      await services.memberships.updateIdentities(active.communityId, selected);
      navigate('/');
    } catch (err) {
      push({ title: errorMessage(err), variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title={`Welcome to ${active?.name ?? 'your community'}`}
      subtitle="A couple of quick things and you're in."
    >
      <Card>
        <p className="text-body font-medium text-text">How would you describe yourself here?</p>
        <p className="mt-0.5 text-small text-textMuted">Pick any that fit. You can change these later.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {IDENTITIES.map((id) => {
            const locked = id.adultOnly && isMinor;
            return (
              <Chip
                key={id.value}
                selected={selected.includes(id.value)}
                disabled={locked}
                onClick={() => toggle(id.value)}
              >
                {id.label}
              </Chip>
            );
          })}
        </div>
        {isMinor && (
          <p className="mt-2 text-small text-textFaint">
            Some options unlock at 18. You can do everything else a neighbour can.
          </p>
        )}
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <IconBadge icon="bell" tone="warn" size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-body font-medium text-text">Stay in the loop</p>
            <p className="mt-0.5 text-small text-textMuted">
              We'll only notify you about things you choose: replies, alerts you opt into, and events.
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" className="mt-3" onClick={requestPush}>
          Turn on notifications
        </Button>
      </Card>

      <InfoCallout icon="home" heading="Add to your home screen">
        Local works best installed. From your browser menu, choose Add to Home Screen.
      </InfoCallout>

      <Button variant="primary" size="xl" fullWidth loading={busy} onClick={finish}>
        Enter {active?.name ?? 'Local'}
      </Button>
    </AuthLayout>
  );
}
