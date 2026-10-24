import type { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { OpenAPIObject } from '@nestjs/swagger';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TEST_JWT_SECRET } from '../test/auth.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { EmailSender } from './modules/mail/email-sender.js';
import { OrdersModule } from './modules/orders/orders.module.js';
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
          load: [
            () => ({
              JWT_SECRET: TEST_JWT_SECRET,
              JWT_EXPIRES_IN: '5h',
              FRONTEND_URL: 'http://localhost:3000',
            }),
          ],
        }),
        PrismaModule,
        AuthModule,
        UsersModule,
        OrdersModule,
        HealthModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(EmailSender)
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
      '503',
    ]);
    expect(operation?.responses['403']).toMatchObject({
      description: 'Acesso permitido apenas para: ADMIN.',
    });
    expect(document.components?.schemas).toHaveProperty('CreateUserDto');
    expect(
      Object.keys(
        (
          document.components?.schemas?.CreateUserDto as {
            properties: object;
          }
        ).properties,
      ).sort(),
    ).toEqual(['email', 'name', 'role']);
    expect(document.components?.schemas).toHaveProperty('UserDataResponseDto');
  });

  it('documenta POST /orders para ADMIN e USER, sem 403', () => {
    const operation = document.paths['/orders']?.post;

    expect(operation?.tags).toEqual(['Orders']);
    expect(operation?.security).toEqual([{ bearer: [] }]);
    expect(Object.keys(operation?.responses ?? {}).sort()).toEqual([
      '201',
      '400',
      '401',
      '409',
    ]);
    expect(document.components?.schemas).toHaveProperty('CreateOrderDto');
    expect(document.components?.schemas).toHaveProperty('OrderDataResponseDto');
    expect(document.components?.schemas?.OrderDataResponseDto).toMatchObject({
      required: ['data'],
    });
  });

  it('documenta GET /orders com filtros e paginação', () => {
    const operation = document.paths['/orders']?.get;

    expect(operation?.security).toEqual([{ bearer: [] }]);
    expect(Object.keys(operation?.responses ?? {}).sort()).toEqual([
      '200',
      '400',
      '401',
    ]);
    expect(
      operation?.parameters?.map((p) => 'name' in p && p.name).sort(),
    ).toEqual([
      'endDate',
      'limit',
      'orderNumber',
      'page',
      'startDate',
      'status',
    ]);
    expect(document.components?.schemas).toHaveProperty('OrderListResponseDto');
  });

  it('documenta GET e PATCH /orders/{id}', () => {
    const path = document.paths['/orders/{id}'];

    expect(Object.keys(path?.get?.responses ?? {}).sort()).toEqual([
      '200',
      '400',
      '401',
      '404',
    ]);
    expect(Object.keys(path?.patch?.responses ?? {}).sort()).toEqual([
      '200',
      '400',
      '401',
      '404',
      '409',
    ]);
    expect(path?.patch?.security).toEqual([{ bearer: [] }]);
    expect(path?.patch?.requestBody).toMatchObject({
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/UpdateOrderDto' },
        },
      },
    });
  });

  it('documenta DELETE /orders/{id} apenas para ADMIN', () => {
    const operation = document.paths['/orders/{id}']?.delete;

    expect(operation?.security).toEqual([{ bearer: [] }]);
    expect(Object.keys(operation?.responses ?? {}).sort()).toEqual([
      '204',
      '400',
      '401',
      '403',
      '404',
    ]);
    expect(operation?.responses['403']).toMatchObject({
      description: 'Acesso permitido apenas para: ADMIN.',
    });
  });

  it('documenta GET /auth/me e POST /auth/change-password com Bearer', () => {
    const me = document.paths['/auth/me']?.get;
    const change = document.paths['/auth/change-password']?.post;

    expect(me?.security).toEqual([{ bearer: [] }]);
    expect(Object.keys(me?.responses ?? {}).sort()).toEqual(['200', '401']);
    expect(change?.security).toEqual([{ bearer: [] }]);
    expect(Object.keys(change?.responses ?? {}).sort()).toEqual([
      '200',
      '400',
      '401',
    ]);
    expect(document.components?.schemas).toHaveProperty('ChangePasswordDto');
    expect(document.components?.schemas?.UserResponseDto).toMatchObject({
      required: expect.arrayContaining(['mustChangePassword']) as unknown,
    });
  });

  it('documenta o email do cliente no pedido', () => {
    expect(document.components?.schemas?.CustomerDto).toMatchObject({
      required: ['name', 'document', 'email'],
    });
    expect(
      document.components?.schemas?.OrderCustomerResponseDto,
    ).toMatchObject({
      properties: { email: { type: 'string', nullable: true } },
    });
  });
});
