import { execFileSync } from 'node:child_process';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { databaseName, resolveTestDatabaseUrl } from './database.js';

/**
 * Executado uma vez antes da suíte de integração: cria o banco de teste se
 * ainda não existir e aplica as migrations versionadas (migrate deploy).
 */
export default async function setup(): Promise<void> {
  const url = resolveTestDatabaseUrl();
  const name = databaseName(url);

  // CREATE DATABASE precisa de uma conexão com outro banco do servidor.
  const adminUrl = new URL(url);
  adminUrl.pathname = '/postgres';
  adminUrl.search = '';
  const admin = new PrismaClient({
    adapter: new PrismaPg({ connectionString: adminUrl.toString() }),
  });
  try {
    const rows = await admin.$queryRaw<unknown[]>`
      SELECT 1 FROM pg_database WHERE datname = ${name}`;
    if (rows.length === 0) {
      // Identificador não aceita parâmetro; o nome vem de resolveTestDatabaseUrl.
      await admin.$executeRawUnsafe(
        `CREATE DATABASE "${name.replace(/"/g, '""')}"`,
      );
    }
  } finally {
    await admin.$disconnect();
  }

  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });
}
