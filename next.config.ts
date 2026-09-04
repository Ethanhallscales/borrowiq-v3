import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      /* The calculator used to live at /start and now serves the site root.
         Live ad creative still points at /start, so keep it working. Next
         carries the query string across automatically, which is what keeps
         the UTMs on the landing view intact.

         Temporary (307) on purpose: a permanent redirect gets cached hard by
         browsers and would be painful to undo if /start is ever needed. */
      /* Specific rule first: a tab left open on the old build still POSTs
         its lead to /start/api/submit. A 307 preserves the method and body,
         so that in-flight lead still reaches GHL instead of being posted at
         an HTML page. Must stay above the catch-all below. */
      { source: "/start/api/submit", destination: "/api/submit", permanent: false },

      { source: "/start", destination: "/", permanent: false },
      { source: "/start/:path*", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
