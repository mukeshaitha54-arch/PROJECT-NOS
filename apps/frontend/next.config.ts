import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output:
    process.platform === "win32" && !process.env.STANDALONE
      ? undefined
      : "standalone",
  reactStrictMode: true,
  transpilePackages: ["@nos/shared-types"],
  async rewrites() {
    const backendUrl =
      process.env.INTERNAL_BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/v1\/?$/, "") ||
      "http://localhost:3001";

    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
      {
        source: "/socket.io/:path*",
        destination: `${backendUrl}/socket.io/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/login",
        destination: "/auth/login",
        permanent: false,
      },
      {
        source: "/register",
        destination: "/auth/register",
        permanent: false,
      },
      {
        source: "/device",
        destination: "/devices",
        permanent: true,
      },
      {
        source: "/device/:id",
        destination: "/devices/:id",
        permanent: true,
      },
      {
        source: "/device/:id/inventory",
        destination: "/inventory/:id",
        permanent: true,
      },
      {
        source: "/devices/:id/inventory",
        destination: "/inventory/:id",
        permanent: true,
      },
      {
        source: "/dashboard/devices",
        destination: "/devices",
        permanent: true,
      },
      {
        source: "/dashboard/devices/:id",
        destination: "/devices/:id",
        permanent: true,
      },
      {
        source: "/dashboard/fleet",
        destination: "/fleet",
        permanent: true,
      },
      {
        source: "/dashboard/alerts",
        destination: "/alerts",
        permanent: true,
      },
      {
        source: "/dashboard/inventory",
        destination: "/inventory",
        permanent: true,
      },
      {
        source: "/dashboard/inventory/:id",
        destination: "/inventory/:id",
        permanent: true,
      },
      {
        source: "/dashboard/settings",
        destination: "/settings",
        permanent: true,
      },
      {
        source: "/dashboard/settings/:path*",
        destination: "/settings/:path*",
        permanent: true,
      },
      {
        source: "/dashboard/members",
        destination: "/members",
        permanent: true,
      },
      {
        source: "/dashboard/audit",
        destination: "/audit",
        permanent: true,
      },
      {
        source: "/dashboard/admin/:path*",
        destination: "/admin/:path*",
        permanent: true,
      },
      {
        source: "/organization",
        destination: "/members",
        permanent: true,
      },
      {
        source: "/dashboard/organization",
        destination: "/members",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
