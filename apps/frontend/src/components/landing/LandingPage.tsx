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
    <main className="min-h-screen bg-[#090a0d] antialiased">
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
      <footer className="bg-[#07080a] border-t border-white/[0.06] py-10 px-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 via-amber-500 to-rose-600 flex items-center justify-center font-black text-white text-xs shadow-md shadow-orange-500/20">
            N
          </div>
          <span className="text-white font-black text-base tracking-tight">
            NOS
          </span>
          <span className="text-slate-500 text-xs font-mono">
            Neural Operations Sentinel
          </span>
        </div>
        <p className="text-slate-500 text-xs">
          Built for resilience. Designed to never drop a datapoint.
        </p>
      </footer>
    </main>
  );
}
