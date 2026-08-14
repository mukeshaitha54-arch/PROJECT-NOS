"use client";

import React from "react";
import Link from "next/link";
import { Settings, Key, Building2, Users, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SettingsHubPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-500" /> Organization Settings
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage global preferences, branding, and security policies.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Settings Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl p-6">
            <h2 className="text-lg font-bold text-white mb-6">
              General & Branding
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    defaultValue="Acme Global Ops"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Support Email
                  </label>
                  <input
                    type="email"
                    defaultValue="noc-support@acme-ops.internal"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Data Retention Policy
                  </label>
                  <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm">
                    <option>30 Days (Standard Tier)</option>
                    <option>90 Days (Professional)</option>
                    <option>365 Days (Enterprise Audit)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Telemetry Sample Frequency
                  </label>
                  <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm">
                    <option>High Frequency (Every 5s)</option>
                    <option>Standard (Every 10s)</option>
                    <option>Low Bandwidth (Every 60s)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              className="bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Reset Changes
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2">
              <Save className="w-4 h-4" /> Save Preferences
            </Button>
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-4">
          <Link
            href="/settings/registration-keys"
            className="block p-5 bg-gray-900 border border-gray-800 rounded-xl hover:border-blue-500 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-800 rounded-lg group-hover:bg-blue-900/50 group-hover:text-blue-400 text-gray-400 transition-colors">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-white group-hover:text-blue-400 transition-colors">
                    Registration Keys
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Manage agent enrollment tokens.
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
