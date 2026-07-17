import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServices } from '@/lib/services/provider';
import { errorMessage } from '@/lib/errors';
import { IconButton, useToasts } from '@/components/ui';
import type { SaveTargetKind } from '@/lib/services/types';

/** Save/bookmark toggle for a listing, request or event. Reads the shared ['saves'] query so
 *  every surface stays in sync; the bookmark tints accent when saved. */
export function SaveButton({
  targetKind,
  targetId,
  targetLabel,
}: {
  targetKind: SaveTargetKind;
  targetId: string;
  targetLabel: string;
}) {
  const services = useServices();
  const qc = useQueryClient();
  const push = useToasts();
  const { data } = useQuery({ queryKey: ['saves'], queryFn: () => services.saves.list() });
  const saved = (data ?? []).some((s) => s.targetKind === targetKind && s.targetId === targetId);

  async function toggle() {
    try {
      if (saved) await services.saves.remove(targetKind, targetId);
      else await services.saves.add(targetKind, targetId, targetLabel);
      await qc.invalidateQueries({ queryKey: ['saves'] });
      if (!saved) push({ title: 'Saved', variant: 'success' });
    } catch (e) {
      push({ title: errorMessage(e), variant: 'error' });
    }
  }

  return (
    <IconButton
      icon="bookmark"
      ariaLabel={saved ? 'Saved. Tap to remove.' : 'Save'}
      aria-pressed={saved}
      size="sm"
      className={saved ? 'text-accent' : ''}
      onClick={toggle}
    />
  );
}
