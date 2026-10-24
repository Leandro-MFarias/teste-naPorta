import {
  Body,
  ConflictException,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Post,
  type INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsString } from 'class-validator';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { configureApp } from '../../app.setup.js';
import { Prisma } from '../../generated/prisma/client.js';

class EchoDto {
  @IsString({ message: 'name deve ser um texto' })
  name: string;
}

function prismaError(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    'Unique constraint failed on the fields: (`email`)',
    { code, clientVersion: 'test' },
  );
}

@Controller('test')
class TestController {
  @Post('validation')
  validation(@Body() body: EchoDto): EchoDto {
    return body;
  }

  @Get('not-found')
  notFound(): never {
    throw new NotFoundException('Pedido não encontrado.');
  }

  @Get('conflict')
  conflict(): never {
    throw new ConflictException('Já existe um pedido com este número.');
  }

  @Get('prisma-unique')
  prismaUnique(): never {
    throw prismaError('P2002');
  }

  @Get('prisma-not-found')
  prismaNotFound(): never {
    throw prismaError('P2025');
  }

  @Get('unexpected')
  unexpected(): never {
    throw new Error('SELECT * FROM users -- detalhe interno');
  }
}

describe('AllExceptionsFilter', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TestController],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function request(path: string, init?: RequestInit) {
    const res = await fetch(`${baseUrl}${path}`, init);
    return { status: res.status, body: (await res.json()) as unknown };
  }

  function post(path: string, body: string) {
    return request(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    });
  }

  it('retorna erros de validação como lista em message', async () => {
    const res = await post('/test/validation', JSON.stringify({ x: 1 }));

    expect(res).toEqual({
      status: 400,
      body: {
        statusCode: 400,
        message: ['property x should not exist', 'name deve ser um texto'],
        error: 'BAD_REQUEST',
      },
    });
  });

  it('formata JSON malformado como 400', async () => {
    const res = await post('/test/validation', '{"name":');

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ statusCode: 400, error: 'BAD_REQUEST' });
  });

  it('preserva a mensagem de HttpException', async () => {
    await expect(request('/test/not-found')).resolves.toEqual({
      status: 404,
      body: {
        statusCode: 404,
        message: 'Pedido não encontrado.',
        error: 'NOT_FOUND',
      },
    });
    await expect(request('/test/conflict')).resolves.toEqual({
      status: 409,
      body: {
        statusCode: 409,
        message: 'Já existe um pedido com este número.',
        error: 'CONFLICT',
      },
    });
  });

  it('formata rota inexistente como 404', async () => {
    const res = await request('/rota-inexistente');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ statusCode: 404, error: 'NOT_FOUND' });
  });

  it('converte violação de unicidade do Prisma (P2002) em 409', async () => {
    await expect(request('/test/prisma-unique')).resolves.toEqual({
      status: 409,
      body: {
        statusCode: 409,
        message: 'Já existe um registro com estes dados.',
        error: 'CONFLICT',
      },
    });
  });

  it('converte registro não encontrado do Prisma (P2025) em 404', async () => {
    const res = await request('/test/prisma-not-found');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: 'NOT_FOUND' });
  });

  it('retorna 500 genérico sem expor detalhes e registra o erro no log', async () => {
    const logError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    const res = await request('/test/unexpected');

    expect(res).toEqual({
      status: 500,
      body: {
        statusCode: 500,
        message: 'Erro interno do servidor.',
        error: 'INTERNAL_SERVER_ERROR',
      },
    });
    expect(JSON.stringify(res.body)).not.toContain('SELECT');
    expect(logError).toHaveBeenCalledWith(
      'GET /test/unexpected -> 500',
      expect.stringContaining('detalhe interno'),
    );
  });
});
