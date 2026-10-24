import { randomInt } from 'node:crypto';

// Sem caracteres ambíguos (0/O, 1/l/I), já que a senha é lida no email e
// digitada pelo usuário.
const LETTERS = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const ALPHABET = LETTERS + DIGITS;

export const TEMPORARY_PASSWORD_LENGTH = 16;

/**
 * Senha temporária aleatória (CSPRNG), dentro da política de senha: 16
 * caracteres com pelo menos uma letra e um número (~94 bits de entropia).
 */
export function generateTemporaryPassword(
  length = TEMPORARY_PASSWORD_LENGTH,
): string {
  const chars = [
    LETTERS[randomInt(LETTERS.length)],
    DIGITS[randomInt(DIGITS.length)],
    ...Array.from(
      { length: length - 2 },
      () => ALPHABET[randomInt(ALPHABET.length)],
    ),
  ];
  // Fisher-Yates: a letra e o número garantidos não ficam sempre no início.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
