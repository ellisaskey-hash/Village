import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useServices } from '@/lib/services/provider';
import { useActiveMembership } from '@/app/state/session';
import { errorMessage } from '@/lib/errors';
import { Button, Field, SegmentedControl, Sheet, Textarea, useToasts } from '@/components/ui';
import type { ListingKind } from '@/lib/services/types';

/** `lend` is fixed for the equipment tile; the sell tile lets the poster pick sell/free/wanted. */
export function ListingComposer({
  open,
  onClose,
  fixedKind,
}: {
  open: boolean;
  onClose: () => void;
  fixedKind?: ListingKind;
}) {
  const services = useServices();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const push = useToasts();
  const active = useActiveMembership();
  const [kind, setKind] = useState<ListingKind>(fixedKind ?? 'sell');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);

  const effectiveKind = fixedKind ?? kind;

  async function submit() {
    if (!active) return;
    setBusy(true);
    try {
      const pricePence = effectiveKind === 'sell' && price ? Math.round(parseFloat(price) * 100) : undefined;
      const l = await services.listings.create(active.communityId, {
        kind: effectiveKind,
        title,
        category: category || 'other',
        ...(description ? { description } : {}),
        ...(pricePence !== undefined && !Number.isNaN(pricePence) ? { pricePence } : {}),
      });
      await qc.invalidateQueries({ queryKey: ['listings', active.communityId] });
      onClose();
      setTitle('');
      setDescription('');
      setPrice('');
      navigate(`/listings/${l.id}`);
    } catch (e) {
      push({ title: errorMessage(e), variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={fixedKind === 'lend' ? 'Offer to lend' : 'List something'}
      hero={{ icon: 'listings', tone: 'accent' }}
      footer={
        <Button variant="primary" size="xl" fullWidth loading={busy} onClick={submit}>
          Post
        </Button>
      }
    >
      <div className="space-y-4">
        {!fixedKind && (
          <SegmentedControl<ListingKind>
            ariaLabel="Listing kind"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'sell', label: 'For sale' },
              { value: 'free', label: 'Free' },
              { value: 'wanted', label: 'Wanted' },
            ]}
          />
        )}
        <Field label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Garden bench, solid oak" />
        <Field label="Category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Furniture" />
        {effectiveKind === 'sell' && (
          <Field label="Price (£)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="25" />
        )}
        <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Good condition, collection from the High Street." maxLength={800} />
      </div>
    </Sheet>
  );
}
