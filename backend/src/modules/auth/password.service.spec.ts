import { describe, expect, it } from 'vitest';
import { BCRYPT_SALT_ROUNDS, PasswordService } from './password.service.js';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('gera hash bcrypt sem conter a senha e verifica corretamente', async () => {
    const hash = await service.hash('SenhaForte123');

    expect(hash).toMatch(new RegExp(`^\\$2b\\$${BCRYPT_SALT_ROUNDS}\\$`));
    expect(hash).not.toContain('SenhaForte123');
    await expect(service.verify('SenhaForte123', hash)).resolves.toBe(true);
    await expect(service.verify('SenhaErrada123', hash)).resolves.toBe(false);
  });

  it('gera hashes diferentes para a mesma senha (salt aleatório)', async () => {
    const [a, b] = await Promise.all([
      service.hash('SenhaForte123'),
      service.hash('SenhaForte123'),
    ]);

    expect(a).not.toBe(b);
  });
});
