import { describe, expect, it } from 'vitest';
import {
  isValidCnpj,
  isValidCpf,
  normalizeDocument,
  parseDocument,
} from './document.js';

describe('normalizeDocument', () => {
  it('remove pontuação e espaços e converte para maiúsculas', () => {
    expect(normalizeDocument(' 529.982.247-25 ')).toBe('52998224725');
    expect(normalizeDocument('11.222.333/0001-81')).toBe('11222333000181');
    expect(normalizeDocument('12.abc.345/01de-35')).toBe('12ABC34501DE35');
  });
});

describe('isValidCpf', () => {
  it.each(['52998224725', '11144477735', '39053344705'])(
    'aceita CPF válido %s',
    (cpf) => {
      expect(isValidCpf(cpf)).toBe(true);
    },
  );

  it.each([
    ['dígito verificador errado', '52998224724'],
    ['sequência repetida', '11111111111'],
    ['tamanho errado', '5299822472'],
    ['com letra', '5299822472A'],
    ['não normalizado', '529.982.247-25'],
  ])('rejeita %s', (_, cpf) => {
    expect(isValidCpf(cpf)).toBe(false);
  });
});

describe('isValidCnpj', () => {
  it.each([
    ['numérico', '11222333000181'],
    ['numérico', '11444777000161'],
    ['alfanumérico (exemplo da Receita Federal)', '12ABC34501DE35'],
  ])('aceita CNPJ %s', (_, cnpj) => {
    expect(isValidCnpj(cnpj)).toBe(true);
  });

  it.each([
    ['dígito verificador errado', '11222333000182'],
    ['alfanumérico com dígito errado', '12ABC34501DE36'],
    ['sequência repetida', '00000000000000'],
    ['letra nos dígitos verificadores', '12ABC34501DE3A'],
    ['minúsculas (não normalizado)', '12abc34501de35'],
    ['tamanho errado', '1122233300018'],
  ])('rejeita %s', (_, cnpj) => {
    expect(isValidCnpj(cnpj)).toBe(false);
  });
});

describe('parseDocument', () => {
  it('identifica CPF como PERSON', () => {
    expect(parseDocument('529.982.247-25')).toEqual({
      value: '52998224725',
      type: 'PERSON',
    });
  });

  it('identifica CNPJ numérico e alfanumérico como COMPANY', () => {
    expect(parseDocument('11.222.333/0001-81')).toEqual({
      value: '11222333000181',
      type: 'COMPANY',
    });
    expect(parseDocument('12.abc.345/01de-35')).toEqual({
      value: '12ABC34501DE35',
      type: 'COMPANY',
    });
  });

  it.each(['529.982.247-24', '11.222.333/0001-82', '123', ''])(
    'retorna null para documento inválido %j',
    (input) => {
      expect(parseDocument(input)).toBeNull();
    },
  );
});
