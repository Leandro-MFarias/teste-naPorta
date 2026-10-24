import type { CustomerType } from '../../generated/prisma/enums.js';

export interface ParsedDocument {
  /** Somente dígitos (CPF) ou 12 alfanuméricos + 2 dígitos (CNPJ). */
  value: string;
  type: CustomerType;
}

/**
 * Remove pontuação e espaços e converte letras para maiúsculas
 * (CNPJ alfanumérico). Ex.: "12.abc.345/01de-35" -> "12ABC34501DE35".
 */
export function normalizeDocument(input: string): string {
  return input.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}

/**
 * Normaliza e valida o documento, identificando o tipo do cliente:
 * CPF válido -> PERSON; CNPJ válido -> COMPANY. Retorna null se não for
 * nenhum dos dois.
 */
export function parseDocument(input: string): ParsedDocument | null {
  const value = normalizeDocument(input);
  if (isValidCpf(value)) {
    return { value, type: 'PERSON' };
  }
  if (isValidCnpj(value)) {
    return { value, type: 'COMPANY' };
  }
  return null;
}

/** Valida CPF já normalizado (11 dígitos), incluindo dígitos verificadores. */
export function isValidCpf(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || allSameCharacter(cpf)) {
    return false;
  }

  const digits = [...cpf].map(Number);
  const checkDigit = (length: number): number => {
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += digits[i] * (length + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return checkDigit(9) === digits[9] && checkDigit(10) === digits[10];
}

const CNPJ_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/**
 * Valida CNPJ já normalizado, numérico ou alfanumérico (Receita Federal,
 * a partir de julho de 2026): 12 caracteres [0-9A-Z] + 2 dígitos
 * verificadores. Cada caractere vale seu código ASCII menos 48, o que
 * mantém o cálculo tradicional para CNPJs só com dígitos.
 */
export function isValidCnpj(cnpj: string): boolean {
  if (!/^[0-9A-Z]{12}\d{2}$/.test(cnpj) || allSameCharacter(cnpj)) {
    return false;
  }

  const values = [...cnpj].map((char) => char.charCodeAt(0) - 48);
  const checkDigit = (length: number): number => {
    const weights = CNPJ_WEIGHTS.slice(CNPJ_WEIGHTS.length - length);
    const sum = weights.reduce((acc, weight, i) => acc + values[i] * weight, 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  return checkDigit(12) === values[12] && checkDigit(13) === values[13];
}

// Sequências repetidas (ex.: 111.111.111-11) passam no cálculo, mas não
// são documentos válidos.
function allSameCharacter(value: string): boolean {
  return [...value].every((char) => char === value[0]);
}
