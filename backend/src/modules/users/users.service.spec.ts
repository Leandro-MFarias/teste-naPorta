import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma, type User } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PasswordService } from '../auth/password.service.js';
import { MailService } from '../mail/mail.service.js';
import {
  EMAIL_IN_USE_MESSAGE,
  UsersService,
  WELCOME_EMAIL_FAILED_MESSAGE,
} from './users.service.js';

type WelcomeData = { name: string; email: string; temporaryPassword: string };

describe('UsersService', () => {
  const create = vi.fn<(args: { data: Partial<User> }) => Promise<User>>();
  const hash = vi.fn<(password: string) => Promise<string>>();
  const sendWelcome = vi.fn<(data: WelcomeData) => Promise<void>>();
  const tx = { user: { create } };
  const $transaction = vi.fn((fn: (client: typeof tx) => Promise<unknown>) =>
    fn(tx),
  );
  let service: UsersService;

  const request = {
    name: 'Maria Souza',
    email: 'maria.souza@example.com',
    role: 'USER' as const,
  };

  beforeEach(async () => {
    hash.mockReset().mockResolvedValue('$argon2id$hash-gerado');
    sendWelcome.mockReset().mockResolvedValue(undefined);
    $transaction.mockClear();
    create.mockReset().mockImplementation(({ data }) =>
      Promise.resolve({
        id: '6f1c1c1e-8a52-4a63-9a39-1d2f0f5d8a10',
        isActive: true,
        createdAt: new Date('2026-10-24T12:00:00.000Z'),
        updatedAt: new Date('2026-10-24T12:00:00.000Z'),
        ...data,
      } as User),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: { $transaction } },
        { provide: PasswordService, useValue: { hash } },
        { provide: MailService, useValue: { sendWelcome } },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  it('gera senha temporária, grava só o hash e envia a mesma senha por email', async () => {
    const result = await service.create(request);

    const [temporaryPassword] = hash.mock.calls[0];
    expect(temporaryPassword).toMatch(/^[A-Za-z0-9]{16}$/);
    expect(create).toHaveBeenCalledWith({
      data: {
        name: 'Maria Souza',
        email: 'maria.souza@example.com',
        passwordHash: '$argon2id$hash-gerado',
        role: 'USER',
        mustChangePassword: true,
      },
    });
    expect(sendWelcome).toHaveBeenCalledWith({
      name: 'Maria Souza',
      email: 'maria.souza@example.com',
      temporaryPassword,
    });
    expect(result).toEqual({
      id: '6f1c1c1e-8a52-4a63-9a39-1d2f0f5d8a10',
      name: 'Maria Souza',
      email: 'maria.souza@example.com',
      role: 'USER',
      isActive: true,
      mustChangePassword: true,
      createdAt: new Date('2026-10-24T12:00:00.000Z'),
      updatedAt: new Date('2026-10-24T12:00:00.000Z'),
    });
    expect(JSON.stringify(result)).not.toContain(temporaryPassword);
  });

  it('gera uma senha diferente a cada cadastro', async () => {
    await service.create(request);
    await service.create(request);

    expect(hash.mock.calls[0][0]).not.toBe(hash.mock.calls[1][0]);
  });

  it('envia o email dentro da transação e retorna 503 se o envio falhar', async () => {
    sendWelcome.mockRejectedValue(new Error('SMTP indisponível'));

    await expect(service.create(request)).rejects.toThrow(
      new ServiceUnavailableException(WELCOME_EMAIL_FAILED_MESSAGE),
    );
    // A falha acontece dentro do callback da transação, o que faz o
    // Prisma desfazer o INSERT.
    expect($transaction).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('converte violação de unicidade do email em 409 sem enviar email', async () => {
    create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(service.create(request)).rejects.toThrow(
      new ConflictException(EMAIL_IN_USE_MESSAGE),
    );
    expect(sendWelcome).not.toHaveBeenCalled();
  });

  it('propaga outros erros sem alterar', async () => {
    const failure = new Error('conexão perdida');
    create.mockRejectedValue(failure);

    await expect(service.create(request)).rejects.toBe(failure);
  });
});
