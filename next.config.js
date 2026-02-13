const path = require('path');

const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['mongodb', 'posthog-node'],
  experimental: {
    turbopack: {
      root: path.resolve(__dirname),
      resolveAlias: {
        'tailwindcss': path.resolve(__dirname, 'node_modules/tailwindcss'),
        '@tailwindcss/postcss': path.resolve(__dirname, 'node_modules/@tailwindcss/postcss')
      }
    },
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  webpack(config, { dev }) {
    if (dev) {
      // Reduce CPU/memory from file watching
      config.watchOptions = {
        poll: 2000, // check every 2 seconds
        aggregateTimeout: 300, // wait before rebuilding
        ignored: ['**/node_modules'],
      };
    }
    return config;
  },
  onDemandEntries: {
    maxInactiveAge: 10000,
    pagesBufferLength: 2,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Content-Security-Policy', value: 'frame-ancestors *;' },
          { key: 'Access-Control-Allow-Origin', value: process.env.CORS_ORIGINS || '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: '*' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/ph/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/api/ph/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
      {
        source: '/api/ph/decide',
        destination: 'https://us.i.posthog.com/decide',
      },
    ];
  },
};

const isProd = process.env.NODE_ENV === 'production';

module.exports = nextConfig;
