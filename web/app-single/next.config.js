/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) return [];
    return [
      { source: '/api/:path*', destination: `${apiUrl}/api/:path*` },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'masterly-air-academy.dz' },
      { protocol: 'https', hostname: '*.masterly-air-academy.dz' },
    ],
    unoptimized: true,
  },
};

module.exports = nextConfig;
