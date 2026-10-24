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
import type { CreateOrderRequest } from './interfaces/order-request.interface.js';
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
