import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PasswordService } from '../auth/password.service.js';
import type { UserRequest } from './interfaces/user-request.interface.js';
import type { UserResponse } from './interfaces/user-response.interface.js';
import { toUserResponse } from './user.mapper.js';

export const EMAIL_IN_USE_MESSAGE = 'Já existe um usuário com este email.';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  /**
   * Cria um usuário ativo com a senha transformada em hash. O email chega
   * normalizado pelo DTO; a unicidade é garantida pelo índice do banco,
   * o que também cobre requisições concorrentes.
   */
  async create({
    name,
    email,
    password,
    role,
  }: UserRequest): Promise<UserResponse> {
    const passwordHash = await this.passwords.hash(password);

    try {
      const user = await this.prisma.user.create({
        data: { name, email, passwordHash, role },
      });
      return toUserResponse(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(EMAIL_IN_USE_MESSAGE);
      }
      throw error;
    }
  }
}
