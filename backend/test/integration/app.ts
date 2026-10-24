import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import argon2 from 'argon2';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import type { Role } from '../../src/generated/prisma/enums.js';
import { ARGON2_OPTIONS } from '../../src/modules/auth/password.service.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';

export interface TestApp {
  app: INestApplication;
  prisma: PrismaService;
  baseUrl: string;
}

/** Sobe a aplicação completa (AppModule) contra o banco de teste. */
export async function createTestApp(): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app);
  await app.listen(0);

  return {
    app,
    prisma: app.get(PrismaService),
    baseUrl: await app.getUrl(),
  };
}

/** Apaga todos os dados do banco de teste. */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$executeRaw`
    TRUNCATE TABLE order_items, orders, customers, users CASCADE`;
}

export const TEST_PASSWORD = 'Senha12345';

export async function createUser(
  prisma: PrismaService,
  data: { email: string; role: Role; isActive?: boolean },
) {
  return prisma.user.create({
    data: {
      name: `Teste ${data.role}`,
      email: data.email,
      role: data.role,
      isActive: data.isActive ?? true,
      passwordHash: await argon2.hash(TEST_PASSWORD, ARGON2_OPTIONS),
    },
  });
}

export interface ApiResult<T = unknown> {
  status: number;
  body: T;
}

/** Cliente HTTP mínimo; `body` é o JSON da resposta (ou null sem corpo). */
export function apiClient(baseUrl: string, token?: string) {
  return async <T = any>(
    method: string,
    path: string,
    payload?: unknown,
  ): Promise<ApiResult<T>> => {
    const headers: Record<string, string> = {};
    if (payload !== undefined) {
      headers['content-type'] = 'application/json';
    }
    if (token) {
      headers.authorization = `Bearer ${token}`;
    }
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
    const text = await res.text();
    return { status: res.status, body: (text ? JSON.parse(text) : null) as T };
  };
}

export async function login(
  baseUrl: string,
  email: string,
  password = TEST_PASSWORD,
): Promise<string> {
  const res = await apiClient(baseUrl)<{ data: { accessToken: string } }>(
    'POST',
    '/auth/login',
    { email, password },
  );
  if (res.status !== 200) {
    throw new Error(`Login falhou com status ${res.status}`);
  }
  return res.body.data.accessToken;
}
