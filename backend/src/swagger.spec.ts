import type { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { OpenAPIObject } from '@nestjs/swagger';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TEST_JWT_SECRET } from '../test/auth.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { PrismaService } from './prisma/prisma.service.js';
import { createSwaggerDocument } from './swagger.js';

describe('Swagger', () => {
  let app: INestApplication;
  let document: OpenAPIObject;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ JWT_SECRET: TEST_JWT_SECRET, JWT_EXPIRES_IN: '5h' })],
        }),
        PrismaModule,
        AuthModule,
        UsersModule,
        HealthModule,
      ],
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

  it('publica o schema de erro padronizado', () => {
    expect(document.components?.schemas?.ErrorResponseDto).toMatchObject({
      required: ['statusCode', 'message', 'error'],
    });
  });

  it('documenta GET /health com respostas 200 e 503', () => {
    const operation = document.paths['/health']?.get;

    expect(operation?.tags).toEqual(['Health']);
    expect(Object.keys(operation?.responses ?? {})).toEqual(['200', '503']);
    expect(document.components?.schemas).toHaveProperty('HealthResponseDto');
    expect(document.components?.schemas).toHaveProperty('DatabaseHealthDto');
  });

  it('documenta POST /auth/login como rota pública com 200, 400 e 401', () => {
    const operation = document.paths['/auth/login']?.post;

    expect(operation?.tags).toEqual(['Auth']);
    expect(operation?.security).toBeUndefined();
    expect(Object.keys(operation?.responses ?? {}).sort()).toEqual([
      '200',
      '400',
      '401',
    ]);
    expect(operation?.requestBody).toMatchObject({
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/LoginDto' },
        },
      },
    });
    expect(document.components?.schemas).toHaveProperty('LoginDataResponseDto');
  });

  it('documenta POST /users como exclusivo de ADMIN com Bearer', () => {
    const operation = document.paths['/users']?.post;

    expect(operation?.tags).toEqual(['Users']);
    expect(operation?.security).toEqual([{ bearer: [] }]);
    expect(Object.keys(operation?.responses ?? {}).sort()).toEqual([
      '201',
      '400',
      '401',
      '403',
      '409',
    ]);
    expect(operation?.responses['403']).toMatchObject({
      description: 'Acesso permitido apenas para: ADMIN.',
    });
    expect(document.components?.schemas).toHaveProperty('CreateUserDto');
    expect(document.components?.schemas).toHaveProperty('UserDataResponseDto');
  });
});
