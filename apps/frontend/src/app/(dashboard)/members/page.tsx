"use client";

import React, { useState, useMemo } from "react";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  FileText,
  MoreVertical,
  Shield,
  X,
  CheckCircle,
  Mail,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";

interface Member {
  id: number;
  name: string;
  email: string;
  role: string;
  status: "Active" | "Deactivated";
  lastActive: string;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([
    {
      id: 1,
      name: "John Doe",
      email: "john@example.com",
      role: "Global Admin",
      status: "Active",
      lastActive: "2 mins ago",
    },
    {
      id: 2,
      name: "Sarah Jenkins",
      email: "sarah@example.com",
      role: "Security Analyst",
      status: "Active",
      lastActive: "1 hr ago",
    },
    {
      id: 3,
      name: "Mike Smith",
      email: "mike@example.com",
      role: "Read Only",
      status: "Deactivated",
      lastActive: "2 days ago",
    },
  ]);

  const [search, setSearch] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState<boolean>(false);
  const [inviteName, setInviteName] = useState<string>("");
  const [inviteEmail, setInviteEmail] = useState<string>("");
  const [inviteRole, setInviteRole] = useState<string>("Security Analyst");

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        search === "" ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase());

      const matchesRole = roleFilter === "ALL" || m.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [members, search, roleFilter]);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      toast.error("Please enter a valid name and email address.");
      return;
    }

    const newMember: Member = {
      id: Date.now(),
      name: inviteName.trim(),
      email: inviteEmail.trim(),
      role: inviteRole,
      status: "Active",
      lastActive: "Just now",
    };

    setMembers((prev) => [newMember, ...prev]);
    toast.success(`Invitation dispatched to ${inviteEmail.trim()}`);
    setInviteName("");
    setInviteEmail("");
    setIsInviteModalOpen(false);
  };

  const toggleStatus = (id: number) => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const nextStatus = m.status === "Active" ? "Deactivated" : "Active";
          toast.info(`Updated status for ${m.name} to ${nextStatus}`);
          return { ...m, status: nextStatus };
        }
        return m;
      }),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" /> Organization Members
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage user access, roles, and permissions across your tenant.
          </p>
        </div>
        <Button
          onClick={() => setIsInviteModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500"
        >
          <UserPlus className="w-4 h-4 mr-2" /> Invite Member
        </Button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-gray-800 flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between bg-gray-950/50">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="search"
                placeholder="Search members by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm text-gray-200 focus:border-blue-500 outline-none"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 outline-none w-full sm:w-auto shrink-0"
            >
              <option value="ALL">All Roles</option>
              <option value="Global Admin">Global Admin</option>
              <option value="Security Analyst">Security Analyst</option>
              <option value="Read Only">Read Only</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-800/50 text-gray-400 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role & Permissions</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Last Active</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No members match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 font-bold border border-blue-800">
                          {m.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-white">
                            {m.name}
                          </div>
                          <div className="text-xs text-gray-500">{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-gray-300">
                        <Shield className="w-3.5 h-3.5 text-purple-400" />{" "}
                        {m.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {m.status === "Active" ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                          Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-800 text-gray-400 border border-gray-700">
                          Deactivated
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500">{m.lastActive}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => toggleStatus(m.id)}
                        className="text-xs px-2.5 py-1 rounded bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white transition"
                      >
                        {m.status === "Active" ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-gray-800 flex justify-between items-center text-sm text-gray-400 bg-gray-950/50">
          <div>
            Showing {filteredMembers.length} of {members.length} members
          </div>
        </div>
      </div>

      {/* Invite Member Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-400" />
                Invite New Team Member
              </h3>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Morgan"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">
                  Work Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="alex@enterprise.internal"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">
                  Role Assignment
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Global Admin">
                    Global Admin (Full Tenant Access)
                  </option>
                  <option value="Security Analyst">
                    Security Analyst (Alerts & Rules)
                  </option>
                  <option value="Operator">
                    Operator (Device Maintenance)
                  </option>
                  <option value="Read Only">Read Only (Observer)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="border-gray-700 text-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white"
                >
                  Send Invitation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
