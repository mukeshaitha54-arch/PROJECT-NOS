"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, Key, Trash, Plus, Copy, Check, Download } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { safeCopyToClipboard } from "@/lib/clipboard";

export default function RegistrationKeysPage() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [deployOption, setDeployOption] = useState<"automated" | "manual">(
    "automated",
  );
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  // Form State
  const [displayName, setDisplayName] = useState("");
  const [maxUses, setMaxUses] = useState(100);
  const [expiresInDays, setExpiresInDays] = useState(365);

  const getOrgId = (): string | null => {
    if (!user) return null;
    const u = user as any;
    return u.organizationId || u.tenantId || u.orgId || null;
  };

  const getToken = (): string => {
    if (typeof window === "undefined") return "";
    return (
      localStorage.getItem("nos_access_token") ||
      localStorage.getItem("accessToken") ||
      ""
    );
  };

  const apiBase = (): string => {
    if (typeof window !== "undefined") {
      if (process.env.NEXT_PUBLIC_API_BASE_URL) {
        return process.env.NEXT_PUBLIC_API_BASE_URL;
      }
      if (
        window.location.hostname !== "localhost" &&
        window.location.hostname !== "127.0.0.1"
      ) {
        return `${window.location.origin}/api/v1`;
      }
      return "http://localhost:4000/api/v1";
    }
    return "http://nos.is-local.org/api/v1";
  };

  const fetchKeys = async () => {
    const orgId = getOrgId();
    if (!orgId) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(
        `${apiBase()}/fleet/registration-keys?organizationId=${orgId}`,
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );
      const data = await res.json();
      setKeys(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load registration keys");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const orgId = getOrgId();
    if (!orgId) {
      toast.error("No organization found. Please complete onboarding first.");
      return;
    }
    setSubmitting(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const res = await fetch(`${apiBase()}/fleet/registration-keys`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          organizationId: orgId,
          displayName,
          maxUses,
          expiresAt: expiresAt.toISOString(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData?.error?.message || errData?.message || "Failed to create key",
        );
      }

      const data = await res.json();
      const plainKey = data.plainKey || data?.data?.key || null;
      setNewKey(plainKey);
      toast.success("Registration key created!");
      fetchKeys();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error creating registration key");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Revoke this key? Agents using it cannot re-register."))
      return;
    try {
      const res = await fetch(`${apiBase()}/fleet/registration-keys/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed to revoke");
      toast.success("Key revoked");
      fetchKeys();
    } catch {
      toast.error("Error revoking key");
    }
  };

  const copyToClipboard = async (text: string) => {
    await safeCopyToClipboard(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    toast.success("Copied to clipboard!");
  };

  const downloadAgent = () => {
    const url = `${apiBase()}/fleet/installer/windows?registrationKey=${encodeURIComponent(newKey || "")}&serverUrl=${encodeURIComponent(apiBase())}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = "install-nos-agent.ps1";
    a.click();
  };

  const downloadExe = () => {
    const directUrl = `${apiBase().replace(/\/api\/v1$/, "")}/downloads/NOS-Agent.exe`;
    const a = document.createElement("a");
    a.href = directUrl;
    a.download = "NOS-Agent.exe";
    a.click();
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-gray-500">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  const orgId = getOrgId();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Key className="text-[#C8A96E]" /> Registration Keys
          </h1>
          <p className="text-gray-400 mt-1">
            Manage agent enrollment tokens. Each key lets Windows PCs register
            with NOS automatically.
          </p>
        </div>
        <button
          onClick={() => {
            setIsModalOpen(true);
            setNewKey(null);
            setDisplayName("");
          }}
          disabled={!orgId}
          className="bg-[#C8A96E] text-black font-semibold px-4 py-2 rounded flex items-center gap-2 hover:bg-[#b09050] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} /> Create Key
        </button>
      </div>

      {/* No org warning */}
      {!orgId && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 p-4 rounded-lg text-sm">
          ⚠ No organization found. Complete account onboarding to create
          registration keys.
        </div>
      )}

      {/* Table */}
      <div className="bg-black/40 border border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left text-gray-400">
          <thead className="text-xs text-gray-500 uppercase bg-gray-900/50">
            <tr>
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Key Prefix</th>
              <th className="px-6 py-3">Devices</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Expires</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-10 text-center text-gray-500"
                >
                  No registration keys yet. Create one to start enrolling
                  devices.
                </td>
              </tr>
            ) : (
              keys.map((k) => (
                <tr
                  key={k.id}
                  className="border-b border-gray-800 hover:bg-gray-800/50"
                >
                  <td className="px-6 py-4 font-medium text-gray-200">
                    {k.displayName}
                  </td>
                  <td className="px-6 py-4 font-mono text-gray-500 text-xs">
                    {k.keyPrefix}
                  </td>
                  <td className="px-6 py-4">
                    {k.currentUses ?? 0} / {k.maxUses === 0 ? "∞" : k.maxUses}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        k.status === "ACTIVE"
                          ? "bg-green-500/10 text-green-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {k.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs">
                    {k.expiresAt
                      ? new Date(k.expiresAt).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {k.status === "ACTIVE" && (
                      <button
                        onClick={() => handleRevoke(k.id)}
                        className="text-red-400 hover:text-red-300 p-2"
                        title="Revoke key"
                      >
                        <Trash size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Key Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Registration Key"
      >
        {newKey ? (
          <div className="space-y-4">
            <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 p-3 rounded text-sm">
              ⚠ <strong>Copy this key now</strong> — it will not be shown again.
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={newKey}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-gray-200 font-mono text-xs"
              />
              <button
                onClick={() => copyToClipboard(newKey)}
                className={`shrink-0 flex items-center gap-1.5 p-2.5 rounded border text-xs font-bold transition-all ${
                  copiedKey
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                    : "bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300"
                }`}
                title="Copy key"
              >
                {copiedKey ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>

            {/* Deployment Method Tabs */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Select Installation Method:
              </p>
              <div className="grid grid-cols-2 gap-2 bg-gray-900 p-1 rounded-lg border border-gray-700">
                <button
                  type="button"
                  onClick={() => setDeployOption("automated")}
                  className={`py-1.5 px-3 rounded text-xs font-bold transition-all ${
                    deployOption === "automated"
                      ? "bg-blue-600 text-white"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Option 1: Automated (.ps1)
                </button>
                <button
                  type="button"
                  onClick={() => setDeployOption("manual")}
                  className={`py-1.5 px-3 rounded text-xs font-bold transition-all ${
                    deployOption === "manual"
                      ? "bg-blue-600 text-white"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Option 2: Standalone (.exe)
                </button>
              </div>
            </div>

            {/* Option 1: Automated */}
            {deployOption === "automated" && (
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-3 text-xs text-gray-300">
                <p className="font-semibold text-white">
                  Automated Windows Service Installation (Recommended):
                </p>
                <ol className="list-decimal list-inside space-y-2 text-gray-300">
                  <li>Download the installer script below.</li>
                  <li>Move it to the target PC.</li>
                  <li>
                    Open <strong>PowerShell as Administrator</strong> and run:
                    <div className="mt-1 flex items-center gap-2">
                      <code className="flex-1 font-mono text-[11px] bg-gray-950 border border-gray-800 text-cyan-300 px-2.5 py-1.5 rounded">
                        powershell -ExecutionPolicy Bypass -File
                        .\install-nos-agent.ps1
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            "powershell -ExecutionPolicy Bypass -File .\\install-nos-agent.ps1",
                          );
                          setCopiedCmd(true);
                          setTimeout(() => setCopiedCmd(false), 2000);
                        }}
                        className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[11px]"
                      >
                        {copiedCmd ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </li>
                  <li>Paste the key above when prompted.</li>
                </ol>
                <p className="text-[11px] text-blue-400/90 pt-1 border-t border-gray-800">
                  ⚡{" "}
                  <em>
                    Automatically downloads the agent and sets it up as a
                    persistent Windows Service that restarts with Windows.
                  </em>
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={downloadAgent}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded text-xs transition"
                  >
                    <Download size={14} /> Download Installer (.ps1)
                  </button>
                </div>
              </div>
            )}

            {/* Option 2: Manual */}
            {deployOption === "manual" && (
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-3 text-xs text-gray-300">
                <p className="font-semibold text-white">
                  Manual Standalone Executable (No Service):
                </p>
                <ol className="list-decimal list-inside space-y-2 text-gray-300">
                  <li>
                    Download <code>NOS-Agent.exe</code> below.
                  </li>
                  <li>Move the EXE to the target PC.</li>
                  <li>
                    Double-click or run from command line:
                    <div className="mt-1 flex items-center gap-2">
                      <code className="flex-1 font-mono text-[11px] bg-gray-950 border border-gray-800 text-cyan-300 px-2.5 py-1.5 rounded">
                        .\NOS-Agent.exe
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(".\\NOS-Agent.exe");
                          setCopiedCmd(true);
                          setTimeout(() => setCopiedCmd(false), 2000);
                        }}
                        className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[11px]"
                      >
                        {copiedCmd ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </li>
                  <li>
                    First-run wizard prompts for Server URL and Registration
                    Key.
                  </li>
                </ol>
                <p className="text-[11px] text-emerald-400/90 pt-1 border-t border-gray-800">
                  ⚡{" "}
                  <em>
                    Runs interactively. Config is saved to
                    %LOCALAPPDATA%\NOS\appsettings.json.
                  </em>
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={downloadExe}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded text-xs transition"
                  >
                    <Download size={14} /> Download NOS-Agent.exe
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="bg-[#C8A96E] text-black font-semibold py-2 px-6 rounded text-xs hover:bg-[#b09050]"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Display Name
              </label>
              <input
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g., Office PCs — 2026"
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-[#C8A96E]"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Max Devices{" "}
                <span className="text-gray-600">(0 = unlimited)</span>
              </label>
              <input
                type="number"
                min="0"
                value={maxUses}
                onChange={(e) => setMaxUses(parseInt(e.target.value) || 0)}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-[#C8A96E]"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Expires in (Days)
              </label>
              <input
                type="number"
                min="1"
                max="3650"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(parseInt(e.target.value))}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-[#C8A96E]"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded text-gray-400 hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-[#C8A96E] text-black font-semibold px-4 py-2 rounded hover:bg-[#b09050] disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                Generate Key
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
