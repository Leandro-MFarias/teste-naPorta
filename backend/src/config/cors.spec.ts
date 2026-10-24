import { Controller, Get, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createCorsOptions,
  DEFAULT_CORS_ORIGINS,
  parseCorsOrigins,
} from './cors.js';

describe('parseCorsOrigins', () => {
  it('lê a origem padrão do frontend local', () => {
    expect(parseCorsOrigins(DEFAULT_CORS_ORIGINS)).toEqual([
      'http://localhost:3000',
    ]);
  });

  it('separa por vírgula, remove espaços, barra final e duplicadas', () => {
    expect(
      parseCorsOrigins(
        ' http://localhost:3000/ , https://portal.example.com,http://localhost:3000',
      ),
    ).toEqual(['http://localhost:3000', 'https://portal.example.com']);
  });

  it.each([
    '',
    ' , ',
    '*',
    'localhost:3000',
    'ftp://example.com',
    'https://portal.example.com/app',
    'http://localhost:3000, invalido',
  ])('rejeita %j', (value) => {
    expect(parseCorsOrigins(value)).toBeNull();
  });
});

@Controller('ping')
class PingController {
  @Get()
  ping() {
    return { ok: true };
  }
}

describe('CORS na aplicação', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PingController],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.enableCors(createCorsOptions(['http://localhost:3000']));
    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  function preflight(origin: string) {
    return fetch(`${baseUrl}/ping`, {
      method: 'OPTIONS',
      headers: {
        origin,
        'access-control-request-method': 'PATCH',
        'access-control-request-headers': 'authorization,content-type',
      },
    });
  }

  it('libera a origem configurada com métodos e headers da API', async () => {
    const res = await preflight('http://localhost:3000');

    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe(
      'http://localhost:3000',
    );
    expect(res.headers.get('access-control-allow-methods')).toBe(
      'GET,POST,PATCH,DELETE',
    );
    expect(res.headers.get('access-control-allow-headers')).toBe(
      'Content-Type,Authorization',
    );
    expect(res.headers.get('access-control-allow-credentials')).toBeNull();
  });

  it('não libera outras origens', async () => {
    const preflightRes = await preflight('http://malicioso.example.com');
    const getRes = await fetch(`${baseUrl}/ping`, {
      headers: { origin: 'http://localhost:4000' },
    });

    expect(preflightRes.headers.get('access-control-allow-origin')).toBeNull();
    expect(getRes.headers.get('access-control-allow-origin')).toBeNull();
  });
});
