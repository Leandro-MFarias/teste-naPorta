import { describe, expect, it } from 'vitest';
import { validateDto } from '../../../../test/validation.js';
import { CreateUserDto } from './create-user.dto.js';

const valid = {
  name: 'Maria Souza',
  email: 'maria.souza@example.com',
  password: 'SenhaForte123',
  role: 'USER',
};

describe('CreateUserDto', () => {
  it('aceita um usuário válido', async () => {
    const { dto, errors } = await validateDto(CreateUserDto, valid);

    expect(errors).toEqual([]);
    expect(dto).toBeInstanceOf(CreateUserDto);
  });

  it('normaliza email (trim e minúsculas) e nome (trim)', async () => {
    const { dto } = await validateDto(CreateUserDto, {
      ...valid,
      name: '  Maria Souza  ',
      email: '  Maria.Souza@Example.COM ',
    });

    expect(dto?.name).toBe('Maria Souza');
    expect(dto?.email).toBe('maria.souza@example.com');
  });

  it.each([
    ['curta', 'Ab1'],
    ['sem número', 'SenhaSemNumero'],
    ['sem letra', '1234567890'],
    ['acima de 72 caracteres', `a1${'x'.repeat(71)}`],
  ])('rejeita senha %s', async (_, password) => {
    const { errors } = await validateDto(CreateUserDto, { ...valid, password });

    expect(errors.some((m) => m.startsWith('password'))).toBe(true);
  });

  it('rejeita email inválido e papel inexistente', async () => {
    const { errors } = await validateDto(CreateUserDto, {
      ...valid,
      email: 'nao-e-email',
      role: 'SUPERADMIN',
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        'email deve ser um email válido',
        'role deve ser ADMIN ou USER',
      ]),
    );
  });

  it('rejeita nome só com espaços', async () => {
    const { errors } = await validateDto(CreateUserDto, {
      ...valid,
      name: '   ',
    });

    expect(errors).toContain('name é obrigatório');
  });

  it('rejeita campos não declarados, como passwordHash ou isActive', async () => {
    const { errors } = await validateDto(CreateUserDto, {
      ...valid,
      passwordHash: 'x',
      isActive: false,
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        'property passwordHash should not exist',
        'property isActive should not exist',
      ]),
    );
  });
});
