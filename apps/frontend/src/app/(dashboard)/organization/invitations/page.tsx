"use client";

import React, { useState } from "react";
import { Mail, RefreshCw, XCircle, Search, Filter, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InvitationsPage() {
  const [invites] = useState([
    {
      id: 1,
      email: "alex@example.com",
      role: "Operator",
      status: "PENDING",
      sentAt: "2026-07-26T10:00:00Z",
      expiresAt: "2026-08-02T10:00:00Z",
    },
    {
      id: 2,
      email: "david@example.com",
      role: "Read Only",
      status: "ACCEPTED",
      sentAt: "2026-07-20T10:00:00Z",
      expiresAt: "2026-07-27T10:00:00Z",
    },
    {
      id: 3,
      email: "emma@example.com",
      role: "Security Analyst",
      status: "EXPIRED",
      sentAt: "2026-07-10T10:00:00Z",
      expiresAt: "2026-07-17T10:00:00Z",
    },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Mail className="w-6 h-6 text-blue-500" /> Pending Invitations
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage user invitations to join your organization.
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-500">
          <Send className="w-4 h-4 mr-2" /> Send Invite
        </Button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-gray-800 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-950/50">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="search"
              placeholder="Search email addresses..."
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm text-gray-200 focus:border-blue-500 outline-none"
            />
          </div>
          <Button
            variant="outline"
            className="w-full sm:w-auto border-gray-700 text-gray-300"
          >
            <Filter className="w-4 h-4 mr-2" /> Filters
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-800/50 text-gray-400 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Email Address</th>
                <th className="px-6 py-4">Assigned Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Sent At</th>
                <th className="px-6 py-4">Expires</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {invites.map((i) => (
                <tr
                  key={i.id}
                  className="hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-6 py-4 font-semibold text-white">
                    {i.email}
                  </td>
                  <td className="px-6 py-4 text-purple-400 font-medium">
                    {i.role}
                  </td>
                  <td className="px-6 py-4">
                    {i.status === "PENDING" && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-500 border border-yellow-500/30">
                        Pending
                      </span>
                    )}
                    {i.status === "ACCEPTED" && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                        Accepted
                      </span>
                    )}
                    {i.status === "EXPIRED" && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                        Expired
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {new Date(i.sentAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    {new Date(i.expiresAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {i.status !== "ACCEPTED" && (
                        <>
                          <button
                            className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded transition"
                            title="Resend Invite"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition"
                            title="Cancel Invite"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
