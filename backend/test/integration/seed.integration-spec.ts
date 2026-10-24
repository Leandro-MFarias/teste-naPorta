import { execFileSync } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SEED_ORDER_COUNT, SEED_USERS } from '../../prisma/seed/data.js';
import {
  apiClient,
  createTestApp,
  login,
  resetDatabase,
  type TestApp,
} from './app.js';

function runSeed(): string {
  return execFileSync('npx', ['tsx', 'prisma/seed.ts'], {
    env: { ...process.env },
    encoding: 'utf8',
  });
}

describe('Seed (integração)', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx.prisma);
  });

  afterAll(async () => {
    await resetDatabase(ctx.prisma);
    await ctx.app.close();
  });

  async function snapshot() {
    const [users, customers, orders, items, counts, hashes] = await Promise.all(
      [
        ctx.prisma.user.count(),
        ctx.prisma.customer.count(),
        ctx.prisma.order.count(),
        ctx.prisma.orderItem.count(),
        ctx.prisma.customer.aggregate({ _sum: { ordersCount: true } }),
        ctx.prisma.user.findMany({
          select: { email: true, passwordHash: true },
          orderBy: { email: 'asc' },
        }),
      ],
    );
    return {
      users,
      customers,
      orders,
      items,
      ordersCount: counts._sum.ordersCount,
      hashes,
    };
  }

  it('é idempotente e gera dados utilizáveis pela API', async () => {
    const firstOutput = runSeed();
    const first = await snapshot();

    expect(first).toMatchObject({
      users: 2,
      orders: SEED_ORDER_COUNT,
      ordersCount: SEED_ORDER_COUNT,
    });
    expect(firstOutput).not.toMatch(/\$argon2|Admin12345|User12345/);

    runSeed();
    expect(await snapshot()).toEqual(first);

    for (const user of SEED_USERS) {
      await expect(
        login(ctx.baseUrl, user.email, user.password),
      ).resolves.toEqual(expect.any(String));
    }
    const token = await login(
      ctx.baseUrl,
      SEED_USERS[1].email,
      SEED_USERS[1].password,
    );
    const list = await apiClient(ctx.baseUrl, token)('GET', '/orders?limit=5');
    expect(list.body.meta).toEqual({
      total: SEED_ORDER_COUNT,
      page: 1,
      limit: 5,
      totalPages: Math.ceil(SEED_ORDER_COUNT / 5),
    });
  });

  it('recusa rodar em produção', () => {
    expect(() =>
      execFileSync('npx', ['tsx', 'prisma/seed.ts'], {
        env: { ...process.env, NODE_ENV: 'production' },
        encoding: 'utf8',
        stdio: 'pipe',
      }),
    ).toThrow(/não pode rodar em produção/);
  });
});
