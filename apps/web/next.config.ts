import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@gleamops/shared',
    '@gleamops/domain',
    '@gleamops/cleanflow',
    '@gleamops/ui',
  ],
  async redirects() {
    return [
      // Deprecated routes → consolidated modules
      { source: '/customers', destination: '/clients', permanent: false },
      { source: '/customers/:path*', destination: '/clients/:path*', permanent: false },
      { source: '/people', destination: '/team', permanent: false },
      { source: '/people/:path*', destination: '/team/:path*', permanent: false },
      { source: '/workforce', destination: '/team', permanent: false },
      { source: '/workforce/:path*', destination: '/team/:path*', permanent: false },
      { source: '/subcontractors', destination: '/vendors', permanent: false },
      { source: '/subcontractors/:path*', destination: '/vendors/:path*', permanent: false },
      { source: '/admin/services', destination: '/services', permanent: false },
      { source: '/admin/services/:path*', destination: '/services/:path*', permanent: false },
    ];
  },
};

export default nextConfig;
