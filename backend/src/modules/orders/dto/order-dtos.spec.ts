import { describe, expect, it } from 'vitest';
import { validateDto } from '../../../../test/validation.js';
import {
  CreateOrderDto,
  CustomerDto,
  OrderItemDto,
} from './create-order.dto.js';
import { ListOrdersQueryDto } from './list-orders-query.dto.js';
import { UpdateOrderDto } from './update-order.dto.js';

const validOrder = {
  orderNumber: 'PED-1001',
  expectedDeliveryDate: '2026-11-15',
  deliveryAddress: 'Rua das Flores, 123',
  customer: {
    name: 'João da Silva',
    document: '529.982.247-25',
    email: 'joao@example.com',
  },
  items: [{ description: 'Caixa de som', price: 199.9 }],
};

describe('CreateOrderDto', () => {
  it('aceita um pedido válido e instancia os DTOs aninhados', async () => {
    const { dto, errors } = await validateDto(CreateOrderDto, validOrder);

    expect(errors).toEqual([]);
    expect(dto?.customer).toBeInstanceOf(CustomerDto);
    expect(dto?.items[0]).toBeInstanceOf(OrderItemDto);
  });

  it('aceita CNPJ numérico e alfanumérico formatados', async () => {
    for (const document of ['11.222.333/0001-81', '12.ABC.345/01DE-35']) {
      const { errors } = await validateDto(CreateOrderDto, {
        ...validOrder,
        customer: { name: 'Empresa X', document, email: 'x@example.com' },
      });

      expect(errors).toEqual([]);
    }
  });

  it('exige email válido do cliente e normaliza para minúsculas', async () => {
    const missing = await validateDto(CreateOrderDto, {
      ...validOrder,
      customer: { name: 'João', document: '529.982.247-25' },
    });
    const invalid = await validateDto(CreateOrderDto, {
      ...validOrder,
      customer: { ...validOrder.customer, email: 'nao-e-email' },
    });
    const normalized = await validateDto(CreateOrderDto, {
      ...validOrder,
      customer: { ...validOrder.customer, email: '  Joao@Example.COM ' },
    });

    expect(missing.errors).toContain('customer.email deve ser um email válido');
    expect(invalid.errors).toContain('customer.email deve ser um email válido');
    expect(normalized.dto?.customer.email).toBe('joao@example.com');
  });

  it('rejeita lista de itens vazia', async () => {
    const { errors } = await validateDto(CreateOrderDto, {
      ...validOrder,
      items: [],
    });

    expect(errors).toContain('items deve ter pelo menos um item');
  });

  it.each([
    ['negativo', -1, 'items.0.price não pode ser negativo'],
    [
      'com três casas decimais',
      10.555,
      'items.0.price deve ser um número com até duas casas decimais',
    ],
    [
      'enviado como texto',
      '10.50',
      'items.0.price deve ser um número com até duas casas decimais',
    ],
  ])('rejeita preço %s', async (_, price, message) => {
    const { errors } = await validateDto(CreateOrderDto, {
      ...validOrder,
      items: [{ description: 'Item', price }],
    });

    expect(errors).toContain(message);
  });

  it.each(['15/11/2026', '2026-02-30', '2026-11-15T10:00:00Z'])(
    'rejeita previsão de entrega %s',
    async (expectedDeliveryDate) => {
      const { errors } = await validateDto(CreateOrderDto, {
        ...validOrder,
        expectedDeliveryDate,
      });

      expect(errors.some((m) => m.startsWith('expectedDeliveryDate'))).toBe(
        true,
      );
    },
  );

  it.each([
    '529.982.247-24',
    '11.222.333/0001-82',
    '529;982',
    '111.111.111-11',
  ])('rejeita documento inválido %s', async (document) => {
    const { errors } = await validateDto(CreateOrderDto, {
      ...validOrder,
      customer: { name: 'João', document },
    });

    expect(errors).toContain(
      'customer.document deve ser um CPF ou CNPJ válido',
    );
  });

  it('rejeita documento com caracteres inválidos e cliente ausente', async () => {
    const invalidDocument = await validateDto(CreateOrderDto, {
      ...validOrder,
      customer: { name: 'João', document: '529;982' },
    });
    const missingCustomer = await validateDto(CreateOrderDto, {
      ...validOrder,
      customer: undefined,
    });

    expect(
      invalidDocument.errors.some((m) => m.startsWith('customer.document')),
    ).toBe(true);
    expect(missingCustomer.errors).toContain('customer deve ser um objeto');
  });

  it('não aceita status nem createdById no body', async () => {
    const { errors } = await validateDto(CreateOrderDto, {
      ...validOrder,
      status: 'DELIVERED',
      createdById: '6f1c1c1e-8a52-4a63-9a39-1d2f0f5d8a10',
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        'property status should not exist',
        'property createdById should not exist',
      ]),
    );
  });

  it('rejeita orderNumber com caracteres inválidos', async () => {
    const { errors } = await validateDto(CreateOrderDto, {
      ...validOrder,
      orderNumber: 'PED 1001',
    });

    expect(errors.some((m) => m.startsWith('orderNumber deve começar'))).toBe(
      true,
    );
  });
});

