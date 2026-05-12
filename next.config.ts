import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Lockfile root warning is cosmetic — leaving default to avoid Turbopack
     OOM seen on Windows when turbopack.root is set explicitly. */
};

export default nextConfig;
