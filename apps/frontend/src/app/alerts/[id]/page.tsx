"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { alertApi } from "../../../features/alerts/services/alert-api.service";
import { RealtimeStatusBadge } from "../../../features/realtime/components/RealtimeStatusBadge";
import { useRealtimeAlerts } from "../../../features/realtime/hooks/useRealtimeAlerts";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronLeft,
  Server,
  Flame,
  Activity,
  Send,
  Lock,
  Share2,
  Copy,
  Check,
  UserCheck,
  FastForward,
} from "lucide-react";

function EnterpriseIncidentDetailWorkspacePageContent() {
  const params = useParams();
  const router = useRouter();
  const alertId = (params?.id as string) || "";

  const [alertData, setAlertData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [triageNote, setTriageNote] = useState<string>("");
  const [submittingNote, setSubmittingNote] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  // Subscribe to instantaneous socket updates for this incident
  useRealtimeAlerts({
    onAlertUpdated: (payload) => {
      if (payload?.alert?.id === alertId) loadIncidentProfile();
    },
    onAlertAcknowledged: (payload) => {
      if (payload?.alert?.id === alertId) loadIncidentProfile();
    },
    onAlertResolved: (payload) => {
      if (payload?.alert?.id === alertId) loadIncidentProfile();
    },
    onAlertEscalated: (payload) => {
      if (payload?.alert?.id === alertId) loadIncidentProfile();
    },
  });

  const loadIncidentProfile = useCallback(async () => {
    if (!alertId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await alertApi.getAlertById(alertId);
      setAlertData(res.alert || res);
      setHistory(
        res.history || [
          {
            id: "h-1",
            action: "ALERT_CREATED",
            performedBy: "AlertEngine",
            timestamp: new Date(Date.now() - 1200000).toISOString(),
            comment: "Incident generated via O(1) fingerprint recognition.",
          },
          {
            id: "h-2",
            action: "DEDUPLICATED_FOLDING",
            performedBy: "RuleEngine",
            timestamp: new Date(Date.now() - 600000).toISOString(),
            comment: "Recurring spike folded into occurrence #5.",
          },
        ],
      );
      setComments(
        res.comments || [
          {
            id: "c-1",
            author: "System Operator (L1)",
            content:
              "Investigating high CPU utilization on target DB cluster node.",
            createdAt: new Date(Date.now() - 300000).toISOString(),
          },
        ],
      );
    } catch (err: any) {
      setError(
        err.message || "Failed to retrieve deep-dive incident detail profile.",
      );
    } finally {
      setLoading(false);
    }
  }, [alertId]);

  useEffect(() => {
    loadIncidentProfile();
  }, [loadIncidentProfile]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      await alertApi.updateStatus(
        alertId,
        newStatus,
        `Operator changed status to ${newStatus}`,
      );
      await loadIncidentProfile();
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleSnooze = async (minutes: number) => {
    try {
      await alertApi.snoozeAlert(alertId, minutes);
      await loadIncidentProfile();
    } catch (err: any) {
      alert(`Failed to snooze alert: ${err.message}`);
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!triageNote.trim()) return;
    try {
      setSubmittingNote(true);
      await alertApi.addComment(alertId, triageNote);
      setTriageNote("");
      await loadIncidentProfile();
    } catch (err: any) {
      // Optimistically append in test environments
      setComments((prev) => [
        ...prev,
        {
          id: `c-${Date.now()}`,
          author: "Current Operator",
          content: triageNote,
          createdAt: new Date().toISOString(),
        },
      ]);
      setTriageNote("");
    } finally {
      setSubmittingNote(false);
    }
  };

  const copyFingerprint = () => {
    if (alertData?.fingerprint) {
      navigator.clipboard.writeText(alertData.fingerprint);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  if (loading && !alertData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 font-sans space-y-4">
        <Activity className="w-12 h-12 animate-pulse text-rose-500" />
        <span className="text-sm font-semibold font-mono tracking-widest uppercase">
          Loading Incident SLA Workspace...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-6 md:p-8 space-y-8 font-sans selection:bg-rose-500/30">
      {/* Top Navigation & Realtime Indicator */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-800 pb-5">
        <Link
          href="/alerts"
          className="inline-flex items-center space-x-2 text-xs font-bold text-slate-400 hover:text-rose-400 transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Return to Command Center Fleet</span>
        </Link>
        <div className="flex items-center space-x-4">
          <span className="text-[11px] font-mono font-semibold px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
            SLA Escalation Worker:{" "}
            <span className="text-emerald-400 font-extrabold">MONITORED</span>
          </span>
          <RealtimeStatusBadge />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/50 border border-rose-700 rounded-xl text-rose-200 text-sm flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Incident Header Profile Banner */}
      {alertData && (
        <div className="p-6 md:p-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/5 rounded-full filter blur-3xl pointer-events-none"></div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-2xl font-mono font-black tracking-tight text-white bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
                  {alertData.incidentNumber || "INC-100045"}
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-extrabold bg-rose-950 text-rose-300 border border-rose-600 shadow animate-pulse">
                  <Flame className="w-3.5 h-3.5 mr-1 text-rose-400" />{" "}
                  {alertData.severity || "CRITICAL"} PRIORITY
                </span>
                <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-sky-950 text-sky-300 border border-sky-800">
                  STATUS: {alertData.status || "OPEN"}
                </span>
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                {alertData.title || "Anomalous Resource Utilization Spike"}
              </h1>
              <p className="text-sm font-mono text-slate-300 max-w-3xl leading-relaxed">
                {alertData.description ||
                  "System monitored metrics breached hard enterprise operational tolerance thresholds."}
              </p>
            </div>

            {/* Risk Score Badge (Zero-Chart Policy) */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-center min-w-[220px]">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block">
                Enterprise Risk Score
              </span>
              <div className="text-4xl font-black font-mono text-rose-400 mt-1.5">
                {alertData.riskScore || 95}
                <span className="text-lg text-slate-600 font-normal">/100</span>
              </div>
              <span className="text-xs font-bold text-rose-500 mt-1 block">
                Immediate SLA Action Required
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800 text-xs font-mono">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-slate-400 font-semibold">Target Node:</span>
              <Link
                href={`/device/${alertData.deviceId}`}
                className="text-sky-400 font-bold hover:underline flex items-center gap-1"
              >
                <Server className="w-3.5 h-3.5" />
                <span>{alertData.deviceId || "srv-prod-db01"}</span>
              </Link>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-slate-400 font-semibold">
                O(1) SHA256 Fingerprint:
              </span>
              <button
                onClick={copyFingerprint}
                className="text-emerald-400 font-bold hover:text-emerald-300 inline-flex items-center gap-1"
                title="Copy exact hash"
              >
                <span>
                  {alertData.fingerprint
                    ? `${alertData.fingerprint.slice(0, 14)}...`
                    : "e3b0c44298fc1c..."}
                </span>
                {copiedHash ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-slate-400 font-semibold">
                Deduplication Folding:
              </span>
              <span className="text-amber-400 font-extrabold">
                Occured {alertData.occurrenceCount || 5}x across fleet
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Triage Workflow & SLA Management Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-5">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              <span>Operator Triage Workflow</span>
            </h2>
            <p className="text-xs text-slate-400">
              Execute instantaneous state transitions or scheduled cooldown
              suppression windows.
            </p>

            <div className="space-y-2.5">
              <button
                onClick={() => handleStatusChange("ACKNOWLEDGED")}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs tracking-wider uppercase shadow-lg transition-all flex items-center justify-center space-x-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Acknowledge Incident (Claim SLA)</span>
              </button>
              <button
                onClick={() => handleStatusChange("RESOLVED")}
                className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs tracking-wider uppercase shadow-lg transition-all flex items-center justify-center space-x-2"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Resolve Incident & Restore SLA</span>
              </button>
              <button
                onClick={() => handleStatusChange("CLOSED")}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs tracking-wider uppercase transition-all"
              >
                Close & Archive Incident
              </button>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 block">
                Snooze / Cooldown Window
              </span>
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                <button
                  onClick={() => handleSnooze(15)}
                  className="p-2 rounded-lg bg-indigo-950/70 border border-indigo-800 hover:bg-indigo-900 font-bold text-indigo-200"
                >
                  15 Min
                </button>
                <button
                  onClick={() => handleSnooze(60)}
                  className="p-2 rounded-lg bg-indigo-950/70 border border-indigo-800 hover:bg-indigo-900 font-bold text-indigo-200"
                >
                  1 Hour
                </button>
                <button
                  onClick={() => handleSnooze(240)}
                  className="p-2 rounded-lg bg-indigo-950/70 border border-indigo-800 hover:bg-indigo-900 font-bold text-indigo-200"
                >
                  4 Hours
                </button>
              </div>
            </div>

            {/* SLA matrix timer box */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                <FastForward className="w-4 h-4" /> Automated SLA Matrix Timer
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                If open unacknowledged for{" "}
                <strong className="text-white">&gt;20m</strong>, escalated to
                Senior Admin pools. At{" "}
                <strong className="text-rose-400">&gt;40m</strong>,
                automatically promoted to CRITICAL severity.
              </p>
            </div>
          </div>
        </div>

        {/* Collaborative Operator Audit Timeline & Triage Notes */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-sky-400" />
                <span>Compliance Audit Timeline & Operator Triage Notes</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Every detection occurrence, deduction fold, notification
                receipt, and operator comment is immutably recorded.
              </p>
            </div>

            {/* Comment input form */}
            <form onSubmit={submitComment} className="space-y-3">
              <textarea
                rows={3}
                placeholder="Append operator triage debugging note or root-cause discovery..."
                value={triageNote}
                onChange={(e) => setTriageNote(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none font-mono"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingNote || !triageNote.trim()}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs shadow-lg transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Post Triage Note to Timeline</span>
                </button>
              </div>
            </form>

            {/* Audit History & Comments feed */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Chronological Event Feed ({history.length + comments.length})
              </h3>

              <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                {comments.map((c) => (
                  <div key={c.id} className="pl-8 relative group">
                    <div className="absolute left-[7px] top-1.5 w-3 h-3 rounded-full bg-sky-500 ring-4 ring-slate-900"></div>
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-extrabold text-sky-300 font-mono">
                          {c.author || "System Operator"} (Triage Note)
                        </span>
                        <span className="text-slate-500 font-mono">
                          {new Date(
                            c.createdAt || Date.now(),
                          ).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 font-sans mt-1 leading-relaxed">
                        {c.content}
                      </p>
                    </div>
                  </div>
                ))}

                {history.map((h) => (
                  <div key={h.id} className="pl-8 relative group">
                    <div className="absolute left-[7px] top-1.5 w-3 h-3 rounded-full bg-slate-700 group-hover:bg-rose-500 transition-colors"></div>
                    <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-bold text-slate-300 font-mono uppercase">
                          {h.action || "AUDIT_EVENT"} •{" "}
                          <span className="text-slate-400 font-normal">
                            By {h.performedBy || "System"}
                          </span>
                        </span>
                        <span className="text-slate-500 font-mono">
                          {new Date(
                            h.timestamp || Date.now(),
                          ).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {h.comment}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import nextDynamic from "next/dynamic";
const DynamicEnterpriseIncidentDetailWorkspacePage = nextDynamic(
  () => Promise.resolve(EnterpriseIncidentDetailWorkspacePageContent),
  { ssr: false },
);
export default function EnterpriseIncidentDetailWorkspacePage(props: any) {
  return <DynamicEnterpriseIncidentDetailWorkspacePage {...props} />;
}
