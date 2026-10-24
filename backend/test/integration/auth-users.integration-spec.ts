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
    ctx.mail.reset();
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

  describe('POST /users e primeiro acesso', () => {
    const newUser = {
      name: 'Novo Usuário',
      email: 'Novo@Test.com',
      role: 'USER',
    };

    function temporaryPasswordFrom(text: string): string {
      const match = /Senha temporária: (\S+)/.exec(text);
      if (!match) {
        throw new Error('Senha temporária não encontrada no email');
      }
      return match[1];
    }

    it('ADMIN cria usuário: senha temporária só no email, hash no banco', async () => {
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
        mustChangePassword: true,
      });

      expect(ctx.mail.sent).toHaveLength(1);
      const [welcome] = ctx.mail.sent;
      expect(welcome.to).toBe('novo@test.com');
      expect(welcome.text).toContain('http://frontend.test/login');
      const temporaryPassword = temporaryPasswordFrom(welcome.text);
      expect(welcome.html).toContain(temporaryPassword);
      expect(JSON.stringify(res.body)).not.toContain(temporaryPassword);

      const saved = await ctx.prisma.user.findUniqueOrThrow({
        where: { email: 'novo@test.com' },
      });
      expect(saved.passwordHash).toMatch(/^\$argon2id\$/);
      expect(saved.mustChangePassword).toBe(true);
    });

    it('não aceita senha no body', async () => {
      const token = await login(ctx.baseUrl, 'admin@test.com');

      const res = await apiClient(ctx.baseUrl, token)('POST', '/users', {
        ...newUser,
        password: 'NovaSenha123',
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('property password should not exist');
      expect(ctx.mail.sent).toHaveLength(0);
    });

    it('primeiro login: só /auth/me e troca de senha até trocar a temporária', async () => {
      const adminToken = await login(ctx.baseUrl, 'admin@test.com');
      await apiClient(ctx.baseUrl, adminToken)('POST', '/users', newUser);
      const temporaryPassword = temporaryPasswordFrom(ctx.mail.sent[0].text);

      const loginRes = await apiClient(ctx.baseUrl)<{
        data: { accessToken: string; user: { mustChangePassword: boolean } };
      }>('POST', '/auth/login', {
        email: 'novo@test.com',
        password: temporaryPassword,
      });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.user.mustChangePassword).toBe(true);
      const api = apiClient(ctx.baseUrl, loginRes.body.data.accessToken);

      expect(await api('GET', '/orders')).toEqual({
        status: 403,
        body: {
          statusCode: 403,
          message: 'Troque a senha temporária antes de continuar.',
          error: 'FORBIDDEN',
        },
      });
      const me = await api('GET', '/auth/me');
      expect(me.status).toBe(200);
      expect(me.body.data).toMatchObject({
        email: 'novo@test.com',
        mustChangePassword: true,
      });

      const wrong = await api('POST', '/auth/change-password', {
        currentPassword: 'Errada12345',
        newPassword: 'MinhaSenha123',
      });
      expect(wrong.status).toBe(400);
      expect(wrong.body.message).toBe('Senha atual incorreta.');

      const weak = await api('POST', '/auth/change-password', {
        currentPassword: temporaryPassword,
        newPassword: 'curta',
      });
      expect(weak.status).toBe(400);

      const changed = await api('POST', '/auth/change-password', {
        currentPassword: temporaryPassword,
        newPassword: 'MinhaSenha123',
      });
      expect(changed.status).toBe(200);
      expect(changed.body.data.mustChangePassword).toBe(false);
      expect(JSON.stringify(changed.body)).not.toContain('MinhaSenha123');

      // O mesmo token passa a valer nas demais rotas.
      expect((await api('GET', '/orders')).status).toBe(200);
      await expect(
        login(ctx.baseUrl, 'novo@test.com', temporaryPassword),
      ).rejects.toThrow();
      await expect(
        login(ctx.baseUrl, 'novo@test.com', 'MinhaSenha123'),
      ).resolves.toEqual(expect.any(String));
    });

    it('troca de senha exige token', async () => {
      const res = await apiClient(ctx.baseUrl)(
        'POST',
        '/auth/change-password',
        {
          currentPassword: TEST_PASSWORD,
          newPassword: 'MinhaSenha123',
        },
      );

      expect(res.status).toBe(401);
    });

    it('falha no envio do email cancela o cadastro com 503', async () => {
      const token = await login(ctx.baseUrl, 'admin@test.com');
      ctx.mail.failWith = new Error('SMTP indisponível');

      const res = await apiClient(ctx.baseUrl, token)(
        'POST',
        '/users',
        newUser,
      );

      expect(res).toEqual({
        status: 503,
        body: {
          statusCode: 503,
          message:
            'Não foi possível enviar o email de boas-vindas. O usuário não foi cadastrado; tente novamente.',
          error: 'SERVICE_UNAVAILABLE',
        },
      });
      await expect(
        ctx.prisma.user.findUnique({ where: { email: 'novo@test.com' } }),
      ).resolves.toBeNull();
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
      expect(ctx.mail.sent).toHaveLength(0);
    });

    it('email duplicado (ignorando maiúsculas) retorna 409 sem enviar email', async () => {
      const token = await login(ctx.baseUrl, 'admin@test.com');

      const res = await apiClient(ctx.baseUrl, token)('POST', '/users', {
        ...newUser,
        email: 'USER@test.com',
      });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('Já existe um usuário com este email.');
      expect(ctx.mail.sent).toHaveLength(0);
    });
  });
});
