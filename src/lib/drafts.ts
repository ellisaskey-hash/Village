// Composer draft persistence (spec 07 "drafts persisted to the drafts store"; M8 offline drill:
// compose offline → hard refresh → reconnect → nothing lost). Each composer keeps its in-progress
// fields in localStorage under a stable key; the draft restores on mount and clears on a
// successful post. Connectivity is only needed to *send* — the text is never lost before then.
import { useCallback, useEffect, useRef, useState } from 'react';
import { readStore, writeStore, removeStore } from '@/lib/storage';

const PREFIX = 'draft:';

/** Is anything worth keeping in this draft? (all string fields empty → no draft) */
function isEmpty(value: Record<string, unknown>): boolean {
  return Object.values(value).every((v) => v === '' || v == null);
}

/**
 * Persisted form state. Returns the current value, a setter that also saves, and a clear().
 * `key` must be stable per composer (e.g. "request", "listing").
 */
export function useDraft<T extends Record<string, unknown>>(
  key: string,
  initial: T,
): [T, (patch: Partial<T>) => void, () => void] {
  const storeKey = PREFIX + key;
  const [value, setValue] = useState<T>(() => {
    const raw = readStore(storeKey);
    if (!raw) return initial;
    try {
      return { ...initial, ...(JSON.parse(raw) as Partial<T>) };
    } catch {
      return initial;
    }
  });
  const initialRef = useRef(initial);

  // Persist on change (skip writing an all-empty draft, and clear a stale one).
  useEffect(() => {
    if (isEmpty(value)) removeStore(storeKey);
    else writeStore(storeKey, JSON.stringify(value));
  }, [storeKey, value]);

  const update = useCallback((patch: Partial<T>) => setValue((v) => ({ ...v, ...patch })), []);
  const clear = useCallback(() => {
    removeStore(storeKey);
    setValue(initialRef.current);
  }, [storeKey]);

  return [value, update, clear];
}
