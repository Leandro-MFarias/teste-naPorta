import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { HealthService } from './health.service.js';

describe('HealthService', () => {
  const queryRaw = vi.fn();
  let service: HealthService;

  beforeEach(async () => {
    queryRaw.mockReset();
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const moduleRef = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: { $queryRaw: queryRaw } },
      ],
    }).compile();

    service = moduleRef.get(HealthService);
  });

  it('retorna Healthy com conexões abertas, disponíveis e máximas', async () => {
    queryRaw.mockResolvedValue([
      { openConnections: 7, maxConnections: 100, reservedConnections: 3 },
    ]);

    await expect(service.check()).resolves.toEqual({
      status: 'Healthy',
      database: {
        status: 'Healthy',
        openConnections: 7,
        availableConnections: 90,
        maxConnections: 100,
      },
    });
  });

  it('não retorna conexões disponíveis negativas', async () => {
    queryRaw.mockResolvedValue([
      { openConnections: 100, maxConnections: 100, reservedConnections: 3 },
    ]);

    const health = await service.check();

    expect(health.database.availableConnections).toBe(0);
  });

  it('retorna Unhealthy sem métricas quando o banco não responde', async () => {
    queryRaw.mockRejectedValue(new Error('DatabaseNotReachable'));

    await expect(service.check()).resolves.toEqual({
      status: 'Unhealthy',
      database: { status: 'Unhealthy' },
    });
  });
});
