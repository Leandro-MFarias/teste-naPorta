import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Prisma,
  type Customer,
  type Order,
  type OrderItem,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { customerNameUpdatedWarning } from '../customers/customer.warnings.js';
import {
  CustomersService,
  type ResolvedCustomer,
} from '../customers/customers.service.js';
import type { CreateOrderRequest } from './interfaces/order-request.interface.js';
import {
  escapeLikePattern,
  ORDER_NOT_FOUND_MESSAGE,
  ORDER_NUMBER_IN_USE_MESSAGE,
  OrdersService,
} from './orders.service.js';

const USER = {
  id: 'u0000000-0000-4000-8000-000000000001',
  role: 'USER' as const,
};

const customer: Customer = {
  id: 'c0000000-0000-4000-8000-000000000001',
  name: 'João da Silva',
  document: '52998224725',
  type: 'PERSON',
  ordersCount: 0,
  createdAt: new Date('2026-10-01T12:00:00.000Z'),
  updatedAt: new Date('2026-10-01T12:00:00.000Z'),
};

const request: CreateOrderRequest = {
  orderNumber: 'PED-1001',
  expectedDeliveryDate: '2026-11-15',
  deliveryAddress: 'Rua das Flores, 123',
  customer: { name: 'João da Silva', document: '529.982.247-25' },
  items: [
    { description: 'Caixa de som', price: 199.9 },
    { description: 'Cabo', price: 0.1 },
  ],
};

type OrderCreateArgs = {
  data: Omit<
    Order,
    'id' | 'status' | 'createdAt' | 'updatedAt' | 'deletedAt'
  > & {
    items: { create: { description: string; price: Prisma.Decimal }[] };
  };
};

describe('OrdersService.create', () => {
  const resolve =
    vi.fn<(tx: unknown, input: unknown) => Promise<ResolvedCustomer>>();
  const orderCreate =
    vi.fn<(args: OrderCreateArgs) => Promise<Order & { items: OrderItem[] }>>();
  const customerUpdate = vi.fn<(args: unknown) => Promise<Customer>>();
  const tx = {
    order: { create: orderCreate },
    customer: { update: customerUpdate },
  };
  const $transaction = vi.fn((fn: (client: typeof tx) => Promise<unknown>) =>
    fn(tx),
  );
  let service: OrdersService;

  beforeEach(async () => {
    resolve.mockReset().mockResolvedValue({ customer });
    customerUpdate
      .mockReset()
      .mockResolvedValue({ ...customer, ordersCount: 1 });
    orderCreate.mockReset().mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'o0000000-0000-4000-8000-000000000001',
        orderNumber: data.orderNumber,
        expectedDeliveryDate: data.expectedDeliveryDate,
        deliveryAddress: data.deliveryAddress,
        status: 'PENDING',
        customerId: data.customerId,
        createdById: data.createdById,
        createdAt: new Date('2026-10-24T12:00:00.000Z'),
        updatedAt: new Date('2026-10-24T12:00:00.000Z'),
        deletedAt: null,
        items: data.items.create.map((item, i) => ({
          id: `i000000${i}-0000-4000-8000-000000000001`,
          orderId: 'o0000000-0000-4000-8000-000000000001',
          ...item,
        })),
      }),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: { $transaction } },
        { provide: CustomersService, useValue: { resolve } },
      ],
    }).compile();

    service = moduleRef.get(OrdersService);
  });

  it('cria pedido, itens e incrementa ordersCount na mesma transação', async () => {
    const result = await service.create(request, USER);

    expect($transaction).toHaveBeenCalledTimes(1);
    expect(resolve).toHaveBeenCalledWith(tx, request.customer);

    const { data } = orderCreate.mock.calls[0][0];
    expect(data).toMatchObject({
      orderNumber: 'PED-1001',
      expectedDeliveryDate: new Date('2026-11-15T00:00:00.000Z'),
      deliveryAddress: 'Rua das Flores, 123',
      customerId: customer.id,
      createdById: USER.id,
    });
    expect(data).not.toHaveProperty('status');
    expect(data.items.create.map((item) => item.price.toString())).toEqual([
      '199.9',
      '0.1',
    ]);

    expect(customerUpdate).toHaveBeenCalledWith({
      where: { id: customer.id },
      data: { ordersCount: { increment: 1 } },
    });

    expect(result).not.toHaveProperty('warnings');
    expect(result.data).toMatchObject({
      orderNumber: 'PED-1001',
      status: 'PENDING',
      expectedDeliveryDate: '2026-11-15',
      createdById: USER.id,
      customer: { id: customer.id, document: '52998224725', type: 'PERSON' },
      items: [
        { description: 'Caixa de som', price: '199.90' },
        { description: 'Cabo', price: '0.10' },
      ],
    });
  });

  it('inclui o aviso quando o nome do cliente foi atualizado', async () => {
    const warning = customerNameUpdatedWarning('PERSON');
    resolve.mockResolvedValue({ customer, warning });

    const result = await service.create(request, USER);

    expect(result.warnings).toEqual([warning]);
  });

  it('converte número de pedido duplicado em 409', async () => {
    orderCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(service.create(request, USER)).rejects.toThrow(
      new ConflictException(ORDER_NUMBER_IN_USE_MESSAGE),
    );
    expect(customerUpdate).not.toHaveBeenCalled();
  });

  it('propaga falhas da regra de cliente sem criar o pedido', async () => {
    const failure = new Error('falha no cliente');
    resolve.mockRejectedValue(failure);

    await expect(service.create(request, USER)).rejects.toBe(failure);
    expect(orderCreate).not.toHaveBeenCalled();
  });
});

