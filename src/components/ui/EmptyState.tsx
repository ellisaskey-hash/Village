import { type ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { Button } from './Button';
import { IconBadge } from './IconBadge';
import { type IconName } from './Icon';
import { type Tone } from './tones';

interface EmptyStateProps {
  icon?: IconName;
  tone?: Tone;
  illustration?: ReactNode;
  title: string;
  body?: string;
  action?: { label: string; onClick: () => void; leadingIcon?: IconName };
  className?: string;
}

/**
 * A designed empty is a first-class state, never a fallback (spec 00 rule 3). Copy is
 * always an invitation to act ("No requests yet. Need a hand with something?").
 */
export function EmptyState({
  icon = 'sparkle',
  tone = 'accent',
  illustration,
  title,
  body,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cx(
        'mx-auto flex max-w-[420px] flex-col items-center gap-3 rounded-lg border border-border bg-bgElevated px-6 py-10 text-center',
        className,
      )}
    >
      {illustration ?? <IconBadge icon={icon} tone={tone} size="lg" />}
      <div className="space-y-1">
        <p className="text-h3 font-semibold text-text">{title}</p>
        {body && <p className="text-small text-textMuted">{body}</p>}
      </div>
      {action && (
        <Button
          variant="primary"
          size="sm"
          onClick={action.onClick}
          {...(action.leadingIcon ? { leadingIcon: action.leadingIcon } : {})}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
