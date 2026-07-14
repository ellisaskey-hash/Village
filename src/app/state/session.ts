import { create } from 'zustand';
import { useEffect } from 'react';
import type { Session } from '@/lib/services/types';
import { useServices } from '@/lib/services/provider';
import { useThemeStore } from './theme';

type SessionStatus = 'loading' | 'authenticated' | 'anonymous';

interface SessionState {
  status: SessionStatus;
  session: Session | null;
  setSession: (session: Session | null) => void;
  setActiveCommunity: (communityId: string) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  status: 'loading',
  session: null,
  setSession: (session) =>
    set({ session, status: session ? 'authenticated' : 'anonymous' }),
  setActiveCommunity: (communityId) =>
    set((s) => (s.session ? { session: { ...s.session, activeCommunityId: communityId } } : s)),
  reset: () => set({ session: null, status: 'anonymous' }),
}));

/** Convenience selectors. */
export function useSession(): Session | null {
  return useSessionStore((s) => s.session);
}
export function useActiveMembership() {
  return useSessionStore((s) => {
    if (!s.session) return null;
    const id = s.session.activeCommunityId;
    return s.session.memberships.find((m) => m.communityId === id) ?? s.session.memberships[0] ?? null;
  });
}

/**
 * Loads the session once at app start and keeps the community skin in sync with the active
 * membership (spec 05: communities.skin sets data-skin at shell mount).
 */
export function useBootstrapSession(): void {
  const services = useServices();
  const setSession = useSessionStore((s) => s.setSession);
  const session = useSessionStore((s) => s.session);
  const setSkin = useThemeStore((s) => s.setSkin);

  useEffect(() => {
    let cancelled = false;
    services.auth
      .currentSession()
      .then((s) => {
        if (!cancelled) setSession(s);
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      });
    return () => {
      cancelled = true;
    };
  }, [services, setSession]);

  useEffect(() => {
    const active = session?.memberships.find((m) => m.communityId === session.activeCommunityId);
    if (active) setSkin(active.skin);
  }, [session, setSkin]);
}
