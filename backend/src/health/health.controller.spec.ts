import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HealthController } from './health.controller.js';
import type { HealthResponseDto } from './health.dto.js';
import { HealthService } from './health.service.js';

describe('HealthController', () => {
  const check = vi.fn<() => Promise<HealthResponseDto>>();
  const status = vi.fn();
  const res = { status } as unknown as Response;
  let controller: HealthController;

  beforeEach(async () => {
    check.mockReset();
    status.mockReset();

    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: { check } }],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('mantém o status 200 quando saudável', async () => {
    const health: HealthResponseDto = {
      status: 'Healthy',
      database: {
        status: 'Healthy',
        openConnections: 1,
        availableConnections: 96,
        maxConnections: 100,
      },
    };
    check.mockResolvedValue(health);

    await expect(controller.check(res)).resolves.toBe(health);
    expect(status).not.toHaveBeenCalled();
  });

  it('responde 503 quando não saudável', async () => {
    const health: HealthResponseDto = {
      status: 'Unhealthy',
      database: { status: 'Unhealthy' },
    };
    check.mockResolvedValue(health);

    await expect(controller.check(res)).resolves.toBe(health);
    expect(status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
  });
});
