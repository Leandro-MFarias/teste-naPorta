import { ConflictException, type INestApplication } from '@nestjs/common';
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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import type { Role } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { UserRequest } from './interfaces/user-request.interface.js';
import type { UserResponse } from './interfaces/user-response.interface.js';
import { UsersController } from './users.controller.js';
import { EMAIL_IN_USE_MESSAGE, UsersService } from './users.service.js';

const ADMIN_ID = '00000000-0000-4000-8000-000000000001';
const USER_ID = '00000000-0000-4000-8000-000000000002';

describe('POST /users', () => {
  const create = vi.fn<(request: UserRequest) => Promise<UserResponse>>();
  const findUnique = vi.fn(({ where }: { where: { id: string } }) =>
    Promise.resolve(
      where.id === ADMIN_ID
        ? { id: ADMIN_ID, role: 'ADMIN', isActive: true }
        : { id: USER_ID, role: 'USER', isActive: true },
    ),
  );
  let app: INestApplication;
  let baseUrl: string;

  const body = {
    name: 'Maria Souza',
    email: ' Maria.Souza@Example.com ',
    role: 'USER',
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: { create } },
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
    create.mockReset();
  });

  async function post(payload: unknown, as?: { id: string; role: Role }) {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    if (as) {
      const token = await testJwtService.signAsync({
        sub: as.id,
        role: as.role,
      });
      headers.authorization = `Bearer ${token}`;
    }
    const res = await fetch(`${baseUrl}/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    return { status: res.status, body: (await res.json()) as unknown };
  }

  const admin = { id: ADMIN_ID, role: 'ADMIN' as const };

  it('retorna 401 sem token', async () => {
    const res = await post(body);

    expect(res.status).toBe(401);
    expect(create).not.toHaveBeenCalled();
  });

  it('retorna 403 para USER', async () => {
    const res = await post(body, { id: USER_ID, role: 'USER' });

    expect(res.status).toBe(403);
    expect(create).not.toHaveBeenCalled();
  });

  it('cria o usuário como ADMIN e retorna 201 com { data }', async () => {
    create.mockImplementation((request) =>
      Promise.resolve({
        id: '6f1c1c1e-8a52-4a63-9a39-1d2f0f5d8a10',
        name: request.name,
        email: request.email,
        role: request.role,
        isActive: true,
        mustChangePassword: true,
        createdAt: new Date('2026-10-24T12:00:00.000Z'),
        updatedAt: new Date('2026-10-24T12:00:00.000Z'),
      }),
    );

    const res = await post(body, admin);

    expect(create).toHaveBeenCalledWith({
      name: 'Maria Souza',
      email: 'maria.souza@example.com',
      role: 'USER',
    });
    expect(res).toEqual({
      status: 201,
      body: {
        data: {
          id: '6f1c1c1e-8a52-4a63-9a39-1d2f0f5d8a10',
          name: 'Maria Souza',
          email: 'maria.souza@example.com',
          role: 'USER',
          isActive: true,
          mustChangePassword: true,
          createdAt: '2026-10-24T12:00:00.000Z',
          updatedAt: '2026-10-24T12:00:00.000Z',
        },
      },
    });
  });

  it('retorna 400 para dados inválidos e campos não permitidos (inclusive senha)', async () => {
    const res = await post(
      {
        ...body,
        email: 'invalido',
        password: 'SenhaForte123',
        isActive: false,
        passwordHash: 'x',
      },
      admin,
    );

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      error: 'BAD_REQUEST',
      message: expect.arrayContaining([
        'property isActive should not exist',
        'property passwordHash should not exist',
        'property password should not exist',
        'email deve ser um email válido',
      ]) as unknown,
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('retorna 409 quando o email já existe', async () => {
    create.mockRejectedValue(new ConflictException(EMAIL_IN_USE_MESSAGE));

    await expect(post(body, admin)).resolves.toEqual({
      status: 409,
      body: {
        statusCode: 409,
        message: EMAIL_IN_USE_MESSAGE,
        error: 'CONFLICT',
      },
    });
  });
});
