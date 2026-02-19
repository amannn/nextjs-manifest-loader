import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      // '*.css': {
      //   loaders: [{loader: '@tailwindcss/webpack'}]
      // },
      '*.{ts,tsx}': {
        loaders: [{loader: './manifest/loader.ts'}],
        as: '*.tsx'
      }
    }
  }
};

export default nextConfig;
