import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@gleamops/shared',
    '@gleamops/domain',
    '@gleamops/cleanflow',
    '@gleamops/ui',
  ],
};

export default nextConfig;
