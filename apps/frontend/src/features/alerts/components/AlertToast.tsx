"use client";
import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import { useRealtimeContext } from "@/realtime/providers/RealtimeProvider";
import { useRouter } from "next/navigation";

export function AlertToast() {
  const { on } = useRealtimeContext();
  const router = useRouter();
  const [activeToastCount, setActiveToastCount] = useState(0);

  useEffect(() => {
    const handleToastAlert = (payload: any) => {
      // payload: { alertId, id, deviceId, severity, message, title, timestamp }
      const alertId = payload?.alertId || payload?.id;
      const message =
        payload?.message || payload?.title || "Threshold breach detected";
      const deviceId = payload?.deviceId || "Node";
      const timestamp = payload?.timestamp || new Date().toISOString();
      const severity = (payload?.severity || "warning").toLowerCase();

      setActiveToastCount((prev) => {
        if (prev >= 5) return prev; // Don't show more than 5 visually at once, let sonner queue

        toast(message, {
          id: alertId, // Prevents duplicate toasts for same alert
          description: `Device: ${deviceId} at ${new Date(timestamp).toLocaleTimeString()}`,
          duration:
            severity === "critical"
              ? Infinity
              : severity === "warning" || severity === "high"
                ? 10000
                : 5000,
          action: alertId
            ? {
                label: "View",
                onClick: () => router.push(`/alerts/${alertId}`),
              }
            : undefined,
          onAutoClose: () => setActiveToastCount((c) => Math.max(0, c - 1)),
          onDismiss: () => setActiveToastCount((c) => Math.max(0, c - 1)),
          style: {
            backgroundColor:
              severity === "critical"
                ? "#ef4444"
                : severity === "warning" || severity === "high"
                  ? "#f59e0b"
                  : "#3b82f6",
            color:
              severity === "warning" || severity === "high"
                ? "#1f2937"
                : "#ffffff",
            border: "none",
          },
        });

        return prev + 1;
      });
    };

    const unsubTriggered = on("alert:triggered", handleToastAlert);
    const unsubCreated = on("alert.created", handleToastAlert);

    return () => {
      unsubTriggered();
      unsubCreated();
    };
  }, [on, router]);

  // Make sure Toaster is rendered
  return <Toaster position="top-right" expand={true} visibleToasts={5} />;
}
