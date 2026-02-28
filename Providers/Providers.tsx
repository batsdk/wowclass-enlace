'use client';

import { SidebarProvider } from '@/components/ui/sidebar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {

      staleTime: 1000 * 60 * 20, // 20 minutes

      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,

      retry: 1,
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return <>
   <QueryClientProvider client={queryClient}>
      <SidebarProvider>
        {children}
      </SidebarProvider>
    </QueryClientProvider>;
  </>
}