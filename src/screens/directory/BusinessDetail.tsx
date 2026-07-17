import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { cardEnter, screenEnter } from '@/lib/motion';
import { useServices } from '@/lib/services/provider';
import { useSession } from '@/app/state/session';
import { errorMessage } from '@/lib/errors';
import {
  Banner,
  Button,
  Card,
  Icon,
  IconBadge,
  IconButton,
  Sheet,
  QueryError,
  Skeleton,
  Textarea,
  useToasts,
} from '@/components/ui';
import { PhotoHero } from '@/components/content/PhotoHero';
import { ContactRow } from '@/components/content/ContactRow';

export function BusinessDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const services = useServices();
  const session = useSession();
  const push = useToasts();
  const qc = useQueryClient();
  const [claimOpen, setClaimOpen] = useState(false);
  const [evidence, setEvidence] = useState('');
  const [enquireOpen, setEnquireOpen] = useState(false);
  const [message, setMessage] = useState('');
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

  function openEnquire() {
    if (b) setMessage(`Hi, I'd like to enquire about ${b.name}.`);
    setEnquireOpen(true);
  }

  async function sendEnquiry() {
    if (!b?.ownerProfileId) return;
    setBusy(true);
    try {
      const threadId = await services.threads.open('business', b.id, b.ownerProfileId, message);
      setEnquireOpen(false);
      navigate(`/inbox/t/${threadId}`);
    } catch (e) {
      push({ title: errorMessage(e), variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      variants={screenEnter}
      initial="initial"
      animate="animate"
      className="mx-auto max-w-2xl space-y-5 px-screenX py-6"
    >
      <header className="flex items-center gap-2">
        <IconButton icon="back" ariaLabel="Back" size="sm" onClick={() => navigate(-1)} />
        <p className="text-eyebrow uppercase text-textMuted">Business</p>
      </header>

      {q.isLoading ? (
        <Skeleton height={120} />
      ) : q.isError ? (
        <QueryError onRetry={() => q.refetch()} />
      ) : !b ? (
        <Card>
          <p className="text-body text-textMuted">We couldn't find that business.</p>
        </Card>
      ) : (
        <>
          <motion.div variants={cardEnter}>
            <PhotoHero photos={b.photos} label={b.name} icon="businesses" />
          </motion.div>
          <motion.div variants={cardEnter}>
            <Card>
              <div className="flex items-start gap-3">
                <IconBadge icon="businesses" tone="accent" size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-h2 font-semibold text-text">{b.name}</h1>
                    {b.ownerProfileId && b.verifiedAt && (
                      <span className="inline-flex items-center gap-1 text-small font-medium text-positive" title="Verified business">
                        <Icon name="shield" size={15} /> Verified
                      </span>
                    )}
                  </div>
                  {b.categories.length > 0 && <p className="text-small text-textMuted">{b.categories.join(', ')}</p>}
                </div>
              </div>
              {b.description && <p className="mt-3 text-body text-text">{b.description}</p>}
              {(b.contact.phone || b.contact.email || b.contact.website) && (
                <div className="mt-3 space-y-2">
                  {b.contact.phone && <ContactRow icon="phone" sublabel="Call" label={b.contact.phone} href={`tel:${b.contact.phone.replace(/\s+/g, '')}`} />}
                  {b.contact.email && <ContactRow icon="mail" sublabel="Email" label={b.contact.email} href={`mailto:${b.contact.email}`} />}
                  {b.contact.website && <ContactRow icon="external-link" sublabel="Website" label={b.contact.website.replace(/^https?:\/\//, '')} href={b.contact.website.startsWith('http') ? b.contact.website : `https://${b.contact.website}`} external />}
                </div>
              )}
            </Card>
          </motion.div>

          {isOwner ? (
            <motion.div variants={cardEnter}>
              <Banner tone="accent" icon="check" title="You manage this page" body="Add your hours and an offer to help neighbours find you." />
            </motion.div>
          ) : !b.ownerProfileId ? (
            <motion.div variants={cardEnter}>
              <Banner tone="warn" icon="info" title="Is this your business?" body="Claim this page to manage it, add offers, and reply to enquiries." action={{ label: 'Claim it', onClick: () => setClaimOpen(true) }} />
            </motion.div>
          ) : null}

          {b.ownerProfileId && !isOwner && (
            <motion.div variants={cardEnter}>
              <Button variant="primary" size="xl" fullWidth leadingIcon="messages" onClick={openEnquire}>
                Enquire
              </Button>
            </motion.div>
          )}
        </>
      )}

      <Sheet open={enquireOpen} onClose={() => setEnquireOpen(false)} title={b ? `Message ${b.name}` : 'Message'} hero={{ icon: 'messages', tone: 'accent' }}
        footer={<Button variant="primary" size="xl" fullWidth loading={busy} disabled={!message.trim()} onClick={sendEnquiry}>Send</Button>}>
        <div className="space-y-4">
          <p className="text-small text-textMuted">Say what you're after. They'll reply in your inbox.</p>
          <Textarea label="Your message" value={message} onChange={(ev) => setMessage(ev.target.value)} maxLength={500} />
        </div>
      </Sheet>

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
          <Button variant="primary" size="xl" fullWidth loading={busy} disabled={!evidence.trim()} onClick={submitClaim}>
            Send claim
          </Button>
        </div>
      </Sheet>
    </motion.div>
  );
}
