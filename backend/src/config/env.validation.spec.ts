import { describe, expect, it } from 'vitest';
import { Environment, validateEnv } from './env.validation.js';

const validEnv = {
  NODE_ENV: 'production',
  PORT: '8080',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/naporta?schema=public',
  JWT_SECRET: 'a'.repeat(32),
  JWT_EXPIRES_IN: '8h',
};

describe('validateEnv', () => {
  it('aceita uma configuração válida e converte PORT para número', () => {
    const env = validateEnv(validEnv);

    expect(env.NODE_ENV).toBe(Environment.Production);
    expect(env.PORT).toBe(8080);
    expect(env.JWT_EXPIRES_IN).toBe('8h');
  });

  it('aplica os valores padrão de NODE_ENV, PORT e JWT_EXPIRES_IN', () => {
    const env = validateEnv({
      DATABASE_URL: validEnv.DATABASE_URL,
      JWT_SECRET: validEnv.JWT_SECRET,
    });

    expect(env.NODE_ENV).toBe(Environment.Development);
    expect(env.PORT).toBe(3000);
    expect(env.JWT_EXPIRES_IN).toBe('5h');
  });

  it.each(['DATABASE_URL', 'JWT_SECRET'])(
    'rejeita quando %s não é informada',
    (name) => {
      const env: Record<string, unknown> = { ...validEnv };
      delete env[name];

      expect(() => validateEnv(env)).toThrow(name);
    },
  );

  it('rejeita NODE_ENV fora dos valores permitidos', () => {
    expect(() => validateEnv({ ...validEnv, NODE_ENV: 'staging' })).toThrow(
      'NODE_ENV',
    );
  });

  it.each(['0', '70000', 'abc'])('rejeita PORT inválida %j', (port) => {
    expect(() => validateEnv({ ...validEnv, PORT: port })).toThrow('PORT');
  });

  it('rejeita DATABASE_URL que não seja PostgreSQL', () => {
    expect(() =>
      validateEnv({ ...validEnv, DATABASE_URL: 'mysql://localhost/db' }),
    ).toThrow('DATABASE_URL');
  });

  it('rejeita JWT_SECRET com menos de 32 caracteres', () => {
    expect(() =>
      validateEnv({ ...validEnv, JWT_SECRET: 'a'.repeat(31) }),
    ).toThrow('JWT_SECRET');
  });

  it.each(['4h', '299m', '17999s', '5', 'cinco horas'])(
    'rejeita JWT_EXPIRES_IN %j (menor que 5h ou formato inválido)',
    (expiresIn) => {
      expect(() =>
        validateEnv({ ...validEnv, JWT_EXPIRES_IN: expiresIn }),
      ).toThrow('JWT_EXPIRES_IN');
    },
  );

  it.each(['5h', '300m', '18000s', '1d'])(
    'aceita JWT_EXPIRES_IN %j (igual ou maior que 5h)',
    (expiresIn) => {
      expect(validateEnv({ ...validEnv, JWT_EXPIRES_IN: expiresIn })).toEqual(
        expect.objectContaining({ JWT_EXPIRES_IN: expiresIn }),
      );
    },
  );

  it('não inclui o valor de JWT_SECRET na mensagem de erro', () => {
    const secret = 'segredo-curto';
    let message = '';
    try {
      validateEnv({ ...validEnv, JWT_SECRET: secret });
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toContain('JWT_SECRET');
    expect(message).not.toContain(secret);
  });
});
