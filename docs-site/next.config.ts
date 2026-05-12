import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: false,
  // Allow reading docs from parent directory during build
  serverExternalPackages: [],
};

export default nextConfig;
