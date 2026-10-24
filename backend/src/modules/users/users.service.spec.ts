import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma, type User } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PasswordService } from '../auth/password.service.js';
import { EMAIL_IN_USE_MESSAGE, UsersService } from './users.service.js';

describe('UsersService', () => {
  const create = vi.fn<(args: { data: Partial<User> }) => Promise<User>>();
  const hash = vi.fn<(password: string) => Promise<string>>();
  let service: UsersService;

  const request = {
    name: 'Maria Souza',
    email: 'maria.souza@example.com',
    password: 'SenhaForte123',
    role: 'USER' as const,
  };

  beforeEach(async () => {
    create.mockReset();
    hash.mockReset().mockResolvedValue('$2b$12$hash-gerado');

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: { user: { create } } },
        { provide: PasswordService, useValue: { hash } },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  it('grava o hash da senha, nunca a senha, e retorna a resposta pública', async () => {
    create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: '6f1c1c1e-8a52-4a63-9a39-1d2f0f5d8a10',
        isActive: true,
        createdAt: new Date('2026-10-24T12:00:00.000Z'),
        updatedAt: new Date('2026-10-24T12:00:00.000Z'),
        ...data,
      } as User),
    );

    const result = await service.create(request);

    expect(hash).toHaveBeenCalledWith('SenhaForte123');
    expect(create).toHaveBeenCalledWith({
      data: {
        name: 'Maria Souza',
        email: 'maria.souza@example.com',
        passwordHash: '$2b$12$hash-gerado',
        role: 'USER',
      },
    });
    expect(result).toEqual({
      id: '6f1c1c1e-8a52-4a63-9a39-1d2f0f5d8a10',
      name: 'Maria Souza',
      email: 'maria.souza@example.com',
      role: 'USER',
      isActive: true,
      createdAt: new Date('2026-10-24T12:00:00.000Z'),
      updatedAt: new Date('2026-10-24T12:00:00.000Z'),
    });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('converte violação de unicidade do email em 409', async () => {
    create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(service.create(request)).rejects.toThrow(
      new ConflictException(EMAIL_IN_USE_MESSAGE),
    );
  });

  it('propaga outros erros sem alterar', async () => {
    const failure = new Error('conexão perdida');
    create.mockRejectedValue(failure);

    await expect(service.create(request)).rejects.toBe(failure);
  });
});
