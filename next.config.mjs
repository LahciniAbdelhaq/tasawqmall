import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // lets a dev server run next to a production build without overwriting it
  distDir: process.env.NEXT_DIST_DIR || '.next',
  poweredByHeader: false,
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
  // data/*.json and data/html/** are read at runtime by the server
  outputFileTracingIncludes: { '/**': ['./data/**/*'] },
  async redirects() {
    // old static-clone file names and WordPress-style URLs keep working
    return [
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/shop', destination: '/boutique', permanent: true },
      { source: '/brand/:slug', destination: '/marques/:slug', permanent: true },
    ];
  },
};
export default nextConfig;
