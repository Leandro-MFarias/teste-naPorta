import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Build enxuto para a imagem Docker (server.js + dependências mínimas).
  output: 'standalone',
  // O repositório tem outro package-lock.json na raiz; fixa o frontend como
  // raiz para o tracing do standalone e para o Turbopack.
  outputFileTracingRoot: __dirname,
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    root: __dirname,
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
