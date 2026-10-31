import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/plans/:planId", destination: "/sessions/:planId", permanent: false },
      { source: "/admin/plans", destination: "/admin/sessions", permanent: false },
    ];
  },
  // Next's server bundler replaces optional `bufferutil` with a stub, so `ws`
  // throws "mask is not a function" on Neon websocket frames. That surfaces as
  // the production application error (digest 80761995) on any page that queries
  // the database. Load the real `ws` package, and never take the native path.
  serverExternalPackages: ["ws"],
};

export default nextConfig;
