/**
 * Validação de CPF/CNPJ com as mesmas regras do backend
 * (backend/src/modules/customers/document.ts), para avisar o usuário antes
 * do envio. A API continua sendo a fonte da verdade.
 */

export function normalizeDocument(input: string): string {
  return input.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}

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

/** CNPJ numérico ou alfanumérico (12 caracteres [0-9A-Z] + 2 dígitos). */
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

export function isValidDocument(input: string): boolean {
  const value = normalizeDocument(input);
  return isValidCpf(value) || isValidCnpj(value);
}

function allSameCharacter(value: string): boolean {
  return [...value].every((char) => char === value[0]);
}
