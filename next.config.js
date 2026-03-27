/**
 * Next.js Configuration for Cloudflare Pages
 * 
 * Two deployment options:
 * 1. Static Export (output: 'export') - No API routes, use external backend
 * 2. Edge Runtime (recommended) - Full Next.js support via @cloudflare/next-on-pages
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React Strict Mode for better development experience
  reactStrictMode: true,

  // Image optimization settings
  images: {
    // Allow all domains for enhanced image results (fal.ai returns URLs)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // Disable image optimization in development for faster builds
    unoptimized: process.env.NODE_ENV === 'development',
  },

  // Experimental features for Cloudflare
  experimental: {
    // Enable server actions for future use
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
