import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServices } from '@/lib/services/provider';
import { useActiveMembership, useSession } from '@/app/state/session';
import { alertArrival, listItem, statusPulse } from '@/lib/motion';
import { Card, Icon, TextLink } from '@/components/ui';
import type { AlertTier } from '@/lib/services/types';

const TIER_TONE: Record<AlertTier, string> = {
  community: 'text-info',
  verified: 'text-warn',
  platform: 'text-danger',
};
const TIER_BORDER: Record<AlertTier, string> = {
  community: 'border-l-info',
  verified: 'border-l-warn',
  platform: 'border-l-danger',
};

/** Home alerts strip (spec 07). Live alerts, tier-coloured; renders nothing when there are
 *  none (never an empty card). Polls as a realtime seam (Supabase channel lands with the SW). */
export function AlertsStrip() {
  const services = useServices();
  const session = useSession();
  const active = useActiveMembership();
  const qc = useQueryClient();
  const communityId = active?.communityId ?? '';

  const q = useQuery({
    queryKey: ['alerts', communityId],
    queryFn: () => services.alerts.list(communityId),
    enabled: Boolean(communityId),
    refetchInterval: 15000,
  });

  const alerts = q.data ?? [];
  if (alerts.length === 0) return null;

  async function resolve(id: string) {
    await services.alerts.resolve(id);
    await qc.invalidateQueries({ queryKey: ['alerts', communityId] });
  }

  return (
    <section className="space-y-2">
      {alerts.map((a) => {
        const urgent = a.tier !== 'community';
        return (
          <motion.div key={a.id} variants={urgent ? alertArrival : listItem} initial="initial" animate="animate">
            <Card className={`border-l-4 ${TIER_BORDER[a.tier]}`}>
              <div className="flex items-start gap-3">
                <span className="relative mt-0.5 flex h-2.5 w-2.5 shrink-0">
                  {urgent && (
                    <motion.span variants={statusPulse} animate="animate" className={`absolute inline-flex h-full w-full rounded-full ${a.tier === 'platform' ? 'bg-danger' : 'bg-warn'}`} />
                  )}
                  <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${a.tier === 'platform' ? 'bg-danger' : a.tier === 'verified' ? 'bg-warn' : 'bg-info'}`} />
                </span>
                <Icon name="alerts" size={20} className={TIER_TONE[a.tier]} />
                {a.photos[0] && <img src={a.photos[0]} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-border object-cover" />}
                <div className="min-w-0 flex-1">
                  <p className="text-body font-semibold text-text">{a.title}</p>
                  {a.body && <p className="text-small text-textMuted">{a.body}</p>}
                  {a.createdBy === session?.profileId && (
                    <div className="mt-1">
                      <TextLink onClick={() => resolve(a.id)}>Mark resolved</TextLink>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </section>
  );
}