describe('UpdateOrderDto', () => {
  it('aceita body parcial e mantém campos omitidos indefinidos', async () => {
    const { dto, errors } = await validateDto(UpdateOrderDto, {
      status: 'CONFIRMED',
    });

    expect(errors).toEqual([]);
    expect(dto?.status).toBe('CONFIRMED');
    expect(dto?.items).toBeUndefined();
    expect(dto?.orderNumber).toBeUndefined();
  });

  it('rejeita items vazio', async () => {
    const { errors } = await validateDto(UpdateOrderDto, { items: [] });

    expect(errors).toContain('items deve ter pelo menos um item');
  });

  it('rejeita null em campos e status inexistente', async () => {
    const { errors } = await validateDto(UpdateOrderDto, {
      orderNumber: null,
      items: null,
      status: null,
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        'orderNumber deve ser um texto',
        'items deve ser uma lista',
        'status deve ser um status de pedido válido',
      ]),
    );
  });

  it('valida itens enviados na substituição', async () => {
    const { errors } = await validateDto(UpdateOrderDto, {
      items: [{ description: '', price: 1 }],
    });

    expect(errors).toContain('items.0.description é obrigatório');
  });
});

describe('ListOrdersQueryDto', () => {
  it('aplica page=1 e limit=10 por padrão', async () => {
    const { dto, errors } = await validateDto(ListOrdersQueryDto, {}, 'query');

    expect(errors).toEqual([]);
    expect(dto).toMatchObject({ page: 1, limit: 10 });
  });

  it('converte page e limit da query string para número', async () => {
    const { dto } = await validateDto(
      ListOrdersQueryDto,
      { page: '2', limit: '25', status: 'SHIPPED', orderNumber: ' 100 ' },
      'query',
    );

    expect(dto).toMatchObject({
      page: 2,
      limit: 25,
      status: 'SHIPPED',
      orderNumber: '100',
    });
  });

  it.each([
    [{ page: '0' }, 'page deve ser maior ou igual a 1'],
    [{ page: 'abc' }, 'page deve ser um número inteiro'],
    [{ page: '1e20' }, 'page deve ser no máximo 1000000'],
    [{ limit: '101' }, 'limit deve ser no máximo 100'],
    [{ limit: '1.5' }, 'limit deve ser um número inteiro'],
    [
      { startDate: '2026-13-01' },
      'startDate deve ser uma data ISO 8601 válida',
    ],
    [
      { endDate: '2026-10-24T10:00:00' },
      'endDate deve ser uma data ISO 8601 válida',
    ],
    [
      { startDate: '2026-10-10', endDate: '2026-10-09' },
      'endDate não pode ser anterior a startDate',
    ],
    [{ status: 'LOST' }, 'status deve ser um status de pedido válido'],
    [{ unknown: 'x' }, 'property unknown should not exist'],
  ])('rejeita %o', async (query, message) => {
    const { errors } = await validateDto(ListOrdersQueryDto, query, 'query');

    expect(errors).toContain(message);
  });

  it('aceita datas YYYY-MM-DD e data/hora ISO 8601', async () => {
    const { errors } = await validateDto(
      ListOrdersQueryDto,
      { startDate: '2026-10-01', endDate: '2026-10-31T23:59:59.999Z' },
      'query',
    );

    expect(errors).toEqual([]);
  });

  it('aceita startDate e endDate no mesmo dia', async () => {
    const { errors } = await validateDto(
      ListOrdersQueryDto,
      { startDate: '2026-10-10', endDate: '2026-10-10' },
      'query',
    );

    expect(errors).toEqual([]);
  });

  it('não compara o período quando uma das datas é inválida', async () => {
    const { errors } = await validateDto(
      ListOrdersQueryDto,
      { startDate: 'x', endDate: '2026-10-09' },
      'query',
    );

    expect(errors).toEqual(['startDate deve ser uma data ISO 8601 válida']);
  });
});
