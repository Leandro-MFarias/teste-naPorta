import { describe, expect, it } from 'vitest';
import { Prisma } from '../../generated/prisma/client.js';
import { toOrderResponse, type OrderWithRelations } from './order.mapper.js';

describe('toOrderResponse', () => {
  const order: OrderWithRelations = {
    id: 'a3d1b2c4-0000-4000-8000-000000000001',
    orderNumber: 'PED-1001',
    expectedDeliveryDate: new Date('2026-11-15T00:00:00.000Z'),
    deliveryAddress: 'Rua das Flores, 123',
    status: 'PENDING',
    customerId: 'a3d1b2c4-0000-4000-8000-000000000002',
    createdById: 'a3d1b2c4-0000-4000-8000-000000000003',
    createdAt: new Date('2026-10-21T12:00:00.000Z'),
    updatedAt: new Date('2026-10-21T12:00:00.000Z'),
    deletedAt: null,
    customer: {
      id: 'a3d1b2c4-0000-4000-8000-000000000002',
      name: 'João da Silva',
      document: '52998224725',
      email: 'joao@example.com',
      type: 'PERSON',
      ordersCount: 3,
      createdAt: new Date('2026-10-01T12:00:00.000Z'),
      updatedAt: new Date('2026-10-01T12:00:00.000Z'),
    },
    items: [
      {
        id: 'a3d1b2c4-0000-4000-8000-000000000004',
        orderId: 'a3d1b2c4-0000-4000-8000-000000000001',
        description: 'Caixa de som',
        price: new Prisma.Decimal('199.9'),
      },
    ],
  };

  it('formata data de entrega como YYYY-MM-DD e preço como string decimal', () => {
    const response = toOrderResponse(order);

    expect(response.expectedDeliveryDate).toBe('2026-11-15');
    expect(response.items).toEqual([
      {
        id: order.items[0].id,
        description: 'Caixa de som',
        price: '199.90',
      },
    ]);
  });

  it('não expõe deletedAt, customerId nem campos internos do cliente', () => {
    const response = toOrderResponse(order);

    expect(response).not.toHaveProperty('deletedAt');
    expect(response).not.toHaveProperty('customerId');
    expect(response.customer).toEqual({
      id: order.customer.id,
      name: 'João da Silva',
      document: '52998224725',
      email: 'joao@example.com',
      type: 'PERSON',
    });
  });
});
