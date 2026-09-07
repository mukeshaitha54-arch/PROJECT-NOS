import React from "react";
import { formatDistanceToNow } from "date-fns";

interface Heartbeat {
  id: string;
  timestamp: string;
  status: string;
}

interface HeartbeatTimelineProps {
  heartbeats: Heartbeat[];
}

export function HeartbeatTimeline({ heartbeats }: HeartbeatTimelineProps) {
  if (!heartbeats || heartbeats.length === 0) {
    return <div className="text-sm text-gray-500">No heartbeats recorded.</div>;
  }

  return (
    <div className="flex gap-1 overflow-hidden" title="Heartbeat History">
      {heartbeats.map((hb) => {
        let color = "bg-gray-400";
        if (hb.status === "OK" || hb.status === "ONLINE")
          color = "bg-green-500";
        else if (hb.status === "MISSED" || hb.status === "OFFLINE")
          color = "bg-red-500";

        return (
          <div
            key={hb.id}
            className={`h-4 w-2 rounded-sm ${color} opacity-80 hover:opacity-100 transition-opacity`}
            title={`Status: ${hb.status}\nTime: ${formatDistanceToNow(new Date(hb.timestamp), { addSuffix: true })}`}
          />
        );
      })}
    </div>
  );
}
