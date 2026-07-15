import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { screenEnter } from '@/lib/motion';
import { useServices } from '@/lib/services/provider';
import { useSession } from '@/app/state/session';
import { errorMessage } from '@/lib/errors';
import {
  Banner,
  Button,
  Card,
  IconBadge,
  IconButton,
  Sheet,
  Skeleton,
  Textarea,
  useToasts,
} from '@/components/ui';
import { PhotoHero } from '@/components/content/PhotoHero';

export function BusinessDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const services = useServices();
  const session = useSession();
  const push = useToasts();
  const qc = useQueryClient();
  const [claimOpen, setClaimOpen] = useState(false);
  const [evidence, setEvidence] = useState('');
  const [busy, setBusy] = useState(false);

  const q = useQuery({
    queryKey: ['business', id],
    queryFn: () => services.directory.business(id),
    enabled: Boolean(id),
  });

  async function submitClaim() {
    setBusy(true);
    try {
      await services.claims.claim(id, evidence);
      await qc.invalidateQueries({ queryKey: ['business', id] });
      setClaimOpen(false);
      push({ title: 'Claim sent', body: "We'll review it shortly.", variant: 'success' });
    } catch (e) {
      push({ title: errorMessage(e), variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  const b = q.data;
  const isOwner = Boolean(b && session && b.ownerProfileId === session.profileId);

  return (
    <motion.div
      variants={screenEnter}
      initial="initial"
      animate="animate"
      className="mx-auto max-w-2xl space-y-5 px-screenX py-6"
    >
      <header className="flex items-center gap-2">
        <IconButton icon="back" ariaLabel="Back" size="sm" onClick={() => navigate(-1)} />
        <h1 className="font-display text-h1 font-bold text-text">Business</h1>
      </header>

      {q.isLoading ? (
        <Skeleton height={120} />
      ) : !b ? (
        <Card>
          <p className="text-body text-textMuted">We couldn't find that business.</p>
        </Card>
      ) : (
        <>
          <PhotoHero photos={b.photos} icon="businesses" />
          <Card>
            <div className="flex items-start gap-3">
              <IconBadge icon="businesses" tone="accent" size="lg" />
              <div className="min-w-0 flex-1">
                <h2 className="text-h2 font-semibold text-text">{b.name}</h2>
                {b.categories.length > 0 && (
                  <p className="text-small text-textMuted">{b.categories.join(', ')}</p>
                )}
              </div>
            </div>
            {b.description && <p className="mt-3 text-body text-text">{b.description}</p>}
            {(b.contact.phone || b.contact.email || b.contact.website) && (
              <div className="mt-3 space-y-1 text-small text-textMuted">
                {b.contact.phone && <p>{b.contact.phone}</p>}
                {b.contact.email && <p>{b.contact.email}</p>}
                {b.contact.website && <p>{b.contact.website}</p>}
              </div>
            )}
          </Card>

          {isOwner ? (
            <Banner tone="accent" icon="check" title="You manage this page" body="Add your hours and an offer to help neighbours find you." />
          ) : !b.ownerProfileId ? (
            <Banner
              tone="warn"
              icon="info"
              title="Is this your business?"
              body="Claim this page to manage it, add offers, and reply to enquiries."
              action={{ label: 'Claim it', onClick: () => setClaimOpen(true) }}
            />
          ) : null}

          <Button
            variant="primary"
            size="xl"
            fullWidth
            leadingIcon="messages"
            onClick={() => push({ title: 'Messaging lands in the next update', variant: 'info' })}
          >
            Enquire
          </Button>
        </>
      )}

      <Sheet open={claimOpen} onClose={() => setClaimOpen(false)} title="Claim this page" hero={{ icon: 'shield', tone: 'accent' }}>
        <div className="space-y-4">
          <p className="text-small text-textMuted">
            Tell us how you're connected: your role, and a phone or email that matches public records.
          </p>
          <Textarea
            label="Your evidence"
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            placeholder="I'm the owner. My number on Companies House is 01892..."
            maxLength={400}
          />
          <Button variant="primary" size="xl" fullWidth loading={busy} onClick={submitClaim}>
            Send claim
          </Button>
        </div>
      </Sheet>
    </motion.div>
  );
}
