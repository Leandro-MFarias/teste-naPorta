import { Controller, Get, type INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { testJwtService } from '../../../test/auth.js';
import { configureApp } from '../../app.setup.js';
import { Role } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Auth } from '../decorators/auth.decorator.js';
import { CurrentUser } from '../decorators/current-user.decorator.js';
import { Public } from '../decorators/public.decorator.js';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface.js';
import { INVALID_TOKEN_MESSAGE, JwtAuthGuard } from './jwt-auth.guard.js';
import { FORBIDDEN_MESSAGE, RolesGuard } from './roles.guard.js';

const ADMIN_ID = '00000000-0000-4000-8000-000000000001';
const USER_ID = '00000000-0000-4000-8000-000000000002';

@Controller('test')
class TestController {
  @Public()
  @Get('public')
  public(): { ok: true } {
    return { ok: true };
  }

  @Auth()
  @Get('any')
  any(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  @Auth(Role.ADMIN)
  @Get('admin')
  admin(): { ok: true } {
    return { ok: true };
  }

  // Sem decorator: protegida por padrão.
  @Get('default')
  default(): { ok: true } {
    return { ok: true };
  }
}

type UserRow = { id: string; role: Role; isActive: boolean };

describe('JwtAuthGuard e RolesGuard', () => {
  const users = new Map<string, UserRow>();
  const findUnique = vi.fn(({ where }: { where: { id: string } }) =>
    Promise.resolve(users.get(where.id) ?? null),
  );
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TestController],
      providers: [
        { provide: JwtService, useValue: testJwtService },
        { provide: PrismaService, useValue: { user: { findUnique } } },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    users.clear();
    users.set(ADMIN_ID, { id: ADMIN_ID, role: 'ADMIN', isActive: true });
    users.set(USER_ID, { id: USER_ID, role: 'USER', isActive: true });
  });

  function token(sub: string, role: Role, expiresIn = 3600): Promise<string> {
    return testJwtService.signAsync({ sub, role }, { expiresIn });
  }

  async function get(path: string, authorization?: string) {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: authorization ? { authorization } : {},
    });
    return { status: res.status, body: (await res.json()) as unknown };
  }

  const unauthorized = {
    status: 401,
    body: {
      statusCode: 401,
      message: INVALID_TOKEN_MESSAGE,
      error: 'UNAUTHORIZED',
    },
  };

  it('permite rota @Public() sem token', async () => {
    await expect(get('/test/public')).resolves.toEqual({
      status: 200,
      body: { ok: true },
    });
  });

  it('exige token em rotas sem decorator', async () => {
    await expect(get('/test/default')).resolves.toEqual(unauthorized);
  });

  it.each([
    ['ausente', undefined],
    ['sem esquema Bearer', 'Token abc'],
    ['malformado', 'Bearer abc.def.ghi'],
  ])('retorna 401 com token %s', async (_, authorization) => {
    await expect(get('/test/any', authorization)).resolves.toEqual(
      unauthorized,
    );
  });

  it('retorna 401 com token expirado', async () => {
    const expired = await token(USER_ID, 'USER', -10);

    await expect(get('/test/any', `Bearer ${expired}`)).resolves.toEqual(
      unauthorized,
    );
  });

  it('retorna 401 com token assinado por outro segredo', async () => {
    const forged = await new JwtService({
      secret: 'outro-segredo-com-pelo-menos-32-caracteres',
    }).signAsync({ sub: ADMIN_ID, role: 'ADMIN' });

    await expect(get('/test/any', `Bearer ${forged}`)).resolves.toEqual(
      unauthorized,
    );
  });

  it('retorna 401 se o usuário foi desativado ou removido após o login', async () => {
    const userToken = await token(USER_ID, 'USER');
    users.set(USER_ID, { id: USER_ID, role: 'USER', isActive: false });

    await expect(get('/test/any', `Bearer ${userToken}`)).resolves.toEqual(
      unauthorized,
    );

    users.delete(USER_ID);
    await expect(get('/test/any', `Bearer ${userToken}`)).resolves.toEqual(
      unauthorized,
    );
  });

  it('injeta o usuário autenticado com @CurrentUser()', async () => {
    const userToken = await token(USER_ID, 'USER');

    await expect(get('/test/any', `Bearer ${userToken}`)).resolves.toEqual({
      status: 200,
      body: { id: USER_ID, role: 'USER' },
    });
  });

  it('permite ADMIN em rota exclusiva de ADMIN', async () => {
    const adminToken = await token(ADMIN_ID, 'ADMIN');

    await expect(get('/test/admin', `Bearer ${adminToken}`)).resolves.toEqual({
      status: 200,
      body: { ok: true },
    });
  });

  it('retorna 403 para USER em rota exclusiva de ADMIN', async () => {
    const userToken = await token(USER_ID, 'USER');

    await expect(get('/test/admin', `Bearer ${userToken}`)).resolves.toEqual({
      status: 403,
      body: {
        statusCode: 403,
        message: FORBIDDEN_MESSAGE,
        error: 'FORBIDDEN',
      },
    });
  });

  it('usa o papel atual do banco, não o do token', async () => {
    // Token emitido como ADMIN, mas o usuário foi rebaixado para USER.
    const staleToken = await token(USER_ID, 'ADMIN');

    const res = await get('/test/admin', `Bearer ${staleToken}`);

    expect(res.status).toBe(403);
  });
});
