import { STORAGE_PREFIX } from '@design/tokens';

/**
 * localStorage behind a single prefix constant (brandability contract, spec 05).
 * Every helper is try/caught so private-mode / disabled storage never throws.
 */
export function readStore(key: string): string | null {
  try {
    return localStorage.getItem(STORAGE_PREFIX + key);
  } catch {
    return null;
  }
}

export function writeStore(key: string, value: string): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, value);
  } catch {
    /* storage unavailable — ignore */
  }
}

export function removeStore(key: string): void {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    /* storage unavailable — ignore */
  }
}
