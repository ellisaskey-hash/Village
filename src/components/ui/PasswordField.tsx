import { forwardRef, useState, type ComponentProps } from 'react';
import { Field } from './Field';
import { Icon } from './Icon';

type PasswordFieldProps = Omit<ComponentProps<typeof Field>, 'type' | 'suffixSlot'>;

/** Password input with a reveal toggle (COMPONENT_INVENTORY 2.4). Wraps Field, so it inherits
 *  the error/helper + aria wiring; the eye toggle lives in the suffix slot. */
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(props, ref) {
  const [show, setShow] = useState(false);
  return (
    <Field
      ref={ref}
      type={show ? 'text' : 'password'}
      suffixSlot={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
          className="relative flex items-center text-textMuted transition-colors after:absolute after:-inset-2 after:content-[''] hover:text-text"
        >
          <Icon name={show ? 'eye-off' : 'eye'} size={18} />
        </button>
      }
      {...props}
    />
  );
});
