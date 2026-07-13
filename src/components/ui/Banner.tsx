import { cx } from '@/lib/cx';
import { Button } from './Button';
import { IconBadge } from './IconBadge';
import { type IconName } from './Icon';
import { type Tone } from './tones';

interface BannerProps {
  tone?: Extract<Tone, 'accent' | 'warn' | 'positive'>;
  icon: IconName;
  title: string;
  body?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

/** Single-line action prompt (COMPONENT_INVENTORY 3.7). Omitting `action` gives a calm,
 *  CTA-free note. */
export function Banner({ tone = 'accent', icon, title, body, action, className }: BannerProps) {
  return (
    <div
      role="status"
      className={cx(
        'flex items-center gap-3 rounded-lg border border-border bg-bgElevated p-cardPad',
        className,
      )}
    >
      <IconBadge icon={icon} tone={tone} size="md" />
      <div className="min-w-0 flex-1">
        <p className="text-body font-medium text-text">{title}</p>
        {body && <p className="text-small text-textMuted">{body}</p>}
      </div>
      {action && (
        <Button variant="secondary" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
