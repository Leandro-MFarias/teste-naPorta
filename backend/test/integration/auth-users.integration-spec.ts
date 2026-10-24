import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  apiClient,
  createTestApp,
  createUser,
  login,
  resetDatabase,
  TEST_PASSWORD,
  type TestApp,
} from './app.js';

describe('Autenticação e usuários (integração)', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    await createUser(ctx.prisma, { email: 'admin@test.com', role: 'ADMIN' });
    await createUser(ctx.prisma, { email: 'user@test.com', role: 'USER' });
  });

  it('login retorna token e usuário sem senha ou hash', async () => {
    const res = await apiClient(ctx.baseUrl)('POST', '/auth/login', {
      email: '  ADMIN@test.com ',
      password: TEST_PASSWORD,
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      accessToken: expect.any(String),
      tokenType: 'Bearer',
      user: { email: 'admin@test.com', role: 'ADMIN' },
    });
    const text = JSON.stringify(res.body);
    expect(text).not.toContain('password');
    expect(text).not.toContain('$argon2');
  });

  it.each([
    ['senha errada', 'admin@test.com', 'Errada12345'],
    ['email inexistente', 'ninguem@test.com', TEST_PASSWORD],
  ])('login com %s retorna o mesmo 401', async (_, email, password) => {
    const res = await apiClient(ctx.baseUrl)('POST', '/auth/login', {
      email,
      password,
    });

    expect(res).toEqual({
      status: 401,
      body: {
        statusCode: 401,
        message: 'Email ou senha inválidos.',
        error: 'UNAUTHORIZED',
      },
    });
  });

  it('usuário inativo não faz login e perde o acesso com token já emitido', async () => {
    const token = await login(ctx.baseUrl, 'user@test.com');
    await ctx.prisma.user.update({
      where: { email: 'user@test.com' },
      data: { isActive: false },
    });

    const loginRes = await apiClient(ctx.baseUrl)('POST', '/auth/login', {
      email: 'user@test.com',
      password: TEST_PASSWORD,
    });
    const ordersRes = await apiClient(ctx.baseUrl, token)('GET', '/orders');

    expect(loginRes.status).toBe(401);
    expect(ordersRes.status).toBe(401);
  });

  it('rotas protegidas exigem token válido', async () => {
    expect((await apiClient(ctx.baseUrl)('GET', '/orders')).status).toBe(401);
    expect(
      (await apiClient(ctx.baseUrl, 'token.invalido.x')('GET', '/orders'))
        .status,
    ).toBe(401);
  });

  it('health é público', async () => {
    const res = await apiClient(ctx.baseUrl)('GET', '/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'Healthy' });
  });

  describe('POST /users', () => {
    const newUser = {
      name: 'Novo Usuário',
      email: 'Novo@Test.com',
      password: 'NovaSenha123',
      role: 'USER',
    };

    it('ADMIN cria usuário com senha em hash Argon2id', async () => {
      const token = await login(ctx.baseUrl, 'admin@test.com');

      const res = await apiClient(ctx.baseUrl, token)(
        'POST',
        '/users',
        newUser,
      );

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        email: 'novo@test.com',
        role: 'USER',
        isActive: true,
      });
      expect(JSON.stringify(res.body)).not.toContain('NovaSenha123');

      const saved = await ctx.prisma.user.findUniqueOrThrow({
        where: { email: 'novo@test.com' },
      });
      expect(saved.passwordHash).toMatch(/^\$argon2id\$/);
      await expect(
        login(ctx.baseUrl, 'novo@test.com', 'NovaSenha123'),
      ).resolves.toEqual(expect.any(String));
    });

    it('USER recebe 403 e nada é criado', async () => {
      const token = await login(ctx.baseUrl, 'user@test.com');

      const res = await apiClient(ctx.baseUrl, token)(
        'POST',
        '/users',
        newUser,
      );

      expect(res.status).toBe(403);
      expect(await ctx.prisma.user.count()).toBe(2);
    });

    it('email duplicado (ignorando maiúsculas) retorna 409', async () => {
      const token = await login(ctx.baseUrl, 'admin@test.com');

      const res = await apiClient(ctx.baseUrl, token)('POST', '/users', {
        ...newUser,
        email: 'USER@test.com',
      });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('Já existe um usuário com este email.');
    });
  });
});
