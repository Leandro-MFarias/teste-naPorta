import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  apiClient,
  createTestApp,
  createUser,
  login,
  resetDatabase,
  type TestApp,
} from './app.js';

const CPF_A = '52998224725';
const CPF_B = '11144477735';
const CNPJ_C = '12ABC34501DE35';

function orderPayload(
  orderNumber: string,
  document = CPF_A,
  name = 'Cliente A',
) {
  return {
    orderNumber,
    expectedDeliveryDate: '2026-11-15',
    deliveryAddress: 'Rua das Flores, 123',
    customer: { name, document },
    items: [
      { description: 'Caixa de som', price: 199.9 },
      { description: 'Cabo', price: 0.1 },
    ],
  };
}

describe('Pedidos (integração)', () => {
  let ctx: TestApp;
  let userId: string;
  let asUser: ReturnType<typeof apiClient>;
  let asAdmin: ReturnType<typeof apiClient>;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    await createUser(ctx.prisma, { email: 'admin@test.com', role: 'ADMIN' });
    userId = (
      await createUser(ctx.prisma, { email: 'user@test.com', role: 'USER' })
    ).id;
    asUser = apiClient(ctx.baseUrl, await login(ctx.baseUrl, 'user@test.com'));
    asAdmin = apiClient(
      ctx.baseUrl,
      await login(ctx.baseUrl, 'admin@test.com'),
    );
  });

  async function ordersCount(document: string): Promise<number | undefined> {
    const customer = await ctx.prisma.customer.findUnique({
      where: { document },
    });
    return customer?.ordersCount;
  }

  async function create(orderNumber: string, document = CPF_A) {
    const res = await asUser(
      'POST',
      '/orders',
      orderPayload(orderNumber, document),
    );
    expect(res.status).toBe(201);
    return res.body.data.id as string;
  }

  describe('criação', () => {
    it('persiste pedido, itens, cliente e criador relacionados', async () => {
      const res = await asUser('POST', '/orders', {
        ...orderPayload('PED-1'),
        customer: { name: 'Cliente A', document: '529.982.247-25' },
      });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        orderNumber: 'PED-1',
        status: 'PENDING',
        expectedDeliveryDate: '2026-11-15',
        createdById: userId,
        customer: { document: CPF_A, type: 'PERSON' },
      });

      const saved = await ctx.prisma.order.findUniqueOrThrow({
        where: { orderNumber: 'PED-1' },
        include: { customer: true, items: true, createdBy: true },
      });
      expect(saved.createdBy.email).toBe('user@test.com');
      expect(saved.customer).toMatchObject({
        name: 'Cliente A',
        document: CPF_A,
        ordersCount: 1,
      });
      expect(
        saved.items.map((i) => [i.description, i.price.toFixed(2)]).sort(),
      ).toEqual([
        ['Cabo', '0.10'],
        ['Caixa de som', '199.90'],
      ]);
    });

    it('reutiliza o cliente pelo documento e avisa quando o nome muda', async () => {
      await create('PED-1');

      const res = await asUser('POST', '/orders', {
        ...orderPayload('PED-2'),
        customer: { name: 'Cliente A Atualizado', document: CPF_A },
      });

      expect(res.status).toBe(201);
      expect(res.body.warnings).toEqual([
        {
          code: 'CUSTOMER_NAME_UPDATED',
          message: 'CPF já cadastrado. O nome do cliente foi atualizado.',
        },
      ]);
      expect(await ctx.prisma.customer.count()).toBe(1);
      expect(await ordersCount(CPF_A)).toBe(2);
    });

    it('número duplicado retorna 409 e desfaz o cliente criado na transação', async () => {
      await create('PED-1');

      const res = await asUser('POST', '/orders', orderPayload('PED-1', CPF_B));

      expect(res.status).toBe(409);
      expect(
        await ctx.prisma.customer.findUnique({ where: { document: CPF_B } }),
      ).toBeNull();
      expect(await ctx.prisma.order.count()).toBe(1);
      expect(await ordersCount(CPF_A)).toBe(1);
    });

    it('falha na última etapa (contagem) desfaz pedido, itens e cliente', async () => {
      // Gatilho temporário que faz o incremento de ordersCount falhar.
      await ctx.prisma.$executeRawUnsafe(`
        CREATE FUNCTION fail_orders_count() RETURNS trigger AS $$
        BEGIN RAISE EXCEPTION 'falha simulada'; END;
        $$ LANGUAGE plpgsql`);
      await ctx.prisma.$executeRawUnsafe(`
        CREATE TRIGGER fail_orders_count BEFORE UPDATE OF orders_count
        ON customers FOR EACH ROW EXECUTE FUNCTION fail_orders_count()`);

      try {
        const res = await asUser('POST', '/orders', orderPayload('PED-1'));

        expect(res.status).toBe(500);
        expect(res.body.message).toBe('Erro interno do servidor.');
        expect(await ctx.prisma.order.count()).toBe(0);
        expect(await ctx.prisma.orderItem.count()).toBe(0);
        expect(await ctx.prisma.customer.count()).toBe(0);
      } finally {
        await ctx.prisma.$executeRawUnsafe(
          'DROP TRIGGER fail_orders_count ON customers',
        );
        await ctx.prisma.$executeRawUnsafe('DROP FUNCTION fail_orders_count');
      }
    });

    it('pedidos simultâneos com o mesmo documento novo criam um único cliente', async () => {
      const results = await Promise.all(
        Array.from({ length: 15 }, (_, i) =>
          asUser('POST', '/orders', orderPayload(`PED-C${i}`, CPF_B)),
        ),
      );

      expect(results.map((r) => r.status)).toEqual(Array(15).fill(201));
      expect(await ctx.prisma.customer.count()).toBe(1);
      expect(await ordersCount(CPF_B)).toBe(15);
    });

    it('números iguais simultâneos: apenas um pedido é criado', async () => {
      const results = await Promise.all(
        Array.from({ length: 6 }, () =>
          asUser('POST', '/orders', orderPayload('PED-DUP')),
        ),
      );

      expect(results.map((r) => r.status).sort()).toEqual([
        201, 409, 409, 409, 409, 409,
      ]);
      expect(await ctx.prisma.order.count()).toBe(1);
      expect(await ordersCount(CPF_A)).toBe(1);
    });
  });

  describe('edição', () => {
    it('substitui todos os itens na mesma transação', async () => {
      const id = await create('PED-1');
      const oldIds = (
        await ctx.prisma.orderItem.findMany({ where: { orderId: id } })
      ).map((i) => i.id);

      const res = await asUser('PATCH', `/orders/${id}`, {
        items: [{ description: 'Monitor', price: 899 }],
      });

      expect(res.status).toBe(200);
      expect(res.body.data.items).toMatchObject([
        { description: 'Monitor', price: '899.00' },
      ]);
      const items = await ctx.prisma.orderItem.findMany({
        where: { orderId: id },
      });
      expect(items).toHaveLength(1);
      expect(oldIds).not.toContain(items[0].id);
      expect(
        await ctx.prisma.orderItem.count({ where: { id: { in: oldIds } } }),
      ).toBe(0);
    });

    it('rejeita items vazio e mantém os itens atuais', async () => {
      const id = await create('PED-1');

      const res = await asUser('PATCH', `/orders/${id}`, { items: [] });

      expect(res.status).toBe(400);
      expect(await ctx.prisma.orderItem.count({ where: { orderId: id } })).toBe(
        2,
      );
    });

    it('falha no meio do PATCH não deixa itens nem cliente alterados', async () => {
      const id = await create('PED-1');
      await create('PED-2');

      const res = await asUser('PATCH', `/orders/${id}`, {
        orderNumber: 'PED-2',
        customer: { name: 'Empresa C', document: CNPJ_C },
        items: [{ description: 'Novo', price: 1 }],
      });

      expect(res.status).toBe(409);
      expect(await ctx.prisma.orderItem.count({ where: { orderId: id } })).toBe(
        2,
      );
      expect(
        await ctx.prisma.customer.findUnique({ where: { document: CNPJ_C } }),
      ).toBeNull();
      expect(await ordersCount(CPF_A)).toBe(2);
    });

    it('segue as transições de status e rejeita as não permitidas', async () => {
      const id = await create('PED-1');

      expect(
        (await asUser('PATCH', `/orders/${id}`, { status: 'SHIPPED' })).status,
      ).toBe(400);
      for (const status of [
        'CONFIRMED',
        'IN_PREPARATION',
        'SHIPPED',
        'DELIVERED',
      ]) {
        expect(
          (await asUser('PATCH', `/orders/${id}`, { status })).status,
        ).toBe(200);
      }
      const res = await asUser('PATCH', `/orders/${id}`, {
        status: 'CANCELED',
      });

      expect(res.status).toBe(400);
      expect(
        (await ctx.prisma.order.findUniqueOrThrow({ where: { id } })).status,
      ).toBe('DELIVERED');
    });

    it('troca de cliente decrementa o anterior e incrementa o novo', async () => {
      const id = await create('PED-1');
      await create('PED-2');

      const res = await asUser('PATCH', `/orders/${id}`, {
        customer: { name: 'Empresa C', document: CNPJ_C.toLowerCase() },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.customer).toMatchObject({
        document: CNPJ_C,
        type: 'COMPANY',
      });
      expect(await ordersCount(CPF_A)).toBe(1);
      expect(await ordersCount(CNPJ_C)).toBe(1);
    });

    it('número duplicado retorna 409', async () => {
      const id = await create('PED-1');
      await create('PED-2');

      const res = await asUser('PATCH', `/orders/${id}`, {
        orderNumber: 'PED-2',
      });

      expect(res.status).toBe(409);
    });
  });

  describe('exclusão lógica', () => {
    it('marca deletedAt, decrementa a contagem e esconde o pedido', async () => {
      const id = await create('PED-1');
      await create('PED-2');

      const res = await asAdmin('DELETE', `/orders/${id}`);

      expect(res).toEqual({ status: 204, body: null });
      const saved = await ctx.prisma.order.findUniqueOrThrow({ where: { id } });
      expect(saved.deletedAt).toBeInstanceOf(Date);
      expect(await ctx.prisma.orderItem.count({ where: { orderId: id } })).toBe(
        2,
      );
      expect(await ordersCount(CPF_A)).toBe(1);

      expect((await asUser('GET', `/orders/${id}`)).status).toBe(404);
      expect(
        (await asUser('PATCH', `/orders/${id}`, { deliveryAddress: 'X' }))
          .status,
      ).toBe(404);
      expect((await asAdmin('DELETE', `/orders/${id}`)).status).toBe(404);
      const list = await asUser('GET', '/orders');
      expect(list.body.data.map((o: { id: string }) => o.id)).not.toContain(id);
      expect(list.body.meta.total).toBe(1);
      expect(await ordersCount(CPF_A)).toBe(1);
    });

    it('mantém o número reservado após a exclusão', async () => {
      const id = await create('PED-1');
      await asAdmin('DELETE', `/orders/${id}`);

      const res = await asUser('POST', '/orders', orderPayload('PED-1'));

      expect(res.status).toBe(409);
    });

    it('exclusões simultâneas decrementam uma única vez', async () => {
      const id = await create('PED-1');
      await create('PED-2');

      const results = await Promise.all(
        Array.from({ length: 8 }, () => asAdmin('DELETE', `/orders/${id}`)),
      );

      expect(results.map((r) => r.status).sort()).toEqual([
        204, 404, 404, 404, 404, 404, 404, 404,
      ]);
      expect(await ordersCount(CPF_A)).toBe(1);
    });

    it('USER não pode excluir', async () => {
      const id = await create('PED-1');

      expect((await asUser('DELETE', `/orders/${id}`)).status).toBe(403);
      expect(
        (await ctx.prisma.order.findUniqueOrThrow({ where: { id } })).deletedAt,
      ).toBeNull();
    });
  });

  describe('listagem', () => {
    beforeEach(async () => {
      // Seis pedidos com datas de criação controladas.
      const fixtures: [string, string, string][] = [
        ['PED-0001', '2026-10-01T10:00:00Z', 'PENDING'],
        ['PED-0002', '2026-10-05T23:59:59.999Z', 'SHIPPED'],
        ['PED-0003', '2026-10-05T12:00:00Z', 'PENDING'],
        ['ABC-0004', '2026-10-06T00:00:00Z', 'PENDING'],
        ['PED-0005', '2026-10-10T08:00:00Z', 'CANCELED'],
        ['PED-0006', '2026-10-12T08:00:00Z', 'PENDING'],
      ];
      for (const [orderNumber, createdAt, status] of fixtures) {
        await create(orderNumber);
        await ctx.prisma.order.update({
          where: { orderNumber },
          data: { createdAt: new Date(createdAt), status: status as never },
        });
      }
      const deleted = await create('PED-0007');
      await asAdmin('DELETE', `/orders/${deleted}`);
    });

    async function numbers(query: string) {
      const res = await asUser('GET', `/orders${query}`);
      expect(res.status).toBe(200);
      return {
        numbers: res.body.data.map(
          (o: { orderNumber: string }) => o.orderNumber,
        ),
        meta: res.body.meta,
      };
    }

    it('ordena por createdAt desc e pagina, sem pedidos excluídos', async () => {
      expect(await numbers('?limit=4')).toEqual({
        numbers: ['PED-0006', 'PED-0005', 'ABC-0004', 'PED-0002'],
        meta: { total: 6, page: 1, limit: 4, totalPages: 2 },
      });
      expect(await numbers('?limit=4&page=2')).toEqual({
        numbers: ['PED-0003', 'PED-0001'],
        meta: { total: 6, page: 2, limit: 4, totalPages: 2 },
      });
    });

    it('combina status, número parcial e período (endDate inclui o dia todo)', async () => {
      const result = await numbers(
        '?status=PENDING&orderNumber=ped-000&startDate=2026-10-01&endDate=2026-10-05',
      );

      expect(result.numbers).toEqual(['PED-0003', 'PED-0001']);
      expect((await numbers('?endDate=2026-10-05')).numbers).toEqual([
        'PED-0002',
        'PED-0003',
        'PED-0001',
      ]);
    });

    it('retorna lista vazia com meta quando nada corresponde', async () => {
      expect(await numbers('?orderNumber=XYZ')).toEqual({
        numbers: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });
    });

    it('rejeita período invertido e paginação inválida', async () => {
      const res = await asUser(
        'GET',
        '/orders?startDate=2026-10-06&endDate=2026-10-05&limit=0',
      );

      expect(res.status).toBe(400);
      expect(res.body.message).toEqual(
        expect.arrayContaining([
          'endDate não pode ser anterior a startDate',
          'limit deve ser maior ou igual a 1',
        ]),
      );
    });
  });
});
