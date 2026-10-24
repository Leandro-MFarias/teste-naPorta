import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import argon2 from 'argon2';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import type { Role } from '../../src/generated/prisma/enums.js';
import { ARGON2_OPTIONS } from '../../src/modules/auth/password.service.js';
import {
  EmailSender,
  type EmailMessage,
} from '../../src/modules/mail/email-sender.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';

/**
 * Substitui o SMTP nos testes: guarda as mensagens em memória. Com
 * `failWith` definido, todo envio rejeita com esse erro.
 */
export class FakeEmailSender extends EmailSender {
  readonly sent: EmailMessage[] = [];
  failWith?: Error;

  send(message: EmailMessage): Promise<void> {
    if (this.failWith) {
      return Promise.reject(this.failWith);
    }
    this.sent.push(message);
    return Promise.resolve();
  }

  reset(): void {
    this.sent.length = 0;
    this.failWith = undefined;
  }
}

export interface TestApp {
  app: INestApplication;
  prisma: PrismaService;
  baseUrl: string;
  mail: FakeEmailSender;
}

/** Sobe a aplicação completa (AppModule) contra o banco de teste. */
export async function createTestApp(): Promise<TestApp> {
  const mail = new FakeEmailSender();
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(EmailSender)
    .useValue(mail)
    .compile();

  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app);
  await app.listen(0);

  return {
    app,
    prisma: app.get(PrismaService),
    baseUrl: await app.getUrl(),
    mail,
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
