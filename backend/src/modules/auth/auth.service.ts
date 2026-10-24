import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { JwtPayload } from '../../common/interfaces/authenticated-user.interface.js';
import { parseDurationToSeconds } from '../../config/duration.js';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { toUserResponse } from '../users/user.mapper.js';
import type {
  LoginRequest,
  LoginResponse,
} from './interfaces/login.interface.js';
import { PasswordService } from './password.service.js';

export const INVALID_CREDENTIALS_MESSAGE = 'Email ou senha inválidos.';

// Hash bcrypt de uma senha aleatória, usado quando o email não existe para
// que a resposta leve o mesmo tempo e não revele quais emails existem.
const DUMMY_PASSWORD_HASH =
  '$2b$12$jHJasYphTSdzdguSQcjC3uCzmmr3gBAwAE7Tscc4QjRGVvWuGQmeu';

@Injectable()
export class AuthService {
  private readonly expiresIn: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly passwords: PasswordService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    // Formato já validado na inicialização (env.validation.ts).
    this.expiresIn = parseDurationToSeconds(
      config.get('JWT_EXPIRES_IN', { infer: true }),
    )!;
  }

  /**
   * Autentica por email e senha. Email inexistente, senha incorreta e
   * usuário inativo retornam o mesmo 401, sem indicar qual falhou.
   */
  async login({ email, password }: LoginRequest): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    const passwordMatches = await this.passwords.verify(
      password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );
    if (!user || !passwordMatches || !user.isActive) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const payload: JwtPayload = { sub: user.id, role: user.role };
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: this.expiresIn,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.expiresIn,
      user: toUserResponse(user),
    };
  }
}
