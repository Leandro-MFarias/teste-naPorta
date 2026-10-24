import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// O Prisma CLI não carrega arquivos .env sozinho. Usa a mesma ordem da
// aplicação: .env.<NODE_ENV> (padrão development) e depois .env.
// Variáveis já definidas no ambiente têm prioridade.
config({
  path: [`.env.${process.env.NODE_ENV ?? 'development'}`, '.env'],
  quiet: true,
});

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // `npm run prisma:seed` (prisma db seed). Dados fictícios e idempotentes.
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
