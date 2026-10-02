import React from "react";

// Pass-through layout — login/register pages are full-screen and self-contained
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
