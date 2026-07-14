import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Services } from './contracts';
import { createMockServices } from './mock';
import { createSupabaseServices } from './supabase';
import { hasSupabaseEnv } from './supabase/client';

const ServicesContext = createContext<Services | null>(null);

export function useServices(): Services {
  const s = useContext(ServicesContext);
  if (!s) throw new Error('useServices must be used within a ServicesProvider');
  return s;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true },
  },
});

/**
 * Selects the data layer once at mount: Supabase when the public env vars are present,
 * otherwise the clearly-labelled in-memory mock (spec 09 §Server state; PROGRESS.md).
 */
export function ServicesProvider({ children }: { children: ReactNode }) {
  const services = useMemo(
    () => (hasSupabaseEnv() ? createSupabaseServices() : createMockServices()),
    [],
  );
  return (
    <ServicesContext.Provider value={services}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ServicesContext.Provider>
  );
}
