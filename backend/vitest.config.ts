import { defineConfig } from 'vitest/config';

// Testes unitários: arquivos *.spec.ts em src/, prisma/ (dados do seed) e test/.
// Testes de integração ficam em vitest.config.integration.ts.
export default defineConfig({
  test: {
    include: ['{src,prisma,test}/**/*.spec.ts'],
    exclude: ['**/*.integration-spec.ts', 'node_modules/**', 'dist/**'],
    environment: 'node',
    setupFiles: ['test/setup.ts'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/main.ts', 'src/**/*.module.ts', 'src/**/*.spec.ts'],
      reportsDirectory: 'coverage',
    },
  },
});
