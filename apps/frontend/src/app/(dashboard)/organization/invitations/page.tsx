"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  RefreshCw,
  XCircle,
  Search,
  Send,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Shield,
  ArrowRight,
  UserCheck,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { clearScopedDeviceCache } from "@/lib/cache";

interface InvitationPreview {
  id: string;
  organizationName: string;
  organizationId: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  isExpired: boolean;
}

interface OrgInvitation {
  id: string;
  email: string;
  role: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string | null;
}

function InvitationsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const token = searchParams.get("token");

  // Accept Flow State
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(!!token);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState<boolean>(false);

  // Management Flow State
  const [invitations, setInvitations] = useState<OrgInvitation[]>([]);
  const [isListLoading, setIsListLoading] = useState<boolean>(!token);
  const [search, setSearch] = useState<string>("");

  // Fetch token preview if token param is present
  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    const fetchPreview = async () => {
      try {
        setIsPreviewLoading(true);
        setPreviewError(null);
        const res = await apiClient.get(
          `/tenant/invitations/preview?token=${token}`,
        );
        if (isMounted && res.data?.data) {
          setPreview(res.data.data);
        }
      } catch (err: any) {
        if (isMounted) {
          setPreviewError(
            err?.response?.data?.message ||
              "This invitation link is invalid or has expired.",
          );
        }
      } finally {
        if (isMounted) setIsPreviewLoading(false);
      }
    };

    fetchPreview();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Fetch all org invitations if in management mode
  const fetchInvitations = useCallback(async () => {
    try {
      setIsListLoading(true);
      const res = await apiClient.get("/tenant/invitations");
      if (res.data?.data) {
        setInvitations(res.data.data);
      }
    } catch (err: any) {
      console.warn("Could not load invitations list:", err);
    } finally {
      setIsListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token && isAuthenticated) {
      fetchInvitations();
    }
  }, [token, isAuthenticated, fetchInvitations]);

  const handleAccept = async () => {
    if (!token) return;
    try {
      setIsAccepting(true);
      const res = await apiClient.post("/tenant/invitations/accept", { token });
      const targetOrgId =
        res.data?.data?.activeOrganizationId ||
        res.data?.data?.organizationId ||
        preview?.organizationId;
      if (targetOrgId && typeof window !== "undefined") {
        clearScopedDeviceCache();
        localStorage.setItem("nos_active_org_id", targetOrgId);
      }
      toast.success(
        `Welcome! You have successfully joined ${preview?.organizationName || "the organization"}.`,
      );
      setTimeout(() => {
        router.push("/fleet");
      }, 1000);
    } catch (err: any) {
      console.error("Accept error:", err);
      toast.error(
        err?.response?.data?.message ||
          "Failed to accept invitation. Please check your credentials.",
      );
    } finally {
      setIsAccepting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await apiClient.delete(`/tenant/invitations/${id}`);
      toast.success("Invitation revoked successfully.");
      await fetchInvitations();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to revoke invitation.",
      );
    }
  };

  const formatRole = (role: string) => {
    switch (role?.toUpperCase()) {
      case "ADMIN":
        return "Global Admin";
      case "VIEWER":
        return "Read Only";
      case "ANALYST":
      case "SECURITY_ANALYST":
        return "Alerts Only";
      case "OPERATOR":
        return "Operator";
      case "OWNER":
        return "Workspace Owner";
      default:
        return role;
    }
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER: TOKEN ACCEPTANCE CARD
  // ─────────────────────────────────────────────────────────────
  if (token) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl bg-[#121319]/80 backdrop-blur-2xl border border-white/[0.08] p-8 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.06)] relative overflow-hidden">
          {/* Subtle Ambient Aurora Glow */}
          <div className="absolute -top-24 -right-24 w-60 h-60 bg-gradient-to-br from-[#f47b36]/20 to-transparent rounded-full blur-3xl pointer-events-none" />

          {isPreviewLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <RefreshCw className="w-8 h-8 text-[#f47b36] animate-spin" />
              <p className="text-sm text-zinc-400">
                Verifying secure invitation credentials...
              </p>
            </div>
          ) : previewError ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <XCircle className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-white">
                Invitation Invalid or Expired
              </h2>
              <p className="text-sm text-zinc-400 max-w-md">{previewError}</p>
              <Link
                href="/fleet"
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-xs font-semibold text-zinc-200 hover:bg-white/[0.1] transition"
              >
                Return to Dashboard
              </Link>
            </div>
          ) : preview ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/30 flex items-center justify-center text-[#3D8BFF]">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-mono tracking-wider uppercase text-[#3D8BFF]">
                    Zero-Trust Fleet Invitation
                  </span>
                  <h1 className="text-xl font-bold text-white">
                    Join {preview.organizationName}
                  </h1>
                </div>
              </div>

              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> Recipient
                  </span>
                  <span className="font-mono text-zinc-200">
                    {preview.email}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> Assigned Access
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-500/15 text-[#3D8BFF] border border-white/[0.08]">
                    {formatRole(preview.role)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Expiration
                  </span>
                  <span className="text-zinc-400">
                    {new Date(preview.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {preview.status === "ACCEPTED" ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-semibold">
                    <CheckCircle2 className="w-4 h-4" /> You have already
                    accepted this invitation.
                  </div>
                  <Link
                    href="/fleet"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#3D8BFF] to-[#2563EB] hover:from-[#60A5FA] hover:to-[#3D8BFF] text-white text-xs font-bold shadow-[0_4px_16px_-4px_rgba(61,139,255,0.5)] transition"
                  >
                    Open Fleet Command <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : isAuthenticated ? (
                <div className="space-y-3">
                  <p className="text-xs text-zinc-400 text-center">
                    Signed in as{" "}
                    <strong className="text-white">{user?.email}</strong>.
                    Accept this invitation to immediately gain{" "}
                    {formatRole(preview.role)} access to this
                    organization&apos;s devices.
                  </p>
                  <Button
                    onClick={handleAccept}
                    disabled={isAccepting}
                    className="w-full bg-gradient-to-r from-[#3D8BFF] to-[#2563EB] hover:from-[#60A5FA] hover:to-[#3D8BFF] text-white font-semibold text-xs py-3 rounded-xl shadow-[0_4px_20px_-4px_rgba(61,139,255,0.5)] transition active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {isAccepting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserCheck className="w-4 h-4" />
                    )}
                    Accept Invitation & Join Fleet
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-zinc-400 text-center">
                    Please sign in or register to accept your invitation to{" "}
                    {preview.organizationName}.
                  </p>
                  <Link
                    href={`/auth/login?redirect=${encodeURIComponent(`/organization/invitations?token=${token}`)}`}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#3D8BFF] to-[#2563EB] hover:from-[#60A5FA] hover:to-[#3D8BFF] text-white font-semibold text-xs shadow-[0_4px_20px_-4px_rgba(61,139,255,0.5)] transition"
                  >
                    Sign In to Accept <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: INVITATIONS MANAGEMENT TABLE
  // ─────────────────────────────────────────────────────────────
  const filtered = invitations.filter((inv) =>
    search === ""
      ? true
      : inv.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Mail className="w-6 h-6 text-[#3D8BFF]" /> Pending & Historical
            Invitations
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Track and manage outbound member invitations to your organization.
          </p>
        </div>
        <Link href="/members">
          <Button className="bg-gradient-to-r from-[#3D8BFF] to-[#2563EB] hover:from-[#60A5FA] hover:to-[#3D8BFF] text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-[0_4px_16px_-4px_rgba(61,139,255,0.4)]">
            <Send className="w-3.5 h-3.5 mr-2" /> Invite New Member
          </Button>
        </Link>
      </div>

      <div className="rounded-2xl bg-[#121319]/70 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_-8px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.06)] overflow-hidden">
        <div className="p-4 border-b border-white/[0.06] flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/[0.02]">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="search"
              placeholder="Filter by email address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950/80 border border-white/[0.08] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#3D8BFF]/60 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <button
            onClick={() => fetchInvitations()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-zinc-300 hover:border-blue-500/40 hover:text-white transition"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isListLoading ? "animate-spin" : ""}`}
            />{" "}
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-white/[0.03] text-zinc-400 uppercase text-[10px] font-mono tracking-wider border-b border-white/[0.06]">
              <tr>
                <th className="px-6 py-3.5">Email Address</th>
                <th className="px-6 py-3.5">Assigned Role</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Sent At</th>
                <th className="px-6 py-3.5">Expires</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {isListLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-zinc-500"
                  >
                    <RefreshCw className="w-5 h-5 mx-auto animate-spin text-[#3D8BFF] mb-2" />
                    Loading invitations...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-zinc-400"
                  >
                    No active or historical invitations found.
                  </td>
                </tr>
              ) : (
                filtered.map((i) => (
                  <tr
                    key={i.id}
                    className="hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="px-6 py-4 font-semibold text-white font-mono">
                      {i.email}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-[#fb9858] border border-white/[0.08]">
                        {formatRole(i.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {i.status === "PENDING" && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/25">
                          Pending
                        </span>
                      )}
                      {i.status === "ACCEPTED" && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                          Accepted
                        </span>
                      )}
                      {i.status === "EXPIRED" && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-500/15 text-zinc-400 border border-zinc-500/25">
                          Expired
                        </span>
                      )}
                      {i.status === "REVOKED" && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/25">
                          Revoked
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-zinc-400">
                      {new Date(i.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-zinc-400">
                      {new Date(i.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {i.status === "PENDING" && (
                        <button
                          onClick={() => handleRevoke(i.id)}
                          className="px-2.5 py-1 rounded-lg text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 text-[11px] transition"
                          title="Revoke Invitation"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function InvitationsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center text-zinc-400 text-xs">
          <RefreshCw className="w-5 h-5 text-[#f47b36] animate-spin mr-2" />
          Loading invitations...
        </div>
      }
    >
      <InvitationsContent />
    </Suspense>
  );
}