describe('OrdersService.findAll', () => {
  const count = vi.fn<(args: unknown) => Promise<number>>();
  const findMany =
    vi.fn<
      (
        args: unknown,
      ) => Promise<(Order & { customer: Customer; items: OrderItem[] })[]>
    >();
  const $transaction = vi.fn((queries: Promise<unknown>[]) =>
    Promise.all(queries),
  );
  let service: OrdersService;

  const order = {
    id: 'o0000000-0000-4000-8000-000000000001',
    orderNumber: 'PED-1001',
    expectedDeliveryDate: new Date('2026-11-15T00:00:00.000Z'),
    deliveryAddress: 'Rua das Flores, 123',
    status: 'PENDING' as const,
    customerId: customer.id,
    createdById: USER.id,
    createdAt: new Date('2026-10-24T12:00:00.000Z'),
    updatedAt: new Date('2026-10-24T12:00:00.000Z'),
    deletedAt: null,
    customer,
    items: [
      {
        id: 'i0000000-0000-4000-8000-000000000001',
        orderId: 'o0000000-0000-4000-8000-000000000001',
        description: 'Cabo',
        price: new Prisma.Decimal('0.1'),
      },
    ],
  };

  beforeEach(async () => {
    count.mockReset().mockResolvedValue(21);
    findMany.mockReset().mockResolvedValue([order]);
    $transaction.mockClear();

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: { $transaction, order: { count, findMany } },
        },
        { provide: CustomersService, useValue: {} },
      ],
    }).compile();

    service = moduleRef.get(OrdersService);
  });

  it('sem filtros: só pedidos ativos, ordenação estável e meta', async () => {
    const result = await service.findAll({ page: 3, limit: 10 });

    const where = { deletedAt: null };
    expect(count).toHaveBeenCalledWith({ where });
    expect(findMany).toHaveBeenCalledWith({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: 20,
      take: 10,
      include: { customer: true, items: true },
    });
    expect($transaction).toHaveBeenCalledWith(expect.any(Array), {
      isolationLevel: 'RepeatableRead',
    });
    expect(result.meta).toEqual({
      total: 21,
      page: 3,
      limit: 10,
      totalPages: 3,
    });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      orderNumber: 'PED-1001',
      items: [{ description: 'Cabo', price: '0.10' }],
    });
    expect(result.data[0]).not.toHaveProperty('deletedAt');
  });

  it('combina os filtros de status, número parcial e período', async () => {
    await service.findAll({
      page: 1,
      limit: 10,
      status: 'SHIPPED',
      orderNumber: 'ped_10',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
    });

    expect(count).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        status: 'SHIPPED',
        orderNumber: { contains: 'ped\\_10', mode: 'insensitive' },
        createdAt: {
          gte: new Date('2026-10-01T00:00:00.000Z'),
          lt: new Date('2026-11-01T00:00:00.000Z'),
        },
      },
    });
  });

  it('sem resultados: data vazia e totalPages 0', async () => {
    count.mockResolvedValue(0);
    findMany.mockResolvedValue([]);

    const result = await service.findAll({ page: 1, limit: 10 });

    expect(result).toEqual({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
    });
  });
});

