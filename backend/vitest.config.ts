import { defineConfig } from 'vitest/config';

// Testes unitários: arquivos *.spec.ts dentro de src/ e prisma/ (dados do seed).
// Testes de integração ficam em vitest.config.integration.ts.
export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts', 'prisma/**/*.spec.ts'],
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
