import type { NextConfig } from "next";

const nextConfig = {
  agentRules: false,
  serverExternalPackages: ["pg"],
} as NextConfig;

export default nextConfig;
