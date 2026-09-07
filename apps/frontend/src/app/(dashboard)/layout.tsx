"use client";

import { ReactNode, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { RealtimeProvider } from "@/realtime/providers/RealtimeProvider";
import { AlertToast } from "@/features/alerts/components/AlertToast";
import { RealtimeErrorBoundary } from "@/components/error/RealtimeErrorBoundary";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/contexts/auth-context";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#070709] text-white">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

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
          <RealtimeProvider>
            <RealtimeErrorBoundary>
              <AlertToast />
              <div className="max-w-7xl mx-auto w-full space-y-6 animate-in fade-in-50 duration-300">
                {children}
              </div>
            </RealtimeErrorBoundary>
          </RealtimeProvider>
        </main>
      </div>
    </div>
  );
}
