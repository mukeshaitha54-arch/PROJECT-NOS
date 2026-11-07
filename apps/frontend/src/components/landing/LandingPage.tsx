"use client";

import {
  AmbientFlow,
  ScrollStream,
  LandingNavbar,
  HeroSection,
  LogoStrip,
  MechanismSection,
  DaySection,
  TestimonialSection,
  CapacityEstimatorSection,
  ClosingSection,
  LandingFooter,
} from "@/components/landing";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#fffdfa] text-[#211a16] overflow-x-hidden selection:bg-[#f47b36] selection:text-[#fffdfa]">
      {/* 1. Dynamic SVG Aurora Flow with Glowing Bands & Drifting Filaments */}
      <AmbientFlow />

      {/* 2. Vertical Scroll Stream Rail with Tracking Orbit */}
      <ScrollStream />

      {/* 3. Site Header Navigation with Animated Brand Glyph Ring */}
      <LandingNavbar />

      <main>
        {/* 4. Hero Section with 3D Flow Window & Animated Particle Spark */}
        <HeroSection />

        {/* 5. Supported Runtimes & Infrastructure Strip */}
        <LogoStrip />

        {/* 6. Mechanism Section — 01 Set it in Motion with Unfolding Plate */}
        <MechanismSection />

        {/* 7. Operational Cockpit — 02 Your Fleet in Motion with Live Events */}
        <DaySection />

        {/* 8. Verified Testimonial Quote */}
        <TestimonialSection />

        {/* 9. Fleet Capacity & Usage Estimator Slider */}
        <CapacityEstimatorSection />

        {/* 10. Closing Orbit CTA */}
        <ClosingSection />
      </main>

      {/* 11. Minimal Warm Footer */}
      <LandingFooter />
    </div>
  );
}
