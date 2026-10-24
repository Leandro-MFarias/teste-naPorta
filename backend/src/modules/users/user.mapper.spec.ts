import { describe, expect, it } from 'vitest';
import type { User } from '../../generated/prisma/client.js';
import { toUserResponse } from './user.mapper.js';

describe('toUserResponse', () => {
  it('retorna apenas os campos públicos, sem passwordHash', () => {
    const user: User = {
      id: '6f1c1c1e-8a52-4a63-9a39-1d2f0f5d8a10',
      name: 'Maria Souza',
      email: 'maria.souza@example.com',
      passwordHash: '$2b$10$hash',
      role: 'ADMIN',
      isActive: true,
      createdAt: new Date('2026-10-21T12:00:00.000Z'),
      updatedAt: new Date('2026-10-22T12:00:00.000Z'),
    };

    const response = toUserResponse(user);

    expect(response).toEqual({
      id: user.id,
      name: user.name,
      email: user.email,
      role: 'ADMIN',
      isActive: true,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
    expect(response).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(response)).not.toContain('$2b$');
  });
});
