import { DashboardStatsSkeleton } from '@/components/ui/skeleton/DashboardStatsSkeleton';
import { DeviceTableSkeleton } from '@/components/ui/skeleton/DeviceTableSkeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-950 p-6 sm:p-8 space-y-8">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div className="h-10 w-64 bg-slate-800/50 rounded-xl animate-pulse"></div>
        <div className="h-10 w-32 bg-slate-800/50 rounded-xl animate-pulse"></div>
      </div>
      <DashboardStatsSkeleton />
      <DeviceTableSkeleton />
    </div>
  );
}
