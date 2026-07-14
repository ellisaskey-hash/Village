import { useState } from 'react';
import { Button, IconButton } from '@/components/ui';
import { ReportSheet } from './ReportSheet';
import type { ModerationTargetKind } from '@/lib/services/types';

interface ReportButtonProps {
  targetKind: ModerationTargetKind;
  targetId: string;
  targetLabel?: string;
  /** 'icon' for content-row trailing, 'text' for a detail-screen action. */
  variant?: 'icon' | 'text';
}

/** Opens the shared ReportSheet. Self-contained so any row or detail header can drop it in. */
export function ReportButton({ targetKind, targetId, targetLabel, variant = 'text' }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {variant === 'icon' ? (
        <IconButton icon="shield" ariaLabel="Report this" size="sm" onClick={() => setOpen(true)} />
      ) : (
        <Button variant="ghost" size="sm" leadingIcon="shield" onClick={() => setOpen(true)}>
          Report
        </Button>
      )}
      <ReportSheet open={open} onClose={() => setOpen(false)} targetKind={targetKind} targetId={targetId} {...(targetLabel ? { targetLabel } : {})} />
    </>
  );
}
