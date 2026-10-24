import { config } from 'dotenv';

/**
 * URL do banco de teste, isolado do banco de desenvolvimento.
 *
 * Prioridade: TEST_DATABASE_URL; senão, DATABASE_URL (ambiente,
 * .env.test, .env.development ou .env) com o nome do banco acrescido de
 * `_test` — ex.: local_db -> local_db_test, no mesmo servidor.
 *
 * Por segurança, recusa qualquer banco cujo nome não termine em `_test`:
 * os testes de integração apagam todas as tabelas.
 */
export function resolveTestDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) {
    return assertTestDatabase(process.env.TEST_DATABASE_URL);
  }

  const env: Record<string, string> = {};
  config({
    path: ['.env.test', '.env.development', '.env'],
    processEnv: env,
    quiet: true,
  });
  const base = process.env.DATABASE_URL ?? env.DATABASE_URL;
  if (!base) {
    throw new Error(
      'Defina TEST_DATABASE_URL ou DATABASE_URL para os testes de integração.',
    );
  }

  const url = new URL(base);
  const name = decodeURIComponent(url.pathname.slice(1));
  if (!name.endsWith('_test')) {
    url.pathname = `/${encodeURIComponent(`${name}_test`)}`;
  }
  return assertTestDatabase(url.toString());
}

export function databaseName(url: string): string {
  return decodeURIComponent(new URL(url).pathname.slice(1));
}

function assertTestDatabase(url: string): string {
  const name = databaseName(url);
  if (!name.endsWith('_test')) {
    throw new Error(
      `Banco "${name}" recusado: o banco de integração deve terminar em _test.`,
    );
  }
  return url;
}
