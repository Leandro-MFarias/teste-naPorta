import { ConflictException } from '@nestjs/common';
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