describe('escapeLikePattern', () => {
  it('escapa curingas do LIKE e a barra', () => {
    expect(escapeLikePattern('PED-100')).toBe('PED-100');
    expect(escapeLikePattern('10%_a\\b')).toBe('10\\%\\_a\\\\b');
  });
});

describe('OrdersService.findOne', () => {
  const findFirst = vi.fn<(args: unknown) => Promise<unknown>>();
  let service: OrdersService;

  beforeEach(async () => {
    findFirst.mockReset();
    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: { order: { findFirst } } },
        { provide: CustomersService, useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(OrdersService);
  });

  it('busca só pedidos ativos e retorna { data }', async () => {
    findFirst.mockResolvedValue({
      id: 'o1',
      orderNumber: 'PED-1001',
      expectedDeliveryDate: new Date('2026-11-15T00:00:00.000Z'),
      deliveryAddress: 'Rua',
      status: 'PENDING',
      customerId: customer.id,
      createdById: USER.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      customer,
      items: [],
    });

    const result = await service.findOne('o1');

    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'o1', deletedAt: null },
      include: { customer: true, items: true },
    });
    expect(result.data).toMatchObject({ id: 'o1', orderNumber: 'PED-1001' });
  });

  it('retorna 404 para pedido inexistente ou excluído', async () => {
    findFirst.mockResolvedValue(null);

    await expect(service.findOne('o1')).rejects.toThrow(
      new NotFoundException(ORDER_NOT_FOUND_MESSAGE),
    );
  });
});

