import { type ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { Icon, type IconName } from './Icon';
import { badgeBg, badgeFg, type Tone } from './tones';

interface InfoCalloutProps {
  icon?: IconName;
  heading?: string;
  tone?: Tone;
  children: ReactNode;
  className?: string;
}

/** Soft-tinted "you should know this" card (COMPONENT_INVENTORY 3.8). Explains WHY without
 *  demanding attention. */
export function InfoCallout({ icon = 'info', heading, tone = 'info', children, className }: InfoCalloutProps) {
  return (
    <div className={cx('flex gap-3 rounded-lg p-cardPad', badgeBg[tone], className)}>
      <Icon name={icon} size={18} className={cx('mt-0.5 shrink-0', badgeFg[tone])} />
      <div className="min-w-0 text-small text-text">
        {heading && <p className="mb-0.5 font-semibold">{heading}</p>}
        <div className="text-textMuted">{children}</div>
      </div>
    </div>
  );
}
