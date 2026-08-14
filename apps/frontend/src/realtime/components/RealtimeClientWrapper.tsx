'use client';
import { RealtimeProvider } from '../providers/RealtimeProvider';
import { AlertToast } from '@/features/alerts/components/AlertToast';
import { RealtimeErrorBoundary } from '@/components/error/RealtimeErrorBoundary';

export function RealtimeClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <RealtimeProvider>
      <AlertToast />
      <RealtimeErrorBoundary>
        {children}
      </RealtimeErrorBoundary>
    </RealtimeProvider>
  );
}
