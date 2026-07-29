import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Clerk-hosted collaborator avatars.
    remotePatterns: [{ protocol: "https", hostname: "img.clerk.com" }],
  },
  experimental: {
    // Turbopack's dev filesystem cache (default on since Next 16.1) writes
    // into `.next` mid-session; on this machine those writes were being
    // picked back up by the dev watcher as source changes, triggering an
    // endless recompile of `_app`/`_error`/`_document` that pegged the CPU
    // and grew the server's heap until it OOM'd. Disabling it stops the loop.
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
