import { defineConfig } from 'vitest/config';

// Testes de integração: arquivos *.integration-spec.ts em src/ ou test/.
// Executados em série porque compartilham o banco de teste.
export default defineConfig({
  test: {
    include: ['{src,test}/**/*.integration-spec.ts'],
    environment: 'node',
    passWithNoTests: true,
    fileParallelism: false,
  },
});
