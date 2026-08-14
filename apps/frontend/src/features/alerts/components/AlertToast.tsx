'use client';
import { useEffect, useState } from 'react';
import { toast, Toaster } from 'sonner';
import { useRealtimeContext } from '@/realtime/providers/RealtimeProvider';
import { useRouter } from 'next/navigation';

export function AlertToast() {
  const { on } = useRealtimeContext();
  const router = useRouter();
  const [activeToastCount, setActiveToastCount] = useState(0);

  useEffect(() => {
    const unsubscribe = on('alert:triggered', (payload: any) => {
      // payload: { alertId, deviceId, severity, message, timestamp }
      setActiveToastCount((prev) => {
        if (prev >= 5) return prev; // Don't show more than 5 visually at once, let sonner queue

        toast(payload.message, {
          id: payload.alertId, // Prevents duplicate toasts for same alert
          description: `Device: ${payload.deviceId} at ${new Date(payload.timestamp).toLocaleTimeString()}`,
          duration: payload.severity === 'critical' ? Infinity : payload.severity === 'warning' ? 10000 : 5000,
          action: {
            label: 'View',
            onClick: () => router.push(`/alerts/${payload.alertId}`)
          },
          onAutoClose: () => setActiveToastCount((c) => Math.max(0, c - 1)),
          onDismiss: () => setActiveToastCount((c) => Math.max(0, c - 1)),
          style: {
            backgroundColor: payload.severity === 'critical' ? '#ef4444' : payload.severity === 'warning' ? '#f59e0b' : '#3b82f6',
            color: payload.severity === 'warning' ? '#1f2937' : '#ffffff',
            border: 'none',
          }
        });

        return prev + 1;
      });
    });

    return () => unsubscribe();
  }, [on, router]);

  // Make sure Toaster is rendered
  return <Toaster position="top-right" expand={true} visibleToasts={5} />;
}
