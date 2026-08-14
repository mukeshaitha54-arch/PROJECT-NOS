"use client";

import { RuleValidationResultDto } from "@nos/shared-types";

interface RuleValidationReportProps {
  result: RuleValidationResultDto;
}

export function RuleValidationReport({ result }: RuleValidationReportProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        background: "rgba(15, 23, 42, 0.8)",
        border: `1px solid ${result.valid ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
        borderRadius: "16px",
        padding: "18px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: result.valid
              ? "rgba(16,185,129,0.15)"
              : "rgba(239,68,68,0.15)",
            border: `2px solid ${result.valid ? "#10b981" : "#ef4444"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
            color: result.valid ? "#10b981" : "#ef4444",
            flexShrink: 0,
          }}
        >
          {result.valid ? "✓" : "✕"}
        </div>
        <div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: result.valid ? "#10b981" : "#ef4444",
            }}
          >
            {result.valid ? "Rule is Valid" : "Validation Failed"}
          </div>
          <div style={{ fontSize: "11px", color: "#64748b" }}>
            {result.errors.length} error{result.errors.length !== 1 ? "s" : ""}{" "}
            · {result.warnings.length} warning
            {result.warnings.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Errors */}
      {result.errors.length > 0 && (
        <div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "#ef4444",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "6px",
            }}
          >
            Errors
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {result.errors.map((err, i) => (
              <div
                key={i}
                style={{
                  padding: "8px 12px",
                  background: "rgba(239, 68, 68, 0.06)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  borderRadius: "8px",
                  display: "flex",
                  gap: "8px",
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{ color: "#ef4444", fontSize: "12px", flexShrink: 0 }}
                >
                  ✕
                </span>
                <div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#fca5a5",
                      fontWeight: 600,
                    }}
                  >
                    [{err.code}]{" "}
                    {err.field && (
                      <span style={{ color: "#64748b" }}>({err.field})</span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#94a3b8",
                      marginTop: "2px",
                    }}
                  >
                    {err.message}
                  </div>
                  {err.conflictingRuleName && (
                    <div
                      style={{
                        fontSize: "10px",
                        color: "#64748b",
                        marginTop: "2px",
                      }}
                    >
                      Conflicts with:{" "}
                      <span style={{ color: "#94a3b8" }}>
                        {err.conflictingRuleName}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "#f59e0b",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "6px",
            }}
          >
            Warnings
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {result.warnings.map((warn, i) => (
              <div
                key={i}
                style={{
                  padding: "8px 12px",
                  background: "rgba(245, 158, 11, 0.06)",
                  border: "1px solid rgba(245, 158, 11, 0.2)",
                  borderRadius: "8px",
                  display: "flex",
                  gap: "8px",
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{ color: "#f59e0b", fontSize: "12px", flexShrink: 0 }}
                >
                  ⚠
                </span>
                <div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#fcd34d",
                      fontWeight: 600,
                    }}
                  >
                    [{warn.code}]
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#94a3b8",
                      marginTop: "2px",
                    }}
                  >
                    {warn.message}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Circular Dependencies */}
      {result.circularDependencies &&
        result.circularDependencies.length > 0 && (
          <div
            style={{
              padding: "10px 12px",
              background: "rgba(239, 68, 68, 0.06)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: "8px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#ef4444",
                marginBottom: "6px",
              }}
            >
              Circular Dependencies Detected
            </div>
            {result.circularDependencies.map((chain, i) => (
              <div
                key={i}
                style={{
                  fontSize: "11px",
                  color: "#94a3b8",
                  fontFamily: "monospace",
                }}
              >
                {chain.join(" → ")}
              </div>
            ))}
          </div>
        )}

      {/* Duplicate Info */}
      {result.duplicateOf && (
        <div
          style={{
            padding: "8px 12px",
            background: "rgba(239, 68, 68, 0.06)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: "8px",
            fontSize: "11px",
            color: "#fca5a5",
          }}
        >
          ⚠ This rule duplicates existing rule ID:{" "}
          <span style={{ fontFamily: "monospace" }}>{result.duplicateOf}</span>
        </div>
      )}
    </div>
  );
}
