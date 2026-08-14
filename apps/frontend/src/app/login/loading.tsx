import React from "react";

export default function LoginLoading() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#070709]">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl space-y-6 animate-pulse">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-gray-800" />
          <div className="h-6 w-36 bg-gray-800 rounded" />
          <div className="h-3 w-56 bg-gray-800/60 rounded" />
        </div>
        <div className="space-y-4">
          <div className="h-10 w-full bg-gray-800/80 rounded-xl" />
          <div className="h-10 w-full bg-gray-800/80 rounded-xl" />
          <div className="h-10 w-full bg-blue-600/40 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
