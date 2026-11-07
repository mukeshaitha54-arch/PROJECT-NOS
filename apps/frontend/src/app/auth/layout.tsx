import React from "react";
import { AmbientFlow } from "@/components/landing/AmbientFlow";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-[#08090c] text-white overflow-hidden selection:bg-[#f47b36] selection:text-white">
      {/* Dynamic Aurora Ambient Flow Background running behind auth pages */}
      <div className="fixed inset-0 pointer-events-none opacity-85 z-0 overflow-hidden">
        <AmbientFlow />
      </div>
      <div className="relative z-10 min-h-screen flex flex-col bg-transparent">
        {children}
      </div>
    </div>
  );
}
