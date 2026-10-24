import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Customer, Prisma } from '../../generated/prisma/client.js';
import {
  CustomersService,
  INVALID_DOCUMENT_MESSAGE,
} from './customers.service.js';

function customerRow(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'c0000000-0000-4000-8000-000000000001',
    name: 'João da Silva',
    document: '52998224725',
    type: 'PERSON',
    ordersCount: 2,
    createdAt: new Date('2026-10-01T12:00:00.000Z'),
    updatedAt: new Date('2026-10-01T12:00:00.000Z'),
    ...overrides,
  };
}

describe('CustomersService.resolve', () => {
  const createMany = vi.fn();
  const findUniqueOrThrow = vi.fn<(args: unknown) => Promise<Customer>>();
  const update =
    vi.fn<
      (args: { where: unknown; data: { name: string } }) => Promise<Customer>
    >();
  const tx = {
    customer: { createMany, findUniqueOrThrow, update },
  } as unknown as Prisma.TransactionClient;
  const service = new CustomersService();

  beforeEach(() => {
    createMany.mockReset().mockResolvedValue({ count: 1 });
    findUniqueOrThrow.mockReset();
    update.mockReset();
  });

  it('cria o cliente com documento normalizado e tipo PERSON para CPF', async () => {
    const created = customerRow({ ordersCount: 0 });
    findUniqueOrThrow.mockResolvedValue(created);

    const result = await service.resolve(tx, {
      name: 'João da Silva',
      document: '529.982.247-25',
    });

    expect(createMany).toHaveBeenCalledWith({
      data: [
        { name: 'João da Silva', document: '52998224725', type: 'PERSON' },
      ],
      skipDuplicates: true,
    });
    expect(findUniqueOrThrow).toHaveBeenCalledWith({
      where: { document: '52998224725' },
    });
    expect(result).toEqual({ customer: created });
    expect(update).not.toHaveBeenCalled();
  });

  it('identifica CNPJ alfanumérico como COMPANY', async () => {
    findUniqueOrThrow.mockResolvedValue(
      customerRow({
        name: 'Empresa X',
        document: '12ABC34501DE35',
        type: 'COMPANY',
      }),
    );

    await service.resolve(tx, {
      name: 'Empresa X',
      document: '12.abc.345/01de-35',
    });

    expect(createMany).toHaveBeenCalledWith({
      data: [
        { name: 'Empresa X', document: '12ABC34501DE35', type: 'COMPANY' },
      ],
      skipDuplicates: true,
    });
  });

  it('reutiliza cliente existente com o mesmo nome, sem aviso', async () => {
    const existing = customerRow();
    createMany.mockResolvedValue({ count: 0 });
    findUniqueOrThrow.mockResolvedValue(existing);

    const result = await service.resolve(tx, {
      name: 'João da Silva',
      document: '52998224725',
    });

    expect(result).toEqual({ customer: existing });
    expect(result).not.toHaveProperty('warning');
    expect(update).not.toHaveBeenCalled();
  });

  it('atualiza o nome de cliente PERSON existente e retorna aviso de CPF', async () => {
    createMany.mockResolvedValue({ count: 0 });
    findUniqueOrThrow.mockResolvedValue(customerRow({ name: 'João Silva' }));
    update.mockImplementation(({ data }) =>
      Promise.resolve(customerRow({ name: data.name })),
    );

    const result = await service.resolve(tx, {
      name: 'João da Silva',
      document: '52998224725',
    });

    expect(update).toHaveBeenCalledWith({
      where: { id: 'c0000000-0000-4000-8000-000000000001' },
      data: { name: 'João da Silva' },
    });
    expect(result.customer.name).toBe('João da Silva');
    expect(result.warning).toEqual({
      code: 'CUSTOMER_NAME_UPDATED',
      message: 'CPF já cadastrado. O nome do cliente foi atualizado.',
    });
  });

  it('atualiza a razão social de cliente COMPANY e retorna aviso de CNPJ', async () => {
    const company = {
      document: '11222333000181',
      type: 'COMPANY' as const,
    };
    createMany.mockResolvedValue({ count: 0 });
    findUniqueOrThrow.mockResolvedValue(
      customerRow({ ...company, name: 'Empresa Antiga' }),
    );
    update.mockImplementation(({ data }) =>
      Promise.resolve(customerRow({ ...company, name: data.name })),
    );

    const result = await service.resolve(tx, {
      name: 'Empresa Nova',
      document: '11.222.333/0001-81',
    });

    expect(result.warning).toEqual({
      code: 'CUSTOMER_NAME_UPDATED',
      message: 'CNPJ já cadastrado. A razão social foi atualizada.',
    });
  });

  it('rejeita documento inválido com 400 sem acessar o banco', async () => {
    await expect(
      service.resolve(tx, { name: 'João', document: '529.982.247-24' }),
    ).rejects.toThrow(new BadRequestException(INVALID_DOCUMENT_MESSAGE));
    expect(createMany).not.toHaveBeenCalled();
  });
});
