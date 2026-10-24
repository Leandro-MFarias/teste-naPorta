import { type INestApplication } from '@nestjs/common';
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
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  CreateOrderRequest,
  ListOrdersQuery,
  UpdateOrderRequest,
} from './interfaces/order-request.interface.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

const USER_ID = '00000000-0000-4000-8000-000000000002';

describe('POST /orders', () => {
  const create =
    vi.fn<
      (request: CreateOrderRequest, user: AuthenticatedUser) => Promise<unknown>
    >();
  const findUnique = vi.fn(() =>
    Promise.resolve({ id: USER_ID, role: 'USER', isActive: true }),
  );
  let app: INestApplication;
  let baseUrl: string;

  const body = {
    orderNumber: 'PED-1001',
    expectedDeliveryDate: '2026-11-15',
    deliveryAddress: 'Rua das Flores, 123',
    customer: { name: 'João da Silva', document: '529.982.247-25' },
    items: [{ description: 'Caixa de som', price: 199.9 }],
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        { provide: OrdersService, useValue: { create } },
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
    create.mockReset().mockResolvedValue({ data: { id: 'pedido' } });
  });

  async function post(payload: unknown, authenticated = true) {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    if (authenticated) {
      const token = await testJwtService.signAsync({
        sub: USER_ID,
        role: 'USER',
      });
      headers.authorization = `Bearer ${token}`;
    }
    const res = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    return { status: res.status, body: (await res.json()) as unknown };
  }

  it('retorna 401 sem token', async () => {
    const res = await post(body, false);

    expect(res.status).toBe(401);
    expect(create).not.toHaveBeenCalled();
  });

  it('permite USER criar e repassa o usuário autenticado', async () => {
    const res = await post(body);

    expect(res).toEqual({ status: 201, body: { data: { id: 'pedido' } } });
    expect(create).toHaveBeenCalledWith(body, { id: USER_ID, role: 'USER' });
  });

  it('retorna 400 sem chamar o serviço para CPF inválido, itens vazios ou createdById no body', async () => {
    const res = await post({
      ...body,
      customer: { name: 'João', document: '529.982.247-24' },
      items: [],
      createdById: USER_ID,
    });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      message: expect.arrayContaining([
        'property createdById should not exist',
        'customer.document deve ser um CPF ou CNPJ válido',
        'items deve ter pelo menos um item',
      ]) as unknown,
    });
    expect(create).not.toHaveBeenCalled();
  });
});

describe('GET /orders', () => {
  const findAll = vi.fn<(query: ListOrdersQuery) => Promise<unknown>>();
  const findUnique = vi.fn(() =>
    Promise.resolve({ id: USER_ID, role: 'USER', isActive: true }),
  );
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        { provide: OrdersService, useValue: { findAll } },
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
    findAll.mockReset().mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
    });
  });

  async function get(query: string, authenticated = true) {
    const headers: Record<string, string> = {};
    if (authenticated) {
      const token = await testJwtService.signAsync({
        sub: USER_ID,
        role: 'USER',
      });
      headers.authorization = `Bearer ${token}`;
    }
    const res = await fetch(`${baseUrl}/orders${query}`, { headers });
    return { status: res.status, body: (await res.json()) as unknown };
  }

  it('retorna 401 sem token', async () => {
    const res = await get('', false);

    expect(res.status).toBe(401);
    expect(findAll).not.toHaveBeenCalled();
  });

  it('aplica padrões de paginação e retorna lista vazia com meta', async () => {
    const res = await get('');

    expect(res).toEqual({
      status: 200,
      body: {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      },
    });
    expect(findAll).toHaveBeenCalledWith({ page: 1, limit: 10 });
  });

  it('converte e repassa os filtros', async () => {
    await get(
      '?page=2&limit=5&status=DELIVERED&orderNumber=%20PED%20&startDate=2026-10-01&endDate=2026-10-31',
    );

    expect(findAll).toHaveBeenCalledWith({
      page: 2,
      limit: 5,
      status: 'DELIVERED',
      orderNumber: 'PED',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
    });
  });

  it('retorna 400 sem chamar o serviço para query inválida', async () => {
    const res = await get(
      '?page=0&limit=1000&startDate=2026-10-10&endDate=2026-10-09&status=LOST',
    );

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      message: expect.arrayContaining([
        'page deve ser maior ou igual a 1',
        'limit deve ser no máximo 100',
        'endDate não pode ser anterior a startDate',
        'status deve ser um status de pedido válido',
      ]) as unknown,
    });
    expect(findAll).not.toHaveBeenCalled();
  });
});

