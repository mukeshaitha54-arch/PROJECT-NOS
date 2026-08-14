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
    ];
  },
};

export default nextConfig;
