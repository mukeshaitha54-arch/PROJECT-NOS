"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Bell,
  Key,
  AlertTriangle,
  Save,
  Plus,
  Copy,
  Check,
  Trash2,
  Lock,
  Mail,
  Shield,
  X,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

interface ApiKeyItem {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsed: string;
}

export default function SettingsPage() {
  const { user } = useAuth();

  // Section 1: Profile State
  const [displayName, setDisplayName] = useState(
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : "Admin User",
  );
  const [email] = useState(user?.email || "admin@nos.internal");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Section 2: Notifications State
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [criticalOnly, setCriticalOnly] = useState(false);

  // Section 3: API Keys State
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([
    {
      id: "key-01",
      name: "Production Cluster Sync",
      prefix: "nos_live_9a8f...",
      createdAt: "2026-08-01",
      lastUsed: "10 mins ago",
    },
    {
      id: "key-02",
      name: "CLI Provisioning Key",
      prefix: "nos_live_4b2c...",
      createdAt: "2026-08-10",
      lastUsed: "2 hours ago",
    },
  ]);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Section 4: Danger Zone State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    toast.success("Profile preferences saved successfully.");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleSaveNotifications = () => {
    toast.success("Notification preferences updated.");
  };

  const handleGenerateKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    const newKey: ApiKeyItem = {
      id: `key-${Date.now()}`,
      name: newKeyName.trim(),
      prefix: `nos_live_${Math.random().toString(36).substring(2, 6)}...`,
      createdAt: new Date().toISOString().split("T")[0],
      lastUsed: "Never",
    };

    setApiKeys((prev) => [newKey, ...prev]);
    toast.success(`Generated API key: "${newKeyName.trim()}"`);
    setNewKeyName("");
    setIsGenerateModalOpen(false);
  };

  const handleRevokeKey = (id: string) => {
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
    toast.info("API key revoked.");
  };

  const handleCopyKey = (prefix: string, id: string) => {
    navigator.clipboard.writeText(prefix);
    setCopiedKeyId(id);
    toast.success("Key token prefix copied to clipboard");
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmationText !== "DELETE") {
      toast.error("Please type DELETE to confirm.");
      return;
    }
    toast.info("Account deletion initiated.");
    setIsDeleteModalOpen(false);
  };

  return (
    <div className="space-y-8 max-w-4xl pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <Shield className="w-6 h-6 text-blue-500" /> Platform & Security
          Settings
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Manage your tenant identity, notification webhooks, API tokens, and
          tenant policies.
        </p>
      </div>

      {/* SECTION 1: PROFILE */}
      <Card className="bg-gray-900/90 border-gray-800 p-6 shadow-xl space-y-6">
        <CardTitle className="text-base font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-3">
          <User className="w-5 h-5 text-blue-400" /> User Profile & Credentials
        </CardTitle>

        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          <div className="flex items-center gap-4 pb-2">
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-lg font-bold shadow-lg">
              {displayName.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{displayName}</p>
              <p className="text-gray-400 text-xs">{email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 font-semibold mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-gray-950 border border-gray-800 text-white focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-gray-400 font-semibold mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-3.5 py-2 rounded-lg bg-gray-950/50 border border-gray-800 text-gray-500 cursor-not-allowed text-xs"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-gray-800/80">
            <span className="font-semibold text-gray-300 block mb-2">
              Update Password
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <input
                  type="password"
                  placeholder="Current Password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-800 text-white text-xs"
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-800 text-white text-xs"
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-800 text-white text-xs"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" /> Save Profile
            </Button>
          </div>
        </form>
      </Card>

      {/* SECTION 2: NOTIFICATIONS */}
      <Card className="bg-gray-900/90 border-gray-800 p-6 shadow-xl space-y-5">
        <CardTitle className="text-base font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-3">
          <Bell className="w-5 h-5 text-amber-400" /> Incident Notifications
        </CardTitle>

        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-white block">
                Email Alerts Dispatch
              </span>
              <span className="text-gray-400 text-[11px] block">
                Deliver instant incident reports to your registered email
                address.
              </span>
            </div>
            <input
              type="checkbox"
              checked={emailAlerts}
              onChange={(e) => setEmailAlerts(e.target.checked)}
              className="w-5 h-5 rounded bg-gray-950 border-gray-700 text-blue-600 focus:ring-0"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-white block">
                Browser Push Notifications
              </span>
              <span className="text-gray-400 text-[11px] block">
                Receive instant web push banners for critical cluster anomalies.
              </span>
            </div>
            <input
              type="checkbox"
              checked={pushAlerts}
              onChange={(e) => setPushAlerts(e.target.checked)}
              className="w-5 h-5 rounded bg-gray-950 border-gray-700 text-blue-600 focus:ring-0"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-white block">
                Severity Filter Mode
              </span>
              <span className="text-gray-400 text-[11px] block">
                Only notify on Critical breaches (mute Warning/Info).
              </span>
            </div>
            <input
              type="checkbox"
              checked={criticalOnly}
              onChange={(e) => setCriticalOnly(e.target.checked)}
              className="w-5 h-5 rounded bg-gray-950 border-gray-700 text-blue-600 focus:ring-0"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              onClick={handleSaveNotifications}
              variant="outline"
              className="border-gray-700 hover:border-gray-600 text-gray-300 text-xs font-semibold"
            >
              Update Notification Rules
            </Button>
          </div>
        </div>
      </Card>

      {/* SECTION 3: API KEYS */}
      <Card className="bg-gray-900/90 border-gray-800 p-6 shadow-xl space-y-5">
        <div className="flex justify-between items-center border-b border-gray-800 pb-3">
          <CardTitle className="text-base font-bold text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-purple-400" /> Platform API Keys
          </CardTitle>
          <Button
            size="sm"
            onClick={() => setIsGenerateModalOpen(true)}
            className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Generate New Key
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-gray-950/60 text-gray-400 uppercase text-[10px] font-semibold border-b border-gray-800">
              <tr>
                <th className="px-4 py-3">Key Name</th>
                <th className="px-4 py-3">Token Prefix</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Last Used</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/80">
              {apiKeys.map((k) => (
                <tr key={k.id} className="hover:bg-gray-800/30 transition">
                  <td className="px-4 py-3 font-semibold text-white">
                    {k.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-400">
                    {k.prefix}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{k.createdAt}</td>
                  <td className="px-4 py-3 text-gray-500">{k.lastUsed}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => handleCopyKey(k.prefix, k.id)}
                      className="text-gray-400 hover:text-white transition p-1"
                      title="Copy Key"
                    >
                      {copiedKeyId === k.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleRevokeKey(k.id)}
                      className="text-red-400 hover:text-red-300 transition p-1"
                      title="Revoke Key"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* SECTION 4: DANGER ZONE */}
      <Card className="bg-red-950/15 border border-red-900/50 p-6 shadow-xl space-y-4">
        <CardTitle className="text-base font-bold text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" /> Danger Zone
        </CardTitle>
        <p className="text-xs text-gray-400">
          Permanently delete your user account and revoke all provisioned
          cluster access credentials. This action cannot be undone.
        </p>
        <Button
          variant="outline"
          onClick={() => setIsDeleteModalOpen(true)}
          className="border-red-800 text-red-400 hover:bg-red-900/40 text-xs font-semibold"
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete Account
        </Button>
      </Card>

      {/* Generate API Key Modal */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-sm font-bold text-white">
                Generate API Token
              </h3>
              <button
                onClick={() => setIsGenerateModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGenerateKey} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-400 mb-1 font-semibold">
                  Key Description / Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CI Telemetry Pipeline"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-800 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="border-gray-700 text-gray-300 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs"
                >
                  Create Key
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-gray-900 border border-red-900/60 rounded-xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white">
              Confirm Account Deletion
            </h3>
            <p className="text-xs text-gray-400">
              Type <strong className="text-red-400 font-mono">DELETE</strong>{" "}
              below to confirm permanent account purge:
            </p>

            <input
              type="text"
              placeholder="Type DELETE"
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-800 text-white text-xs font-mono"
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteConfirmationText("");
                }}
                className="border-gray-700 text-gray-300 text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmationText !== "DELETE"}
                className="bg-red-600 hover:bg-red-500 text-white text-xs disabled:opacity-40"
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
