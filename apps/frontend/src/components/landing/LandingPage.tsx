"use client";

import { useEffect } from "react";
import Script from "next/script";
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
import "@/styles/swarm-rebuild.css";

export default function LandingPage() {
  useEffect(() => {
    document.documentElement.classList.add("landing-active");
    document.body.classList.add("landing-page");
    return () => {
      document.documentElement.classList.remove("landing-active");
      document.body.classList.remove("landing-page");
      if (
        typeof window !== "undefined" &&
        (window as any).SwarmRebuild?.destroy
      ) {
        (window as any).SwarmRebuild.destroy();
      }
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-[#fffdfa] text-[#211a16] overflow-x-hidden selection:bg-[#f47b36] selection:text-[#fffdfa]">
      {/* 1. Autonomous Swarm Rebuild Engine */}
      <Script
        src="/swarm-rebuild.js"
        data-agents="14"
        data-bg="#fffdfa"
        data-accent="#f47b36"
        strategy="afterInteractive"
      />

      {/* 2. Glassy NOS Watermark catching cursor sheen & mouse radiance */}
      <div className="nos-watermark" data-sr-skip aria-hidden="true">
        <span className="nos-glass">NOS</span>
        <span className="nos-shine">NOS</span>
      </div>

      {/* 3. Dynamic SVG Aurora Flow with Glowing Bands & Drifting Filaments */}
      <AmbientFlow />

      {/* 4. Vertical Scroll Stream Rail with Tracking Orbit */}
      <ScrollStream />

      {/* 5. Site Header Navigation with Animated Brand Glyph */}
      <LandingNavbar />

      <main className="relative z-10">
        {/* 6. NOS Hero Section with 3D Hardware Telemetry Cockpit & Sliding Rail */}
        <HeroSection />

        {/* 7. Interactive Live Telemetry HUD Sandbox */}
        <LiveTelemetryMockHud />

        {/* 8. Hurdle Simulator — 3-Stage Resilience Walkthrough */}
        <HurdleSimulatorSlider />

        {/* 9. Comparison Table & 4 Core Pillars */}
        <ArchitecturalPillars />

        {/* 10. One-Click Installer & Deployment Terminal */}
        <InstallerSection />
      </main>

      {/* 11. Minimal Warm Ivory & Solar Orange Footer */}
      <LandingFooter />
    </div>
  );
}
