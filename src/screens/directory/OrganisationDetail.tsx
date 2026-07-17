import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { cardEnter, screenEnter } from '@/lib/motion';
import { useServices } from '@/lib/services/provider';
import { Banner, Card, IconBadge, IconButton, QueryError, Skeleton } from '@/components/ui';
import { PhotoHero } from '@/components/content/PhotoHero';
import { ORGANISATION_KIND_LABEL, labelFor } from '@/lib/labels';

export function OrganisationDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const services = useServices();
  const q = useQuery({
    queryKey: ['organisation', id],
    queryFn: () => services.directory.organisation(id),
    enabled: Boolean(id),
  });
  const o = q.data;

  return (
    <motion.div variants={screenEnter} initial="initial" animate="animate" className="mx-auto max-w-2xl space-y-5 px-screenX py-6">
      <motion.header variants={cardEnter} className="flex items-center gap-2">
        <IconButton icon="back" ariaLabel="Back" size="sm" onClick={() => navigate(-1)} />
        <h1 className="font-display text-h1 font-bold text-text">Organisation</h1>
      </motion.header>
      {q.isLoading ? (
        <div className="space-y-4"><Skeleton height={160} /><Skeleton height={120} /></div>
      ) : q.isError ? (
        <QueryError onRetry={() => q.refetch()} />
      ) : !o ? (
        <Card><p className="text-body text-textMuted">We couldn't find that organisation.</p></Card>
      ) : (
        <>
          <motion.div variants={cardEnter}>
            <PhotoHero icon="organisations" from={o.verifiedSource ? 'var(--c-info)' : 'var(--c-purple)'} to="var(--c-accent)" />
          </motion.div>
          <motion.div variants={cardEnter}>
            <Card>
              <div className="flex items-start gap-3">
                <IconBadge icon="organisations" tone={o.verifiedSource ? 'info' : 'neutral'} size="lg" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-h2 font-semibold text-text">{o.name}</h2>
                  <p className="text-small text-textMuted">{labelFor(ORGANISATION_KIND_LABEL, o.kind)}</p>
                </div>
              </div>
              {o.description && <p className="mt-3 text-body text-text">{o.description}</p>}
            </Card>
          </motion.div>
          {o.verifiedSource && (
            <motion.div variants={cardEnter}>
              <Banner tone="accent" icon="shield" title="Verified source" body="This organisation can post community alerts and notices." />
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
