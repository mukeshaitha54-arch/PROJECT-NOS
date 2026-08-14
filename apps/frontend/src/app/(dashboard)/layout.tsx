'use client';

import { ReactNode } from 'react';
import { SocketProvider } from '@/contexts/socket-context'; // Legacy — keep it
import { RealtimeProvider } from '@/realtime/providers/RealtimeProvider'; // New Phase 2
import { AlertToast } from '@/features/alerts/components/AlertToast';
import { RealtimeErrorBoundary } from '@/components/error/RealtimeErrorBoundary';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopNav } from '@/components/layout/TopNav';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-[#070709] text-white">
      {/* Static sidebar — never crashes */}
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />
        
        {/* Main content area with BOTH providers stacked */}
        <main className="flex-1 overflow-auto p-6">
          <SocketProvider>           {/* ← Legacy: satisfies useSocketContext */}
            <RealtimeProvider>       {/* ← New: satisfies useRealtimeContext */}
              <RealtimeErrorBoundary>
                <AlertToast />
                {children}
              </RealtimeErrorBoundary>
            </RealtimeProvider>
          </SocketProvider>
        </main>
      </div>
    </div>
  );
}
