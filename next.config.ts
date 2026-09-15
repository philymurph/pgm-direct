import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.pgmdirect.ie" }],
        destination: "https://pgmdirect.ie/:path*",
        permanent: true,
      },
    ];
  },
  images: {
    // Only our own trusted local placeholder assets are SVG; product images
    // uploaded via the admin area are expected to be raster (PNG/JPG/WebP).
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      // Product images uploaded via the admin drag-and-drop uploader.
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      // Imported supplier images for catalog entries.
      { protocol: "https", hostname: "farm.avmap.it" },
    ],
  },
};

export default nextConfig;
