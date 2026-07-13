import { type ReactNode } from 'react';
import { cx } from '@/lib/cx';

interface BaseProps {
  children: ReactNode;
  className?: string;
}
type TextLinkProps =
  | (BaseProps & { href: string; onClick?: never })
  | (BaseProps & { href?: never; onClick: () => void });

/**
 * Text-style affordance with a centre-out underline on hover (COMPONENT_INVENTORY 1.9).
 * The transition is neutralised under `data-motion='reduce'` via the global CSS layer.
 */
const CLASSES =
  'relative inline-flex items-center text-accent after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-center after:scale-x-0 after:bg-current after:transition-transform after:duration-150 hover:after:scale-x-100';

export function TextLink({ children, className, ...rest }: TextLinkProps) {
  if ('href' in rest && rest.href) {
    return (
      <a href={rest.href} className={cx(CLASSES, className)}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={rest.onClick} className={cx(CLASSES, className)}>
      {children}
    </button>
  );
}
