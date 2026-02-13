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
      { source: '/customers', destination: '/crm', permanent: true },
      { source: '/customers/:path*', destination: '/crm/:path*', permanent: true },
      { source: '/people', destination: '/workforce', permanent: true },
      { source: '/people/:path*', destination: '/workforce/:path*', permanent: true },
      { source: '/team', destination: '/workforce', permanent: true },
      { source: '/team/:path*', destination: '/workforce/:path*', permanent: true },
      { source: '/assets', destination: '/inventory', permanent: true },
      { source: '/assets/:path*', destination: '/inventory/:path*', permanent: true },
      { source: '/subcontractors', destination: '/inventory', permanent: true },
      { source: '/schedule', destination: '/operations', permanent: true },
      { source: '/schedule/:path*', destination: '/operations/:path*', permanent: true },
      { source: '/services', destination: '/admin', permanent: true },
      { source: '/services/:path*', destination: '/admin/:path*', permanent: true },
      { source: '/reports', destination: '/home', permanent: true },
      { source: '/settings', destination: '/admin', permanent: true },
    ];
  },
};

export default nextConfig;
