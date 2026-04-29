'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';

// One QueryClient per browser session. Defaults tuned for the panel:
// - 60 sn fresh window before refetch (admin tabs switch fast)
// - retry once on transient errors (avoid 4xx loops)
// - don't refetch on window focus (Buaze admin pages have heavy charts)
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  // useState ensures a single client instance survives Fast Refresh / Strict Mode.
  const [client] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV !== 'production' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
