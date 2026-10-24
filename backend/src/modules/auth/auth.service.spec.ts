import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { testJwtService } from '../../../test/auth.js';
import type { User } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthService, INVALID_CREDENTIALS_MESSAGE } from './auth.service.js';
import { PasswordService } from './password.service.js';

describe('AuthService', () => {
  const findUnique = vi.fn<(args: unknown) => Promise<User | null>>();
  let service: AuthService;
  let passwords: PasswordService;
  let user: User;

  beforeAll(async () => {
    user = {
      id: '6f1c1c1e-8a52-4a63-9a39-1d2f0f5d8a10',
      name: 'Maria Souza',
      email: 'maria.souza@example.com',
      passwordHash: await new PasswordService().hash('SenhaForte123'),
      role: 'USER',
      isActive: true,
      createdAt: new Date('2026-10-21T12:00:00.000Z'),
      updatedAt: new Date('2026-10-21T12:00:00.000Z'),
    };
  });

  beforeEach(async () => {
    findUnique.mockReset();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        PasswordService,
        { provide: JwtService, useValue: testJwtService },
        { provide: PrismaService, useValue: { user: { findUnique } } },
        {
          provide: ConfigService,
          useValue: { get: () => '5h' },
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    passwords = moduleRef.get(PasswordService);
  });

  it('retorna token Bearer com validade de 5h e usuário sem credenciais', async () => {
    findUnique.mockResolvedValue(user);

    const result = await service.login({
      email: user.email,
      password: 'SenhaForte123',
    });

    expect(findUnique).toHaveBeenCalledWith({ where: { email: user.email } });
    expect(result).toMatchObject({ tokenType: 'Bearer', expiresIn: 18000 });
    expect(result.user).toEqual({
      id: user.id,
      name: user.name,
      email: user.email,
      role: 'USER',
      isActive: true,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
    expect(JSON.stringify(result)).not.toContain(user.passwordHash);

    const payload = await testJwtService.verifyAsync<{
      sub: string;
      role: string;
      iat: number;
      exp: number;
    }>(result.accessToken);
    expect(payload).toMatchObject({ sub: user.id, role: 'USER' });
    expect(payload.exp - payload.iat).toBe(18000);
    expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'role', 'sub']);
  });

  it('rejeita senha incorreta', async () => {
    findUnique.mockResolvedValue(user);

    await expect(
      service.login({ email: user.email, password: 'SenhaErrada123' }),
    ).rejects.toThrow(new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE));
  });

  it('rejeita usuário inativo mesmo com a senha correta', async () => {
    findUnique.mockResolvedValue({ ...user, isActive: false });

    await expect(
      service.login({ email: user.email, password: 'SenhaForte123' }),
    ).rejects.toThrow(new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE));
  });

  it('rejeita email inexistente com a mesma mensagem, ainda verificando um hash', async () => {
    findUnique.mockResolvedValue(null);
    const verify = vi.spyOn(passwords, 'verify');

    await expect(
      service.login({ email: 'ninguem@example.com', password: 'qualquer1' }),
    ).rejects.toThrow(new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE));
    // Mesmo custo do caso de email existente (evita enumeração).
    expect(verify).toHaveBeenCalledWith(
      'qualquer1',
      expect.stringMatching(/^\$argon2id\$v=19\$m=19456,p=1,t=2\$/),
    );
  });
});