describe('OrdersService.update', () => {
  const ORDER_ID = 'o0000000-0000-4000-8000-000000000001';
  const otherCustomer: Customer = {
    ...customer,
    id: 'c0000000-0000-4000-8000-000000000002',
    name: 'Empresa X',
    document: '12ABC34501DE35',
    type: 'COMPANY',
  };
  const current: Order = {
    id: ORDER_ID,
    orderNumber: 'PED-1001',
    expectedDeliveryDate: new Date('2026-11-15T00:00:00.000Z'),
    deliveryAddress: 'Rua das Flores, 123',
    status: 'PENDING',
    customerId: customer.id,
    createdById: USER.id,
    createdAt: new Date('2026-10-24T12:00:00.000Z'),
    updatedAt: new Date('2026-10-24T12:00:00.000Z'),
    deletedAt: null,
  };

  const queryRaw = vi.fn<() => Promise<{ id: string }[]>>();
  const findUniqueOrThrow = vi.fn<() => Promise<Order>>();
  type UpdateArgs = { where: unknown; data: Record<string, unknown> };
  const orderUpdate = vi.fn<(args: UpdateArgs) => Promise<unknown>>();
  const customerUpdate = vi.fn<(args: unknown) => Promise<Customer>>();
  const resolve =
    vi.fn<(tx: unknown, input: unknown) => Promise<ResolvedCustomer>>();
  const tx = {
    $queryRaw: queryRaw,
    order: { findUniqueOrThrow, update: orderUpdate },
    customer: { update: customerUpdate },
  };
  const $transaction = vi.fn((fn: (client: typeof tx) => Promise<unknown>) =>
    fn(tx),
  );
  let service: OrdersService;

  beforeEach(async () => {
    queryRaw.mockReset().mockResolvedValue([{ id: ORDER_ID }]);
    findUniqueOrThrow.mockReset().mockResolvedValue(current);
    customerUpdate.mockReset().mockResolvedValue(customer);
    resolve.mockReset().mockResolvedValue({ customer });
    orderUpdate.mockReset().mockImplementation(({ data }) =>
      Promise.resolve({
        ...current,
        ...Object.fromEntries(
          Object.entries(data).filter(([, v]) => v !== undefined),
        ),
        customer:
          data.customerId === otherCustomer.id ? otherCustomer : customer,
        items: [],
      }),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: { $transaction } },
        { provide: CustomersService, useValue: { resolve } },
      ],
    }).compile();
    service = moduleRef.get(OrdersService);
  });

  function updateData(): Record<string, unknown> {
    return orderUpdate.mock.calls[0][0].data;
  }

  it('retorna 404 sem alterar nada quando o pedido não está ativo', async () => {
    queryRaw.mockResolvedValue([]);

    await expect(
      service.update(ORDER_ID, { deliveryAddress: 'Rua B' }),
    ).rejects.toThrow(new NotFoundException(ORDER_NOT_FOUND_MESSAGE));
    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it('mantém campos omitidos e itens quando items não é enviado', async () => {
    await service.update(ORDER_ID, { deliveryAddress: 'Rua B' });

    expect(orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: ORDER_ID } }),
    );
    expect(updateData()).toMatchObject({
      orderNumber: undefined,
      expectedDeliveryDate: undefined,
      deliveryAddress: 'Rua B',
      status: undefined,
      customerId: customer.id,
      updatedAt: expect.any(Date) as unknown,
    });
    expect(updateData()).not.toHaveProperty('items');
    expect(resolve).not.toHaveBeenCalled();
    expect(customerUpdate).not.toHaveBeenCalled();
  });

  it('substitui todos os itens e converte a data', async () => {
    await service.update(ORDER_ID, {
      expectedDeliveryDate: '2026-12-01',
      items: [{ description: 'Novo', price: 9.9 }],
    });

    const data = updateData();
    expect(data.expectedDeliveryDate).toEqual(
      new Date('2026-12-01T00:00:00.000Z'),
    );
    const items = data.items as {
      deleteMany: object;
      create: { description: string; price: Prisma.Decimal }[];
    };
    expect(items.deleteMany).toEqual({});
    expect(
      items.create.map((i) => [i.description, i.price.toFixed(2)]),
    ).toEqual([['Novo', '9.90']]);
  });

  it('aplica transição permitida', async () => {
    await service.update(ORDER_ID, { status: 'CONFIRMED' });

    expect(updateData().status).toBe('CONFIRMED');
  });

  it('aceita reenviar o status atual', async () => {
    await expect(
      service.update(ORDER_ID, { status: 'PENDING' }),
    ).resolves.toBeDefined();
  });

  it('rejeita transição não permitida antes de qualquer escrita', async () => {
    await expect(
      service.update(ORDER_ID, {
        status: 'SHIPPED',
        customer: { name: 'Empresa X', document: '12ABC34501DE35' },
      }),
    ).rejects.toThrow(BadRequestException);
    expect(resolve).not.toHaveBeenCalled();
    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it('rejeita qualquer mudança a partir de status final', async () => {
    findUniqueOrThrow.mockResolvedValue({ ...current, status: 'DELIVERED' });

    await expect(
      service.update(ORDER_ID, { status: 'CANCELED' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('troca de cliente: decrementa o anterior e incrementa o novo', async () => {
    resolve.mockResolvedValue({ customer: otherCustomer });

    const result = await service.update(ORDER_ID, {
      customer: { name: 'Empresa X', document: '12ABC34501DE35' },
    });

    expect(resolve).toHaveBeenCalledWith(tx, {
      name: 'Empresa X',
      document: '12ABC34501DE35',
    });
    expect(customerUpdate.mock.calls).toEqual([
      [
        {
          where: { id: customer.id },
          data: { ordersCount: { decrement: 1 } },
        },
      ],
      [
        {
          where: { id: otherCustomer.id },
          data: { ordersCount: { increment: 1 } },
        },
      ],
    ]);
    expect(updateData().customerId).toBe(otherCustomer.id);
    expect(result.data.customer.id).toBe(otherCustomer.id);
    expect(result).not.toHaveProperty('warnings');
  });

  it('mesmo cliente com outro nome: não mexe na contagem e retorna aviso', async () => {
    const warning = customerNameUpdatedWarning('PERSON');
    resolve.mockResolvedValue({
      customer: { ...customer, name: 'João Silva' },
      warning,
    });

    const result = await service.update(ORDER_ID, {
      customer: { name: 'João Silva', document: '52998224725' },
    });

    expect(customerUpdate).not.toHaveBeenCalled();
    expect(result.warnings).toEqual([warning]);
  });

  it('converte número de pedido duplicado em 409', async () => {
    orderUpdate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.update(ORDER_ID, { orderNumber: 'PED-2000' }),
    ).rejects.toThrow(new ConflictException(ORDER_NUMBER_IN_USE_MESSAGE));
  });
});
