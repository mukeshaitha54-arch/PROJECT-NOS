'use client';

import React, { useState } from 'react';
import { Users, UserPlus, Search, Filter, FileText, MoreVertical, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function MembersPage() {
  const [members] = useState([
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Global Admin', status: 'Active', lastActive: '2 mins ago' },
    { id: 2, name: 'Sarah Jenkins', email: 'sarah@example.com', role: 'Security Analyst', status: 'Active', lastActive: '1 hr ago' },
    { id: 3, name: 'Mike Smith', email: 'mike@example.com', role: 'Read Only', status: 'Deactivated', lastActive: '2 days ago' },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" /> Organization Members
          </h1>
          <p className="text-sm text-gray-400 mt-1">Manage user access, roles, and permissions across your tenant.</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-500">
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
                placeholder="Search members..."
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm text-gray-200 focus:border-blue-500 outline-none"
              />
            </div>
            <Button variant="outline" className="border-gray-700 text-gray-300 w-full sm:w-auto shrink-0">
              <Filter className="w-4 h-4 mr-2" /> Filters
            </Button>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
             <select className="bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 outline-none w-full sm:w-auto">
                <option value="">Bulk Actions...</option>
                <option value="permissions">Update Permissions</option>
                <option value="deactivate">Deactivate Users</option>
              </select>
              <Button variant="outline" className="border-gray-700 text-gray-300 shrink-0">
                Apply
              </Button>
              <div className="w-px h-6 bg-gray-700 hidden sm:block"></div>
              <Button variant="outline" className="border-gray-700 text-gray-300 shrink-0">
                <FileText className="w-4 h-4 mr-2" /> Export
              </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-800/50 text-gray-400 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4 w-12"><input type="checkbox" className="rounded bg-gray-900 border-gray-700" /></th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role & Permissions</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Last Active</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {members.map(m => (
                <tr key={m.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4"><input type="checkbox" className="rounded bg-gray-900 border-gray-700" /></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 font-bold border border-blue-800">
                        {m.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{m.name}</div>
                        <div className="text-xs text-gray-500">{m.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1.5 text-gray-300">
                      <Shield className="w-3.5 h-3.5 text-purple-400" /> {m.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {m.status === 'Active' ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30">Active</span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-800 text-gray-400 border border-gray-700">Deactivated</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-500">{m.lastActive}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1.5 text-gray-400 hover:text-white rounded transition">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-gray-800 flex justify-between items-center text-sm text-gray-400 bg-gray-950/50">
          <div>Showing 1 to 3 of 3 members</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled className="border-gray-800 text-gray-500">Previous</Button>
            <Button variant="outline" size="sm" disabled className="border-gray-800 text-gray-500">Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
