import { Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';

export const BCRYPT_SALT_ROUNDS = 12;

/** Hash e verificação de senhas com bcrypt. */
@Injectable()
export class PasswordService {
  hash(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  }

  verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
