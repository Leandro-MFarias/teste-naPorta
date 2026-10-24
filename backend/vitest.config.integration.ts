import { defineConfig } from 'vitest/config';

// Testes de integração: arquivos *.integration-spec.ts em src/ ou test/.
// Executados em série porque compartilham o banco de teste.
export default defineConfig({
  test: {
    include: ['{src,test}/**/*.integration-spec.ts'],
    environment: 'node',
    // Cria o banco de teste (<banco>_test) e aplica as migrations.
    globalSetup: ['test/integration/global-setup.ts'],
    setupFiles: ['test/setup.ts', 'test/integration/setup.ts'],
    passWithNoTests: true,
    fileParallelism: false,
    // Argon2 e o banco real deixam alguns testes mais lentos.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
