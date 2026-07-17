import { useState } from 'react';
import { useServices } from '@/lib/services/provider';
import { errorMessage } from '@/lib/errors';
import { Button, InfoCallout, RadioGroup, Sheet, Textarea, useToasts } from '@/components/ui';
import type { ModerationTargetKind, ReportReason } from '@/lib/services/types';

const REASONS: { value: ReportReason; label: string; helper?: string }[] = [
  { value: 'scam', label: 'A scam or fraud', helper: 'Someone trying to trick or con neighbours' },
  { value: 'spam', label: 'Spam or advertising', helper: 'Repetitive or off-topic promotion' },
  { value: 'abuse', label: 'Abuse or harassment' },
  { value: 'unsafe', label: 'Someone may be at risk', helper: 'Use this if it looks like a safeguarding or safety concern' },
  { value: 'wrongInfo', label: 'Wrong or misleading', helper: 'False claims about a person, place or item' },
  { value: 'privacy', label: 'A privacy concern' },
  { value: 'other', label: 'Something else' },
];

interface ReportSheetProps {
  open: boolean;
  onClose: () => void;
  targetKind: ModerationTargetKind;
  targetId: string;
  /** What is being reported, for the sheet subtitle (e.g. the listing title). */
  targetLabel?: string;
}

/** The one shared Report affordance (spec 04). Lives on every content row and profile.
 *  The "unsafe" reason surfaces immediate UK support signposting before anything is sent. */
export function ReportSheet({ open, onClose, targetKind, targetId, targetLabel }: ReportSheetProps) {
  const services = useServices();
  const push = useToasts();
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!reason) return;
    setBusy(true);
    try {
      await services.moderation.report({ targetKind, targetId, reason, note: note.trim() || undefined });
      push({ title: "Thanks for flagging this. We'll take a look.", variant: 'success' });
      setNote('');
      setReason('');
      onClose();
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
      title="Report this"
      hero={{ icon: 'shield', tone: 'warn' }}
      footer={
        <Button variant="primary" size="xl" fullWidth loading={busy} disabled={!reason} onClick={submit}>
          Send report
        </Button>
      }
    >
      <div className="space-y-4">
        {targetLabel && <p className="text-small text-textMuted">You are reporting: <span className="font-medium text-text">{targetLabel}</span></p>}
        <RadioGroup<ReportReason | ''> ariaLabel="Why are you reporting this?" options={REASONS} value={reason} onChange={setReason} />

        {reason === 'unsafe' && <EscalationNotice />}

        <Textarea
          label="Anything else we should know? (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="A short note helps us understand what you saw."
          maxLength={1000}
        />
        <p className="text-small text-textMuted">
          Only you and the moderators can see this report. We never tell the other person who
          reported them.
        </p>
      </div>
    </Sheet>
  );
}

/** Duty-of-care signposting for the "unsafe" reason (spec 04 §Escalation). */
export function EscalationNotice() {
  return (
    <InfoCallout icon="alert" tone="warn" heading="If someone is in immediate danger, contact the emergency services">
      <ul className="space-y-1">
        <li><span className="font-medium text-text">999</span> for an emergency, or <span className="font-medium text-text">112</span> from any phone.</li>
        <li><span className="font-medium text-text">101</span> for the police when it is not an emergency.</li>
        <li><span className="font-medium text-text">Childline 0800 1111</span> for anyone under 18.</li>
        <li><span className="font-medium text-text">Samaritans 116 123</span>, any time, for anyone struggling to cope.</li>
      </ul>
      <p className="mt-2">We will prioritise this report, but we cannot respond to emergencies. Please contact the right service above first.</p>
    </InfoCallout>
  );
}
