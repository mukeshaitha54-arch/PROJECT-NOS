"use client";

import {
  AmbientFlow,
  ScrollStream,
  LandingNavbar,
  HeroSection,
  LiveTelemetryMockHud,
  HurdleSimulatorSlider,
  ArchitecturalPillars,
  InstallerSection,
  LandingFooter,
} from "@/components/landing";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#fffdfa] text-[#211a16] overflow-x-hidden selection:bg-[#f47b36] selection:text-[#fffdfa]">
      {/* 1. Dynamic SVG Aurora Flow with Glowing Bands & Drifting Filaments */}
      <AmbientFlow />

      {/* 2. Vertical Scroll Stream Rail with Tracking Orbit */}
      <ScrollStream />

      {/* 3. Site Header Navigation with Animated Brand Glyph */}
      <LandingNavbar />

      <main className="relative z-10">
        {/* 4. NOS Hero Section with 3D Hardware Telemetry Cockpit & Sliding Rail */}
        <HeroSection />

        {/* 5. Interactive Live Telemetry HUD Sandbox */}
        <LiveTelemetryMockHud />

        {/* 6. Hurdle Simulator — 3-Stage Resilience Walkthrough */}
        <HurdleSimulatorSlider />

        {/* 7. Comparison Table & 4 Core Pillars */}
        <ArchitecturalPillars />

        {/* 8. One-Click Installer & Deployment Terminal */}
        <InstallerSection />
      </main>

      {/* 9. Minimal Warm Ivory & Solar Orange Footer */}
      <LandingFooter />
    </div>
  );
}
