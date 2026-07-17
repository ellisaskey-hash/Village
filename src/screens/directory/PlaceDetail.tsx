import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { cardEnter, screenEnter } from '@/lib/motion';
import { useServices } from '@/lib/services/provider';
import { Card, IconBadge, IconButton, QueryError, Skeleton } from '@/components/ui';
import { PhotoHero } from '@/components/content/PhotoHero';
import { ContactRow } from '@/components/content/ContactRow';
import { PLACE_KIND_LABEL, labelFor } from '@/lib/labels';

export function PlaceDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const services = useServices();
  const q = useQuery({ queryKey: ['place', id], queryFn: () => services.directory.place(id), enabled: Boolean(id) });
  const p = q.data;

  return (
    <motion.div variants={screenEnter} initial="initial" animate="animate" className="mx-auto max-w-2xl space-y-5 px-screenX py-6">
      <header className="flex items-center gap-2">
        <IconButton icon="back" ariaLabel="Back" size="sm" onClick={() => navigate(-1)} />
        <p className="text-eyebrow uppercase text-textMuted">Place</p>
      </header>
      {q.isLoading ? (
        <Skeleton height={120} />
      ) : q.isError ? (
        <QueryError onRetry={() => q.refetch()} />
      ) : !p ? (
        <Card><p className="text-body text-textMuted">We couldn't find that place.</p></Card>
      ) : (
        <>
          <motion.div variants={cardEnter}>
            <PhotoHero photos={p.photos} icon="places" from="var(--c-positive)" to="var(--c-info)" />
          </motion.div>
          <motion.div variants={cardEnter}>
            <Card>
              <div className="flex items-start gap-3">
                <IconBadge icon="places" tone="positive" size="lg" />
                <div className="min-w-0 flex-1">
                  <h1 className="text-h2 font-semibold text-text">{p.name}</h1>
                  <p className="text-small text-textMuted">{labelFor(PLACE_KIND_LABEL, p.kind)}</p>
                </div>
              </div>
              {p.description && <p className="mt-3 text-body text-text">{p.description}</p>}
              {p.address && (
                <div className="mt-3">
                  <ContactRow icon="pin" sublabel="Directions" label={p.address} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}`} external />
                </div>
              )}
            </Card>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
