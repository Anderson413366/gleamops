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
      { source: '/customers', destination: '/crm', permanent: false },
      { source: '/customers/:path*', destination: '/crm/:path*', permanent: false },
      { source: '/people', destination: '/workforce', permanent: false },
      { source: '/people/:path*', destination: '/workforce/:path*', permanent: false },
      { source: '/team', destination: '/workforce', permanent: false },
      { source: '/team/:path*', destination: '/workforce/:path*', permanent: false },
      { source: '/subcontractors', destination: '/vendors', permanent: false },
      { source: '/subcontractors/:path*', destination: '/vendors/:path*', permanent: false },
      { source: '/schedule', destination: '/operations', permanent: false },
      { source: '/schedule/:path*', destination: '/operations/:path*', permanent: false },
      { source: '/admin/services', destination: '/services', permanent: false },
      { source: '/admin/services/:path*', destination: '/services/:path*', permanent: false },
    ];
  },
};

export default nextConfig;
