import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
