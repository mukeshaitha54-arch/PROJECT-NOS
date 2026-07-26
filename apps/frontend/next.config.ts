import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.DOCKER_BUILD === "true" || process.env.CI === "true" ? "standalone" : undefined,
  reactStrictMode: true,
  transpilePackages: ["@nos/shared-types"],
};

export default nextConfig;
