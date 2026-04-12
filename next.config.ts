import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.mamasburger.com.tr',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'mamasburger.com.tr',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;
