"use client";

import React from "react";
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from "recharts";

interface TelemetryPoint {
  timestamp: string;
  value: number;
}

interface TelemetrySparklineProps {
  data: TelemetryPoint[];
  color?: string;
  height?: number;
  dataKey?: string;
}

export function TelemetrySparkline({
  data,
  color = "#C8A96E", // NOS gold
  height = 40,
  dataKey = "value",
}: TelemetrySparklineProps) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center text-xs text-gray-500"
      >
        No data
      </div>
    );
  }

  return (
    <div style={{ height, width: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis domain={[0, 100]} hide />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e1e1e",
              border: "1px solid #333",
              fontSize: "12px",
              color: "#fff",
            }}
            itemStyle={{ color: "#fff" }}
            labelStyle={{ display: "none" }}
            formatter={(value: any) => [
              `${Number(value).toFixed(1)}%`,
              "Usage",
            ]}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false} // Better for real-time fast updates
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
