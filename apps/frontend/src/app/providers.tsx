"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../contexts/auth-context";
import { SocketProvider } from "../contexts/socket-context";
import { RealtimeProvider as LegacyRealtimeProvider } from "../features/realtime/contexts/socket.provider";
import { Toaster } from "sonner";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5000,
            refetchOnWindowFocus: true,
            retry: 2,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <LegacyRealtimeProvider>
            {children}
            <Toaster
              position="top-right"
              visibleToasts={5}
              theme="dark"
              richColors
              closeButton
            />
          </LegacyRealtimeProvider>
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
