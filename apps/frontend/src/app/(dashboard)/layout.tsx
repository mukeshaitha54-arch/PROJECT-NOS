"use client";

import { ReactNode, useState } from "react";
import { SocketProvider } from "@/contexts/socket-context";
import { RealtimeProvider } from "@/realtime/providers/RealtimeProvider";
import { AlertToast } from "@/features/alerts/components/AlertToast";
import { RealtimeErrorBoundary } from "@/components/error/RealtimeErrorBoundary";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#070709] text-white overflow-hidden">
      {/* Collapsible desktop and mobile drawer sidebar */}
      <Sidebar
        isMobileOpen={isMobileNavOpen}
        onMobileClose={() => setIsMobileNavOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <TopBar onHamburgerClick={() => setIsMobileNavOpen(true)} />

        {/* Main content area with real-time providers */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 scrollbar-thin">
          <SocketProvider>
            <RealtimeProvider>
              <RealtimeErrorBoundary>
                <AlertToast />
                <div className="max-w-7xl mx-auto w-full space-y-6 animate-in fade-in-50 duration-300">
                  {children}
                </div>
              </RealtimeErrorBoundary>
            </RealtimeProvider>
          </SocketProvider>
        </main>
      </div>
    </div>
  );
}
