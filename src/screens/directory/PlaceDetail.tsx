import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { cardEnter, screenEnter } from '@/lib/motion';
import { useServices } from '@/lib/services/provider';
import { Card, Icon, IconBadge, IconButton, Skeleton } from '@/components/ui';
import { PhotoHero } from '@/components/content/PhotoHero';

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
        <h1 className="font-display text-h1 font-bold text-text">Place</h1>
      </header>
      {q.isLoading ? (
        <Skeleton height={120} />
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
                  <h2 className="text-h2 font-semibold text-text">{p.name}</h2>
                  <p className="text-small text-textMuted capitalize">{p.kind}</p>
                </div>
              </div>
              {p.description && <p className="mt-3 text-body text-text">{p.description}</p>}
              {p.address && <p className="mt-2 flex items-center gap-1.5 text-small text-textMuted"><Icon name="pin" size={14} className="text-textFaint" /> {p.address}</p>}
            </Card>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
