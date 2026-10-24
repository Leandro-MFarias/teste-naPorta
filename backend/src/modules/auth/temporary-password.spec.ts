import { describe, expect, it } from 'vitest';
import {
  PASSWORD_POLICY_PATTERN,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../users/dto/create-user.dto.js';
import {
  generateTemporaryPassword,
  TEMPORARY_PASSWORD_LENGTH,
} from './temporary-password.js';

describe('generateTemporaryPassword', () => {
  const samples = Array.from({ length: 500 }, () =>
    generateTemporaryPassword(),
  );

  it('gera 16 caracteres sem caracteres ambíguos', () => {
    for (const password of samples) {
      expect(password).toHaveLength(TEMPORARY_PASSWORD_LENGTH);
      expect(password).toMatch(/^[a-km-zA-HJ-NP-Z2-9]+$/);
    }
  });

  it('sempre respeita a política de senha (letra e número)', () => {
    for (const password of samples) {
      expect(password).toMatch(PASSWORD_POLICY_PATTERN);
      expect(password.length).toBeGreaterThanOrEqual(PASSWORD_MIN_LENGTH);
      expect(password.length).toBeLessThanOrEqual(PASSWORD_MAX_LENGTH);
    }
  });

  it('não repete senhas', () => {
    expect(new Set(samples).size).toBe(samples.length);
  });
});
