import {
  forwardRef,
  useId,
  useState,
  type ChangeEvent,
  type TextareaHTMLAttributes,
  type ReactNode,
} from 'react';
import { cx } from '@/lib/cx';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  helper?: ReactNode;
  error?: ReactNode;
  hideLabel?: boolean;
}

/** Multi-line input mirroring Field's chrome, with a live counter when `maxLength` is set. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, helper, error, hideLabel = false, id, maxLength, defaultValue, value, onChange, className, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const helperId = `${inputId}-helper`;
  const hasError = Boolean(error);

  const initial = String(value ?? defaultValue ?? '').length;
  const [count, setCount] = useState(initial);
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setCount(e.target.value.length);
    onChange?.(e);
  };

  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className={cx('text-small font-medium text-text', hideLabel && 'sr-only')}>
        {label}
      </label>
      <textarea
        ref={ref}
        id={inputId}
        maxLength={maxLength}
        aria-invalid={hasError}
        aria-describedby={helper || error ? helperId : undefined}
        onChange={handleChange}
        {...(value !== undefined ? { value } : {})}
        {...(defaultValue !== undefined ? { defaultValue } : {})}
        className={cx(
          'min-h-[88px] resize-y rounded-md border bg-surface px-3 py-2.5 text-input text-text outline-none transition-colors',
          'focus:border-accent placeholder:text-textFaint',
          hasError ? 'border-danger' : 'border-border',
        )}
        {...rest}
      />
      <div className="flex items-center justify-between">
        {helper || error ? (
          <span id={helperId} className={cx('text-small', hasError ? 'text-danger' : 'text-textMuted')}>
            {error ?? helper}
          </span>
        ) : (
          <span />
        )}
        {typeof maxLength === 'number' && (
          <span className="tabular text-small text-textFaint">
            {count}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
});
