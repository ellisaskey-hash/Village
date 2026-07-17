import { useRef, useState } from 'react';
import { useServices } from '@/lib/services/provider';
import { errorMessage } from '@/lib/errors';
import { Icon, useToasts } from '@/components/ui';

interface PhotoInputProps {
  value: string[];
  onChange: (photos: string[]) => void;
  max?: number;
  label?: string;
}

const MAX_MB = 10;

/** Photo picker for composers (spec 07): pick images → validate size/type → upload (Supabase
 *  Storage, or data URIs in the mock) → thumbnails with remove. The one place photos enter the app. */
export function PhotoInput({ value, onChange, max = 4, label = 'Photos' }: PhotoInputProps) {
  const services = useServices();
  const push = useToasts();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0) return;
    const room = max - value.length;
    const all = Array.from(files);

    // Validate before uploading so failures are explained, not silent.
    const withinLimit = all.slice(0, room);
    const valid = withinLimit.filter((f) => f.type.startsWith('image/') && f.size <= MAX_MB * 1024 * 1024);

    if (all.length > room) push({ title: `You can add up to ${max} photos`, variant: 'info' });
    const skipped = withinLimit.length - valid.length;
    if (skipped > 0) push({ title: `${skipped} ${skipped === 1 ? 'photo was' : 'photos were'} skipped (images only, under ${MAX_MB}MB)`, variant: 'info' });
    if (valid.length === 0) {
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    setBusy(true);
    try {
      const urls = await services.media.upload(valid);
      onChange([...value, ...urls]);
    } catch (e) {
      push({ title: errorMessage(e), variant: 'error' });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-small font-medium text-text">{label}</span>
        <span className="text-micro text-textFaint">{value.length}/{max}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {value.map((src, i) => (
          <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border border-border">
            <img src={src} alt="" className="h-full w-full object-cover" />
            {i === 0 && (
              <span className="absolute inset-x-0 bottom-0 bg-bg/70 py-0.5 text-center text-micro font-medium text-text backdrop-blur-sm">Cover</span>
            )}
            <button
              type="button"
              aria-label={`Remove photo ${i + 1}`}
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-bg/70 text-textOnAccent backdrop-blur-sm transition-colors after:absolute after:-inset-2 after:content-[''] hover:bg-danger"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}
        {value.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-borderStrong text-textMuted transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
          >
            <Icon name={busy ? 'loader' : 'camera'} size={20} className={busy ? 'animate-spin' : ''} />
            <span className="text-micro">{busy ? 'Uploading' : 'Add'}</span>
          </button>
        )}
      </div>
      {value.length === 0 && <p className="text-small text-textMuted">Add up to {max} photos. The first is the cover.</p>}
      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => onPick(e.target.files)} />
    </div>
  );
}
