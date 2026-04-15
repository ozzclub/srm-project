import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Local development
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '6000',
        pathname: '/uploads/**',
      },
      // Cloudflare tunnel domains
      {
        protocol: 'https',
        hostname: 'backend.jastipravita.co',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'backend.jastipravita.co',
        pathname: '/uploads/**',
      },
    ],
    unoptimized: process.env.NODE_ENV === 'development',
  },
};

export default nextConfig;
