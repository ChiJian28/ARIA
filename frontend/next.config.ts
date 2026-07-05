import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // Pin Turbopack root to frontend/ (avoids wrong root when parent dirs have lockfiles)
  turbopack: {
    root: path.resolve(__dirname),
  },
  async redirects() {
    return [
      {
        source: '/overview',
        destination: '/submit',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [{ protocol: 'http', hostname: 'localhost' }],
  },
};

export default nextConfig;
