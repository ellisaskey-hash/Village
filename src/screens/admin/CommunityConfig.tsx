import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useServices } from '@/lib/services/provider';
import { useActiveMembership } from '@/app/state/session';
import { errorMessage } from '@/lib/errors';
import { Button, Card, Field, InfoCallout, SegmentedControl, useToasts } from '@/components/ui';
import { TRUST_LABEL } from '@/lib/labels';
import type { CommunityConfig as Config, TrustLevel } from '@/lib/services/types';

const FIELDS: { key: keyof Config; label: string; helper: string; trust?: boolean }[] = [
  { key: 'autoHideReportThreshold', label: 'Reports before auto-hide', helper: 'How many reports hide an item pending review. Default 3.' },
  { key: 'coldDmMinTrust', label: 'Trust needed to message a stranger', helper: 'A new neighbour can always reply in context; this gates cold messages.', trust: true },
  { key: 'listingCapT0', label: 'Listings for a new neighbour', helper: 'How many active listings before trust level 1. Default 2.' },
  { key: 'requestCapT0', label: 'Open requests for a new neighbour', helper: 'How many open requests before trust level 1. Default 1.' },
  { key: 'eventsRequireTrust', label: 'Trust needed to post an event', helper: 'Default: Established members and up.', trust: true },
  { key: 'alertsCommunityMinTrust', label: 'Trust needed for community alerts', helper: 'Lost-pet and notice alerts.', trust: true },
];

const TRUST_OPTIONS = ([0, 1, 2, 3] as TrustLevel[]).map((l) => ({ value: String(l), label: TRUST_LABEL[l] }));

/** Community config editor (spec 04 §Admin console). Platform-admin only; the service enforces it. */
export function CommunityConfig() {
  const services = useServices();
  const push = useToasts();
  const qc = useQueryClient();
  const active = useActiveMembership();
  const communityId = active?.communityId ?? '';

  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!communityId) return;
    services.communities.getBySlug(active?.slug ?? '').then((c) => {
      if (alive && c) {
        const next: Record<string, string> = {};
        FIELDS.forEach((f) => { next[f.key] = String(c.config[f.key]); });
        setValues(next);
      }
    });
    return () => { alive = false; };
  }, [communityId, active?.slug, services]);

  async function save() {
    setBusy(true);
    try {
      const patch: Partial<Config> = {};
      FIELDS.forEach((f) => {
        const n = Number(values[f.key]);
        if (Number.isFinite(n)) patch[f.key] = n;
      });
      await services.moderation.config(communityId, patch);
      await qc.invalidateQueries({ queryKey: ['community'] });
      push({ title: 'Saved', variant: 'success' });
    } catch (e) {
      push({ title: errorMessage(e), variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <InfoCallout icon="info" tone="info" heading="Thresholds, not rules">
        These tune how friendly the guardrails are for {active?.name}. Higher report thresholds
        mean fewer auto-hides; lower trust gates let new neighbours do more, sooner.
      </InfoCallout>

      <Card className="space-y-4">
        {FIELDS.map((f) =>
          f.trust ? (
            <div key={f.key} className="space-y-1.5">
              <span className="text-small font-medium text-text">{f.label}</span>
              <SegmentedControl
                ariaLabel={f.label}
                value={values[f.key] ?? '0'}
                onChange={(val) => setValues((v) => ({ ...v, [f.key]: val }))}
                options={TRUST_OPTIONS}
              />
              <span className="text-small text-textMuted">{f.helper}</span>
            </div>
          ) : (
            <Field
              key={f.key}
              label={f.label}
              helper={f.helper}
              type="number"
              inputMode="numeric"
              min={0}
              value={values[f.key] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            />
          ),
        )}
      </Card>

      <Button variant="primary" size="xl" fullWidth loading={busy} onClick={save}>Save config</Button>
    </div>
  );
}
