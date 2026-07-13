import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cx } from '@/lib/cx';

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'type'> {
  label: string;
  type?: 'text' | 'email' | 'number' | 'password' | 'tel';
  helper?: ReactNode;
  error?: ReactNode;
  prefixSlot?: ReactNode;
  suffixSlot?: ReactNode;
  hideLabel?: boolean;
}

/**
 * Labelled text input with helper / error and prefix / suffix slots (COMPONENT_INVENTORY
 * 2.1). Font floor is 16px (`text-input`) so iOS Safari never auto-zooms on focus.
 */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, type = 'text', helper, error, prefixSlot, suffixSlot, hideLabel = false, id, className, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const helperId = `${inputId}-helper`;
  const hasError = Boolean(error);

  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className={cx('text-small font-medium text-text', hideLabel && 'sr-only')}>
        {label}
      </label>
      <div
        className={cx(
          'flex items-center gap-2 rounded-md border bg-surface px-3 transition-colors',
          'focus-within:border-accent',
          hasError ? 'border-danger' : 'border-border',
        )}
      >
        {prefixSlot && <span className="text-textMuted">{prefixSlot}</span>}
        <input
          ref={ref}
          id={inputId}
          type={type}
          aria-invalid={hasError}
          aria-describedby={helper || error ? helperId : undefined}
          className="h-11 min-w-0 flex-1 bg-transparent text-input text-text outline-none placeholder:text-textFaint"
          {...rest}
        />
        {suffixSlot && <span className="text-textMuted">{suffixSlot}</span>}
      </div>
      {(helper || error) && (
        <span id={helperId} className={cx('text-small', hasError ? 'text-danger' : 'text-textMuted')}>
          {error ?? helper}
        </span>
      )}
    </div>
  );
});
