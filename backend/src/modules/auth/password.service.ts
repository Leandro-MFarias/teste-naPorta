import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';

/**
 * Parâmetros do Argon2id recomendados pela OWASP (Password Storage Cheat
 * Sheet): 19 MiB de memória, 2 iterações e paralelismo 1. Ficam gravados no
 * próprio hash, então aumentá-los no futuro não invalida hashes antigos.
 */
export const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

/** Hash e verificação de senhas com Argon2id. */
@Injectable()
export class PasswordService {
  hash(password: string): Promise<string> {
    return argon2.hash(password, ARGON2_OPTIONS);
  }

  /** Retorna false (sem lançar erro) se o hash estiver malformado. */
  async verify(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }
}
