import { describe, expect, it } from 'vitest';
import { PasswordService } from './password.service.js';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('gera hash Argon2id sem conter a senha e verifica corretamente', async () => {
    const hash = await service.hash('SenhaForte123');

    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,p=1,t=2\$/);
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

  it('não trunca senhas longas (diferente do limite de 72 bytes do bcrypt)', async () => {
    const prefix = 'á'.repeat(40); // 80 bytes em UTF-8
    const hash = await service.hash(`${prefix}fim1`);

    await expect(service.verify(`${prefix}outro2`, hash)).resolves.toBe(false);
  });

  it('retorna false para hash malformado em vez de lançar erro', async () => {
    await expect(service.verify('SenhaForte123', 'nao-e-hash')).resolves.toBe(
      false,
    );
  });
});
