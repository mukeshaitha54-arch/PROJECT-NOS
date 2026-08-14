"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Database,
} from "lucide-react";
import { Button } from "./ui/button";

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  pageSize?: number;
  searchable?: boolean;
  sortable?: boolean;
  searchPlaceholder?: string;
  filterComponent?: React.ReactNode;
  actionsComponent?: React.ReactNode;
  className?: string;
  onRowClick?: (item: T) => void;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  pageSize = 10,
  searchable = true,
  sortable = true,
  searchPlaceholder = "Search records...",
  filterComponent,
  actionsComponent,
  className = "",
  onRowClick,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);

  // Client-side search filtering
  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    const query = search.toLowerCase();
    return data.filter((item) => {
      return Object.values(item).some((val) => {
        if (val === null || val === undefined) return false;
        if (typeof val === "object") {
          return JSON.stringify(val).toLowerCase().includes(query);
        }
        return String(val).toLowerCase().includes(query);
      });
    });
  }, [data, search]);

  // Column sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortOrder === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [filteredData, sortKey, sortOrder]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: string, isColSortable: boolean = true) => {
    if (!sortable || !isColSortable) return;
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  return (
    <div
      className={`bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl ${className}`}
    >
      {/* Controls Bar */}
      {(searchable || filterComponent || actionsComponent) && (
        <div className="p-4 border-b border-gray-800 flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between bg-gray-950/60">
          <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
            {searchable && (
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}
            {filterComponent}
          </div>
          {actionsComponent && (
            <div className="flex items-center gap-2 shrink-0">
              {actionsComponent}
            </div>
          )}
        </div>
      )}

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-gray-800/60 text-gray-400 uppercase text-[11px] font-semibold tracking-wider border-b border-gray-800">
            <tr>
              {columns.map((col) => {
                const isSortable = col.sortable !== false;
                return (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key, isSortable)}
                    className={`px-5 py-3.5 ${
                      sortable && isSortable
                        ? "cursor-pointer select-none hover:text-white"
                        : ""
                    } ${col.className || ""}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.header}</span>
                      {sortable && isSortable && (
                        <span className="text-gray-500">
                          {sortKey === col.key ? (
                            sortOrder === "asc" ? (
                              <ChevronUp className="w-3.5 h-3.5 text-blue-400" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-blue-400" />
                            )
                          ) : (
                            <ChevronsUpDown className="w-3.5 h-3.5 opacity-50" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/80">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Database className="w-8 h-8 text-gray-600 mb-1" />
                    <p className="text-sm font-medium text-gray-400">
                      No records found
                    </p>
                    <p className="text-xs text-gray-500">
                      Try adjusting your search query or filters.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((item, idx) => (
                <tr
                  key={item.id || idx}
                  onClick={() => onRowClick && onRowClick(item)}
                  className={`hover:bg-gray-800/40 transition-colors ${
                    onRowClick ? "cursor-pointer" : ""
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-5 py-3.5 ${col.className || ""}`}
                    >
                      {col.render ? col.render(item) : (item[col.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-400 bg-gray-950/40">
        <div>
          Showing{" "}
          <span className="font-semibold text-gray-200">
            {sortedData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
          </span>{" "}
          to{" "}
          <span className="font-semibold text-gray-200">
            {Math.min(currentPage * pageSize, sortedData.length)}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-gray-200">
            {sortedData.length}
          </span>{" "}
          entries
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="h-8 px-2.5 border-gray-800 hover:border-gray-700 disabled:opacity-40"
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
          </Button>

          <span className="px-2 text-gray-300 font-medium">
            Page {currentPage} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="h-8 px-2.5 border-gray-800 hover:border-gray-700 disabled:opacity-40"
          >
            Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
