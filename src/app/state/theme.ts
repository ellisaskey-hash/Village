import { create } from 'zustand';
import { useEffect } from 'react';
import { readStore, writeStore } from '@/lib/storage';

export type ThemePref = 'system' | 'dark' | 'light';
export type ResolvedTheme = 'dark' | 'light';
/** Skin = community type (spec 05). Village is the launch identity; others reserved. */
export type Skin = 'village' | 'estate' | 'retirement';

export function resolveTheme(pref: ThemePref): ResolvedTheme {
  if (pref === 'dark' || pref === 'light') return pref;
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

interface ThemeState {
  pref: ThemePref;
  skin: Skin;
  setPref: (pref: ThemePref) => void;
  setSkin: (skin: Skin) => void;
}

function initialPref(): ThemePref {
  const stored = readStore('theme');
  return stored === 'dark' || stored === 'light' || stored === 'system' ? stored : 'system';
}

function initialSkin(): Skin {
  const stored = readStore('skin');
  return stored === 'estate' || stored === 'retirement' ? stored : 'village';
}

export const useThemeStore = create<ThemeState>((set) => ({
  pref: initialPref(),
  skin: initialSkin(),
  setPref: (pref) => {
    writeStore('theme', pref);
    set({ pref });
  },
  setSkin: (skin) => {
    writeStore('skin', skin);
    set({ skin });
  },
}));

function applyResolvedTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  root.setAttribute('data-theme', resolved);
  // Dual write: CSS-variable cascade keys on data-theme; Tailwind dark: keys on .dark.
  if (resolved === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

/** Reflects theme + skin store state onto <html> and tracks the OS query when 'system'. */
export function useApplyTheme(): void {
  const pref = useThemeStore((s) => s.pref);
  const skin = useThemeStore((s) => s.skin);

  useEffect(() => {
    applyResolvedTheme(resolveTheme(pref));
    if (pref !== 'system' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => applyResolvedTheme(resolveTheme('system'));
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [pref]);

  useEffect(() => {
    document.documentElement.setAttribute('data-skin', skin);
  }, [skin]);
}