describe('GET /orders/:id e PATCH /orders/:id', () => {
  const ORDER_ID = '00000000-0000-4000-8000-0000000000a1';
  const findOne = vi.fn<(id: string) => Promise<unknown>>();
  const update =
    vi.fn<(id: string, request: UpdateOrderRequest) => Promise<unknown>>();
  const findUnique = vi.fn(() =>
    Promise.resolve({ id: USER_ID, role: 'USER', isActive: true }),
  );
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        { provide: OrdersService, useValue: { findOne, update } },
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
    findOne.mockReset().mockResolvedValue({ data: { id: ORDER_ID } });
    update.mockReset().mockResolvedValue({ data: { id: ORDER_ID } });
  });

  async function request(
    method: string,
    path: string,
    payload?: unknown,
    authenticated = true,
  ) {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    if (authenticated) {
      const token = await testJwtService.signAsync({
        sub: USER_ID,
        role: 'USER',
      });
      headers.authorization = `Bearer ${token}`;
    }
    const res = await fetch(`${baseUrl}/orders/${path}`, {
      method,
      headers,
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
    return { status: res.status, body: (await res.json()) as unknown };
  }

  it('GET retorna 401 sem token', async () => {
    const res = await request('GET', ORDER_ID, undefined, false);

    expect(res.status).toBe(401);
    expect(findOne).not.toHaveBeenCalled();
  });

  it('GET repassa o id ao serviço', async () => {
    const res = await request('GET', ORDER_ID);

    expect(res).toEqual({ status: 200, body: { data: { id: ORDER_ID } } });
    expect(findOne).toHaveBeenCalledWith(ORDER_ID);
  });

  it.each(['GET', 'PATCH'])('%s rejeita id que não é UUID', async (method) => {
    const res = await request(
      method,
      'abc',
      method === 'PATCH' ? {} : undefined,
    );

    expect(res).toEqual({
      status: 400,
      body: {
        statusCode: 400,
        message: 'id deve ser um UUID válido',
        error: 'BAD_REQUEST',
      },
    });
    expect(findOne).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('PATCH permite USER e repassa só os campos enviados', async () => {
    const res = await request('PATCH', ORDER_ID, {
      status: 'CONFIRMED',
      deliveryAddress: ' Rua B ',
    });

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(ORDER_ID, {
      status: 'CONFIRMED',
      deliveryAddress: 'Rua B',
    });
  });

  it('PATCH rejeita items vazio, null e campos desconhecidos sem chamar o serviço', async () => {
    const res = await request('PATCH', ORDER_ID, {
      items: [],
      orderNumber: null,
      status: 'LOST',
      createdById: USER_ID,
    });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      message: expect.arrayContaining([
        'items deve ter pelo menos um item',
        'orderNumber é obrigatório',
        'status deve ser um status de pedido válido',
        'property createdById should not exist',
      ]) as unknown,
    });
    expect(update).not.toHaveBeenCalled();
  });
});

describe('DELETE /orders/:id', () => {
  const ORDER_ID = '00000000-0000-4000-8000-0000000000a1';
  const ADMIN_ID = '00000000-0000-4000-8000-000000000001';
  const remove = vi.fn<(id: string) => Promise<void>>();
  const findUnique = vi.fn(({ where }: { where: { id: string } }) =>
    Promise.resolve({
      id: where.id,
      role: where.id === ADMIN_ID ? 'ADMIN' : 'USER',
      isActive: true,
    }),
  );
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        { provide: OrdersService, useValue: { remove } },
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
    remove.mockReset().mockResolvedValue(undefined);
  });

  async function del(id: string, userId?: string) {
    const headers: Record<string, string> = {};
    if (userId) {
      const token = await testJwtService.signAsync({
        sub: userId,
        role: userId === ADMIN_ID ? 'ADMIN' : 'USER',
      });
      headers.authorization = `Bearer ${token}`;
    }
    const res = await fetch(`${baseUrl}/orders/${id}`, {
      method: 'DELETE',
      headers,
    });
    return { status: res.status, text: await res.text() };
  }

  it('retorna 401 sem token', async () => {
    expect((await del(ORDER_ID)).status).toBe(401);
    expect(remove).not.toHaveBeenCalled();
  });

  it('retorna 403 para USER', async () => {
    expect((await del(ORDER_ID, USER_ID)).status).toBe(403);
    expect(remove).not.toHaveBeenCalled();
  });

  it('ADMIN exclui e recebe 204 sem corpo', async () => {
    expect(await del(ORDER_ID, ADMIN_ID)).toEqual({ status: 204, text: '' });
    expect(remove).toHaveBeenCalledWith(ORDER_ID);
  });

  it('rejeita id que não é UUID', async () => {
    expect((await del('abc', ADMIN_ID)).status).toBe(400);
    expect(remove).not.toHaveBeenCalled();
  });
});
