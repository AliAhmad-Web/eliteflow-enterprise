import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(configDir, "../..");

const nextConfig: NextConfig = {
  transpilePackages: ["@enterprise/shared"],
  turbopack: {
    root: monorepoRoot,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
    /** Keep client Router Cache warm so revisits feel instant (no full remount flash). */
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  webpack: (config, { isServer }) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
    };

    if (!isServer && process.env.ANALYZE === "true") {
      // Optional: set ANALYZE=true when @next/bundle-analyzer is installed
      // Keep config valid without the dependency so production builds never break.
    }

    return config;
  },
};

export default nextConfig;
