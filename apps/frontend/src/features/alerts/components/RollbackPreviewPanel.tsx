"use client";

import { RollbackPreviewDto } from "@nos/shared-types";

interface RollbackPreviewPanelProps {
  preview: RollbackPreviewDto;
  onConfirm?: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

const IMPACT_CONFIG = {
  LOW: { color: "#10b981", label: "Low Impact" },
  MEDIUM: { color: "#f59e0b", label: "Medium Impact" },
  HIGH: { color: "#f97316", label: "High Impact" },
  CRITICAL: { color: "#ef4444", label: "Critical Impact" },
};

export function RollbackPreviewPanel({
  preview,
  onConfirm,
  onCancel,
  isLoading,
}: RollbackPreviewPanelProps) {
  const impact = IMPACT_CONFIG[preview.estimatedImpact];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        background: "rgba(15, 23, 42, 0.9)",
        border: "1px solid rgba(249, 115, 22, 0.2)",
        borderRadius: "16px",
        padding: "20px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "#f97316",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>⟲</span> Rollback Preview
          </div>
          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
            {preview.ruleName} · v{preview.currentVersion} → v
            {preview.targetVersion}
          </div>
        </div>
        <div
          style={{
            padding: "4px 12px",
            borderRadius: "12px",
            background: `${impact.color}18`,
            border: `1px solid ${impact.color}40`,
            color: impact.color,
            fontSize: "11px",
            fontWeight: 700,
          }}
        >
          {impact.label}
        </div>
      </div>

      {/* Safety Banner */}
      <div
        style={{
          padding: "10px 14px",
          borderRadius: "10px",
          background: preview.isRollbackSafe
            ? "rgba(16, 185, 129, 0.08)"
            : "rgba(239, 68, 68, 0.08)",
          border: `1px solid ${preview.isRollbackSafe ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "12px",
          color: preview.isRollbackSafe ? "#10b981" : "#ef4444",
          fontWeight: 600,
        }}
      >
        {preview.isRollbackSafe
          ? "✓ Rollback is safe — minimal changes detected"
          : "⚠ Rollback may have significant impact — review carefully"}
      </div>

      {/* Differences */}
      {preview.differences.length > 0 && (
        <div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "#475569",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "8px",
            }}
          >
            {preview.differences.length} field
            {preview.differences.length !== 1 ? "s" : ""} will change
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {preview.differences.map((diff) => (
              <div
                key={diff.field}
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr auto 1fr",
                  gap: "8px",
                  alignItems: "center",
                  padding: "6px 10px",
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <span style={{ fontSize: "11px", color: "#64748b" }}>
                  {diff.field}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    fontFamily: "monospace",
                    color: "#10b981",
                    padding: "2px 6px",
                    background: "rgba(16,185,129,0.08)",
                    borderRadius: "4px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {String(diff.oldValue ?? "—")}
                </span>
                <span style={{ color: "#475569", fontSize: "12px" }}>→</span>
                <span
                  style={{
                    fontSize: "12px",
                    fontFamily: "monospace",
                    color: "#f97316",
                    padding: "2px 6px",
                    background: "rgba(249,115,22,0.08)",
                    borderRadius: "4px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {String(diff.newValue ?? "—")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {preview.warnings.length > 0 && (
        <div
          style={{
            padding: "10px 12px",
            background: "rgba(245, 158, 11, 0.06)",
            border: "1px solid rgba(245, 158, 11, 0.2)",
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          {preview.warnings.map((w, i) => (
            <div
              key={i}
              style={{
                fontSize: "11px",
                color: "#f59e0b",
                display: "flex",
                gap: "6px",
              }}
            >
              <span>⚠</span>
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          justifyContent: "flex-end",
          marginTop: "4px",
        }}
      >
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              padding: "8px 18px",
              borderRadius: "8px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#94a3b8",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        )}
        {onConfirm && (
          <button
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              padding: "8px 18px",
              borderRadius: "8px",
              background: isLoading
                ? "rgba(249,115,22,0.3)"
                : "rgba(249, 115, 22, 0.85)",
              border: "1px solid rgba(249, 115, 22, 0.5)",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 700,
              cursor: isLoading ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {isLoading ? "⏳ Rolling back..." : "⟲ Confirm Rollback"}
          </button>
        )}
      </div>
    </div>
  );
}
