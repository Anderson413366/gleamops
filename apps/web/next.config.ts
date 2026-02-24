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
      { source: '/subcontractors', destination: '/clients?tab=partners', permanent: false },
      { source: '/subcontractors/:path*', destination: '/clients/partners/:path*', permanent: false },
      { source: '/admin/services', destination: '/settings?tab=services', permanent: false },
      { source: '/admin/services/:path*', destination: '/services/:path*', permanent: false },
      { source: '/services', destination: '/settings?tab=services', permanent: false },
      { source: '/financial', destination: '/reports?tab=financial', permanent: false },
      { source: '/financial/:path*', destination: '/reports?tab=financial', permanent: false },
      { source: '/money', destination: '/reports?tab=financial', permanent: false },
      { source: '/money/:path*', destination: '/reports?tab=financial', permanent: false },
      { source: '/financial-intelligence', destination: '/reports?tab=financial', permanent: false },
      { source: '/financial-intelligence/:path*', destination: '/reports?tab=financial', permanent: false },
    ];
  },
};

export default nextConfig;
