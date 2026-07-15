import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useServices } from '@/lib/services/provider';
import { useActiveMembership } from '@/app/state/session';
import { errorMessage } from '@/lib/errors';
import { useDraft } from '@/lib/drafts';
import { Button, Field, SegmentedControl, Sheet, Textarea, useToasts } from '@/components/ui';
import { StaggeredBody } from '@/components/ui';
import { PhotoInput } from '@/components/content/PhotoInput';
import { ActingAsSelector } from '@/components/content/ActingAsSelector';
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
  const [draft, setDraft, clearDraft] = useDraft(`listing:${fixedKind ?? 'sell'}`, {
    kind: (fixedKind ?? 'sell') as ListingKind, title: '', description: '', category: '', price: '',
  });
  const { kind, title, description, category, price } = draft;
  const [photos, setPhotos] = useState<string[]>([]);
  const [condition, setCondition] = useState<'new' | 'likeNew' | 'good' | 'fair' | 'spares'>('good');
  const [asBusinessId, setAsBusinessId] = useState<string | null>(null);
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
        ...(photos.length ? { photos } : {}),
        ...(effectiveKind !== 'wanted' ? { condition } : {}),
        ...(asBusinessId ? { asBusinessId } : {}),
      });
      await qc.invalidateQueries({ queryKey: ['listings', active.communityId] });
      onClose();
      clearDraft();
      setPhotos([]);
      setAsBusinessId(null);
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
      <StaggeredBody className="space-y-4">
        <ActingAsSelector value={asBusinessId} onChange={setAsBusinessId} />
        {!fixedKind && (
          <SegmentedControl<ListingKind>
            ariaLabel="Listing kind"
            value={kind}
            onChange={(v) => setDraft({ kind: v })}
            options={[
              { value: 'sell', label: 'For sale' },
              { value: 'free', label: 'Free' },
              { value: 'wanted', label: 'Wanted' },
            ]}
          />
        )}
        {effectiveKind !== 'wanted' && <PhotoInput value={photos} onChange={setPhotos} label="Photos" />}
        <Field label="Title" value={title} onChange={(e) => setDraft({ title: e.target.value })} placeholder="Garden bench, solid oak" />
        <Field label="Category" value={category} onChange={(e) => setDraft({ category: e.target.value })} placeholder="Furniture" />
        {effectiveKind === 'sell' && (
          <Field label="Price (£)" type="number" value={price} onChange={(e) => setDraft({ price: e.target.value })} placeholder="25" />
        )}
        {effectiveKind !== 'wanted' && (
          <div className="space-y-1.5">
            <span className="text-small font-medium text-text">Condition</span>
            <SegmentedControl
              ariaLabel="Condition"
              value={condition}
              onChange={setCondition}
              options={[
                { value: 'new', label: 'New' },
                { value: 'likeNew', label: 'Like new' },
                { value: 'good', label: 'Good' },
                { value: 'fair', label: 'Fair' },
                { value: 'spares', label: 'Spares' },
              ]}
            />
          </div>
        )}
        <Textarea label="Description" value={description} onChange={(e) => setDraft({ description: e.target.value })} placeholder="Good condition, collection from the High Street." maxLength={800} />
      </StaggeredBody>
    </Sheet>
  );
}
