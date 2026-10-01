"use client";

import {
  LandingNavbar,
  HeroSection,
  LiveTelemetryMockHud,
  HurdleSimulatorSlider,
  ArchitecturalPillars,
  InstallerSection,
} from "@/components/landing";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-950 antialiased">
      {/* Fixed navigation */}
      <LandingNavbar />

      {/* 1. Hero — above the fold */}
      <HeroSection />

      {/* 2. Interactive live telemetry HUD sandbox */}
      <LiveTelemetryMockHud />

      {/* 3. Hurdle Simulator — resilience 3-stage walkthrough */}
      <HurdleSimulatorSlider />

      {/* 4. Comparison table + 4 pillar cards */}
      <ArchitecturalPillars />

      {/* 5. Installer steps + stats + CTA finale */}
      <InstallerSection />

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-white/5 py-10 px-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center font-black text-white text-xs">
            N
          </div>
          <span className="text-white font-black text-base tracking-tight">
            NOS
          </span>
          <span className="text-slate-600 text-xs">
            Network Operations Sentinel
          </span>
        </div>
        <p className="text-slate-600 text-xs">
          Built for resilience. Designed to never drop a datapoint.
        </p>
      </footer>
    </main>
  );
}
