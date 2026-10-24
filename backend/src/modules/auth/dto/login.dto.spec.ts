import { describe, expect, it } from 'vitest';
import { validateDto } from '../../../../test/validation.js';
import { LoginDto } from './login.dto.js';

describe('LoginDto', () => {
  it('normaliza o email e não aplica política de senha', async () => {
    const { dto, errors } = await validateDto(LoginDto, {
      email: ' Maria.Souza@Example.com ',
      password: 'x',
    });

    expect(errors).toEqual([]);
    expect(dto?.email).toBe('maria.souza@example.com');
  });

  it('rejeita email inválido e senha vazia', async () => {
    const { errors } = await validateDto(LoginDto, {
      email: 'invalido',
      password: '',
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        'email deve ser um email válido',
        'password é obrigatório',
      ]),
    );
  });
});
