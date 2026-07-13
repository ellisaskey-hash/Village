import { create } from 'zustand';
import { useEffect } from 'react';
import { readStore, writeStore } from '@/lib/storage';

export type Accent = 'leaf' | 'honey' | 'cobalt';
export type Density = 'compact' | 'regular' | 'spacious';
export type FontPref = 'default' | 'dyslexia';
export type Contrast = 'normal' | 'high';
export type MotionPref = 'system' | 'reduce' | 'full';

interface A11yState {
  accent: Accent;
  density: Density;
  font: FontPref;
  contrast: Contrast;
  motion: MotionPref;
  setAccent: (v: Accent) => void;
  setDensity: (v: Density) => void;
  setFont: (v: FontPref) => void;
  setContrast: (v: Contrast) => void;
  setMotion: (v: MotionPref) => void;
}

function read<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  const stored = readStore(key);
  return stored && (allowed as readonly string[]).includes(stored) ? (stored as T) : fallback;
}

export const useA11yStore = create<A11yState>((set) => ({
  accent: read('accent', ['leaf', 'honey', 'cobalt'] as const, 'leaf'),
  density: read('density', ['compact', 'regular', 'spacious'] as const, 'regular'),
  font: read('font', ['default', 'dyslexia'] as const, 'default'),
  contrast: read('contrast', ['normal', 'high'] as const, 'normal'),
  motion: read('motion', ['system', 'reduce', 'full'] as const, 'system'),
  setAccent: (accent) => {
    writeStore('accent', accent);
    set({ accent });
  },
  setDensity: (density) => {
    writeStore('density', density);
    set({ density });
  },
  setFont: (font) => {
    writeStore('font', font);
    set({ font });
  },
  setContrast: (contrast) => {
    writeStore('contrast', contrast);
    set({ contrast });
  },
  setMotion: (motion) => {
    writeStore('motion', motion);
    set({ motion });
  },
}));

/** Only stamps non-default values, so the attribute selectors stay meaningful. */
function setOrRemove(attr: string, value: string | null): void {
  const root = document.documentElement;
  if (value === null) root.removeAttribute(attr);
  else root.setAttribute(attr, value);
}

/** Reflects the accessibility-preference axes onto <html>. */
export function useApplyA11y(): void {
  const { accent, density, font, contrast, motion } = useA11yStore();

  useEffect(() => {
    setOrRemove('data-accent', accent === 'leaf' ? null : accent);
  }, [accent]);
  useEffect(() => {
    setOrRemove('data-density', density === 'regular' ? null : density);
  }, [density]);
  useEffect(() => {
    setOrRemove('data-font', font === 'default' ? null : font);
  }, [font]);
  useEffect(() => {
    setOrRemove('data-contrast', contrast === 'high' ? 'high' : null);
  }, [contrast]);
  useEffect(() => {
    setOrRemove('data-motion', motion === 'system' ? null : motion);
  }, [motion]);
}
