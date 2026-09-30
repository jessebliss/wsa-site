import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next's server bundler replaces optional `bufferutil` with a stub, so `ws`
  // throws "mask is not a function" on Neon websocket frames. That surfaces as
  // the production application error (digest 80761995) on any page that queries
  // the database. Load the real `ws` package, and never take the native path.
  serverExternalPackages: ["ws"],
  async redirects() {
    return [
      { source: "/home", destination: "/", permanent: false },
      { source: "/book-online", destination: "/book-session", permanent: false },
      {
        source: "/service-page/quarterback-training-with-ryan-walker",
        destination: "/qb-training",
        permanent: false,
      },
      { source: "/pricing-plans/plans-pricing", destination: "/book-session", permanent: false },
    ];
  },
};

export default nextConfig;
