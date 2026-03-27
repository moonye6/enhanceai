/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: true,
  },
  // Cloudflare Pages 支持
  experimental: {
    runtime: 'edge',
  },
};

export default nextConfig;
