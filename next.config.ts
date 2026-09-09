import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Only our own trusted local placeholder assets are SVG; product images
    // uploaded via the admin area are expected to be raster (PNG/JPG/WebP).
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      // Product images uploaded via the admin drag-and-drop uploader.
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
