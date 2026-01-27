import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@worldline-kinematics/core',
    '@worldline-kinematics/scene',
    '@worldline-kinematics/ui',
  ],
  experimental: {
    optimizePackageImports: ['framer-motion', 'three'],
  },
};

export default nextConfig;
