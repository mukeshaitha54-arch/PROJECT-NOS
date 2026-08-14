"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  ArrowLeft,
  Shield,
  UserCheck,
  CheckCircle,
  Mail,
} from "lucide-react";
import { DataTable, Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";

interface UserRow extends Record<string, unknown> {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isEmailVerified: boolean;
  createdAt: string;
}

export default function UserGovernancePage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<any>("/tenant/members");
      const members = res.data?.data?.items || [];

      const mapped: UserRow[] = members.map((m: any) => ({
        id: m.userId || m.id,
        email: m.user?.email || "N/A",
        firstName: m.user?.firstName || "Unknown",
        lastName: m.user?.lastName || "",
        role: m.role,
        isEmailVerified: !m.isSuspended,
        createdAt: m.joinedAt || new Date().toISOString(),
      }));
      setUsers(mapped);
    } catch (err: any) {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const userColumns: Column<UserRow>[] = [
    {
      key: "email",
      header: "User Email",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <Mail className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-white">{String(row.email)}</span>
        </div>
      ),
    },
    {
      key: "name",
      header: "Full Name",
      sortable: true,
      render: (row) => (
        <span>
          {String(row.firstName)} {String(row.lastName)}
        </span>
      ),
    },
    {
      key: "role",
      header: "RBAC Role",
      sortable: true,
      render: (row) => (
        <Badge
          variant={
            row.role === "ADMIN" || row.role === "SUPER_ADMIN"
              ? "critical"
              : "info"
          }
          size="xs"
        >
          {String(row.role)}
        </Badge>
      ),
    },
    {
      key: "isEmailVerified",
      header: "Status",
      render: (row) => (
        <Badge variant={row.isEmailVerified ? "online" : "warning"} size="xs">
          {row.isEmailVerified ? "Verified" : "Pending OTP"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 sm:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Admin
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                User Governance & Roles
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Provision users, assign RBAC permissions, and manage
                verification.
              </p>
            </div>
          </div>

          <button
            onClick={loadUsers}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-6 backdrop-blur-xl">
          <DataTable
            columns={userColumns}
            data={users}
            loading={loading}
            searchable={true}
            searchPlaceholder="Search users by name, email, role..."
          />
        </div>
      </div>
    </div>
  );
}
