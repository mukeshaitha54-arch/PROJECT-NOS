import { DeviceTableSkeleton } from "@/components/ui/skeleton/DeviceTableSkeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-950 p-6 sm:p-12 space-y-8 max-w-7xl mx-auto">
      <div className="h-16 w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl animate-pulse"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-2xl bg-slate-900/60 border border-slate-800/80 animate-pulse"
          ></div>
        ))}
      </div>
      <DeviceTableSkeleton />
    </div>
  );
}
