import { describe, expect, it } from 'vitest';
import { validateDto } from '../../test/validation.js';
import { CreateUserDto } from '../../src/modules/users/dto/create-user.dto.js';
import { CreateOrderDto } from '../../src/modules/orders/dto/create-order.dto.js';
import { parseDocument } from '../../src/modules/customers/document.js';
import { OrderStatus } from '../../src/generated/prisma/enums.js';
import { buildSeedOrders, SEED_CUSTOMERS, SEED_USERS } from './data.js';

describe('dados do seed', () => {
  const orders = buildSeedOrders();

  it('tem um ADMIN e um USER com dados válidos para a API', async () => {
    expect(SEED_USERS.map((u) => u.role).sort()).toEqual(['ADMIN', 'USER']);
    for (const user of SEED_USERS) {
      const { errors } = await validateDto(CreateUserDto, user);
      expect(errors).toEqual([]);
    }
  });

  it('tem clientes com CPF e CNPJ válidos e únicos', () => {
    const parsed = SEED_CUSTOMERS.map((c) => parseDocument(c.document));

    expect(parsed).not.toContain(null);
    expect(new Set(parsed.map((p) => p?.type))).toEqual(
      new Set(['PERSON', 'COMPANY']),
    );
    expect(new Set(parsed.map((p) => p?.value)).size).toBe(
      SEED_CUSTOMERS.length,
    );
  });

  it('gera pelo menos 20 pedidos com números únicos', () => {
    expect(orders.length).toBeGreaterThanOrEqual(20);
    expect(new Set(orders.map((o) => o.orderNumber)).size).toBe(orders.length);
  });

  it('é determinístico', () => {
    expect(buildSeedOrders()).toEqual(orders);
  });

  it('cobre os seis status e vários meses de criação', () => {
    expect(new Set(orders.map((o) => o.status))).toEqual(
      new Set(Object.values(OrderStatus)),
    );
    expect(
      new Set(orders.map((o) => o.createdAt.toISOString().slice(0, 7))).size,
    ).toBeGreaterThanOrEqual(3);
  });

  it('usa todos os clientes e os dois usuários como criadores', () => {
    expect(new Set(orders.map((o) => o.customerDocument)).size).toBe(
      SEED_CUSTOMERS.length,
    );
    expect(new Set(orders.map((o) => o.createdByEmail)).size).toBe(2);
  });

  it('cada pedido passa na validação de criação da API', async () => {
    const byDocument = new Map(SEED_CUSTOMERS.map((c) => [c.document, c]));
    for (const order of orders) {
      const { errors } = await validateDto(CreateOrderDto, {
        orderNumber: order.orderNumber,
        expectedDeliveryDate: order.expectedDeliveryDate,
        deliveryAddress: order.deliveryAddress,
        customer: byDocument.get(order.customerDocument),
        items: order.items.map((i) => ({ ...i, price: Number(i.price) })),
      });
      expect(errors).toEqual([]);
      expect(order.expectedDeliveryDate > order.createdAt.toISOString()).toBe(
        true,
      );
    }
  });
});
