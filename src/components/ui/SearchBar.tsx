import { cx } from '@/lib/cx';
import { Icon } from './Icon';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}

/**
 * Pill search input (COMPONENT_INVENTORY 2.21). The whole container takes the focus ring
 * via focus-within; the input's own outline is suppressed. 16px font on mobile stops zoom.
 */
export function SearchBar({
  value,
  onChange,
  placeholder = 'Search',
  ariaLabel = 'Search',
  className,
}: SearchBarProps) {
  return (
    <div
      className={cx(
        'flex h-11 items-center gap-2 rounded-pill border border-border bg-surface px-3.5 transition-colors',
        'focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--focus-ring)]',
        className,
      )}
    >
      <Icon name="search" size={18} className="shrink-0 text-textMuted" />
      <input
        type="search"
        value={value}
        aria-label={ariaLabel}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 bg-transparent text-input text-text outline-none placeholder:text-textFaint [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange('')}
          className="shrink-0 rounded-full p-1 text-textMuted transition-colors hover:text-text"
        >
          <Icon name="close" size={16} />
        </button>
      )}
    </div>
  );
}
