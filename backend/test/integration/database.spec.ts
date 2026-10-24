import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveTestDatabaseUrl } from './database.js';

describe('resolveTestDatabaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('acrescenta _test ao banco da DATABASE_URL', () => {
    vi.stubEnv('TEST_DATABASE_URL', '');
    vi.stubEnv(
      'DATABASE_URL',
      'postgresql://u:p@localhost:5432/local_db?schema=public',
    );

    expect(resolveTestDatabaseUrl()).toBe(
      'postgresql://u:p@localhost:5432/local_db_test?schema=public',
    );
  });

  it('mantém um banco que já termina em _test', () => {
    vi.stubEnv('TEST_DATABASE_URL', '');
    vi.stubEnv('DATABASE_URL', 'postgresql://u:p@db:5432/app_test');

    expect(resolveTestDatabaseUrl()).toBe('postgresql://u:p@db:5432/app_test');
  });

  it('recusa TEST_DATABASE_URL que não termina em _test', () => {
    vi.stubEnv('TEST_DATABASE_URL', 'postgresql://u:p@localhost:5432/local_db');

    expect(() => resolveTestDatabaseUrl()).toThrow(/deve terminar em _test/);
  });
});
