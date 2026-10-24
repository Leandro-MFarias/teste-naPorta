import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { OpenAPIObject } from '@nestjs/swagger';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { PrismaService } from './prisma/prisma.service.js';
import { createSwaggerDocument } from './swagger.js';

describe('Swagger', () => {
  let app: INestApplication;
  let document: OpenAPIObject;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, HealthModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
    document = createSwaggerDocument(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('declara o esquema de autenticação Bearer JWT', () => {
    expect(document.components?.securitySchemes?.bearer).toMatchObject({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    });
  });

  it('documenta GET /health com respostas 200 e 503', () => {
    const operation = document.paths['/health']?.get;

    expect(operation?.tags).toEqual(['Health']);
    expect(Object.keys(operation?.responses ?? {})).toEqual(['200', '503']);
    expect(document.components?.schemas).toHaveProperty('HealthResponseDto');
    expect(document.components?.schemas).toHaveProperty('DatabaseHealthDto');
  });
});
