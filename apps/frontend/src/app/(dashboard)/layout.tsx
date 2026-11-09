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
import { AmbientFlow } from "@/components/landing/AmbientFlow";

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
      <div className="flex h-screen w-full items-center justify-center bg-[#0A0B0E] text-[#ECEEF4]">
        <Loader2 className="w-8 h-8 text-[#3D8BFF] animate-spin" />
      </div>
    );
  }

  return (
    <div className="dashboard-scope relative flex h-screen bg-[#0A0B0E]/60 text-[#ECEEF4] overflow-hidden selection:bg-[#3D8BFF] selection:text-white">
      {/* Dynamic Aurora Ambient Flow Background running behind entire dashboard */}
      <div className="fixed inset-0 pointer-events-none opacity-40 z-0 overflow-hidden">
        <AmbientFlow />
      </div>

      {/* Collapsible desktop and mobile drawer sidebar with frosted glass */}
      <div className="relative z-20 flex-shrink-0 h-full">
        <Sidebar
          isMobileOpen={isMobileNavOpen}
          onMobileClose={() => setIsMobileNavOpen(false)}
        />
      </div>

      <div className="relative z-10 flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-transparent">
        <TopBar onHamburgerClick={() => setIsMobileNavOpen(true)} />

        {/* Main content area with real-time providers */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 scrollbar-thin bg-transparent">
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
