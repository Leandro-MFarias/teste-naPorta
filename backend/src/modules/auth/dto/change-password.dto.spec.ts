import { describe, expect, it } from 'vitest';
import { validateDto } from '../../../../test/validation.js';
import { ChangePasswordDto } from './change-password.dto.js';

const valid = {
  currentPassword: 'Tmp7hQk2xZp9mWv4',
  newPassword: 'MinhaSenha123',
};

describe('ChangePasswordDto', () => {
  it('aceita senha atual e nova senha dentro da política', async () => {
    const { errors } = await validateDto(ChangePasswordDto, valid);

    expect(errors).toEqual([]);
  });

  it.each([
    ['curta', 'Ab1'],
    ['sem número', 'SenhaSemNumero'],
    ['sem letra', '1234567890'],
    ['acima de 128 caracteres', `a1${'x'.repeat(127)}`],
  ])('rejeita nova senha %s', async (_, newPassword) => {
    const { errors } = await validateDto(ChangePasswordDto, {
      ...valid,
      newPassword,
    });

    expect(errors.some((m) => m.startsWith('newPassword'))).toBe(true);
  });

  it('exige a senha atual e rejeita campos extras', async () => {
    const { errors } = await validateDto(ChangePasswordDto, {
      newPassword: valid.newPassword,
      userId: 'x',
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        'currentPassword é obrigatório',
        'property userId should not exist',
      ]),
    );
  });
});
