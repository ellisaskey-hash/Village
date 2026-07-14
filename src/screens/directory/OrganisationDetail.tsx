import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { screenEnter } from '@/lib/motion';
import { useServices } from '@/lib/services/provider';
import { Banner, Card, IconBadge, IconButton, Skeleton } from '@/components/ui';

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
      <header className="flex items-center gap-2">
        <IconButton icon="back" ariaLabel="Back" size="sm" onClick={() => navigate(-1)} />
        <h1 className="font-display text-h1 font-bold text-text">Organisation</h1>
      </header>
      {q.isLoading ? (
        <Skeleton height={120} />
      ) : !o ? (
        <Card><p className="text-body text-textMuted">We couldn't find that organisation.</p></Card>
      ) : (
        <>
          <Card>
            <div className="flex items-start gap-3">
              <IconBadge icon="organisations" tone={o.verifiedSource ? 'info' : 'neutral'} size="lg" />
              <div className="min-w-0 flex-1">
                <h2 className="text-h2 font-semibold text-text">{o.name}</h2>
                <p className="text-small text-textMuted">{o.kind}</p>
              </div>
            </div>
            {o.description && <p className="mt-3 text-body text-text">{o.description}</p>}
          </Card>
          {o.verifiedSource && (
            <Banner tone="accent" icon="shield" title="Verified source" body="This organisation can post community alerts and notices." />
          )}
        </>
      )}
    </motion.div>
  );
}
