import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { JwtPayload } from '../../common/interfaces/authenticated-user.interface.js';
import { parseDurationToSeconds } from '../../config/duration.js';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { UserResponse } from '../users/interfaces/user-response.interface.js';
import { toUserResponse } from '../users/user.mapper.js';
import type { ChangePasswordRequest } from './interfaces/change-password.interface.js';
import type {
  LoginRequest,
  LoginResponse,
} from './interfaces/login.interface.js';
import { PasswordService } from './password.service.js';

export const INVALID_CREDENTIALS_MESSAGE = 'Email ou senha inválidos.';
export const WRONG_CURRENT_PASSWORD_MESSAGE = 'Senha atual incorreta.';
export const SAME_PASSWORD_MESSAGE =
  'A nova senha deve ser diferente da senha atual.';

// Hash Argon2id (mesmos parâmetros do PasswordService) de uma senha
// aleatória, usado quando o email não existe para que a resposta leve o
// mesmo tempo e não revele quais emails existem.
const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=19456,p=1,t=2$z9VnnvK61SKsaYpcA1qsoQ$+4c+r7DKYG7oV3PlFHYtWTVk5D8rHUvBYu6MA1g70io';

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

  /** Dados do usuário autenticado (inclui mustChangePassword). */
  async me(userId: string): Promise<UserResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return toUserResponse(user);
  }

  /**
   * Troca a senha do usuário autenticado e encerra o estado de primeiro
   * acesso (mustChangePassword = false). Exige a senha atual, que no
   * primeiro acesso é a temporária recebida por email.
   */
  async changePassword(
    userId: string,
    { currentPassword, newPassword }: ChangePasswordRequest,
  ): Promise<UserResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    if (!(await this.passwords.verify(currentPassword, user.passwordHash))) {
      throw new BadRequestException(WRONG_CURRENT_PASSWORD_MESSAGE);
    }
    if (newPassword === currentPassword) {
      throw new BadRequestException(SAME_PASSWORD_MESSAGE);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await this.passwords.hash(newPassword),
        mustChangePassword: false,
      },
    });
    return toUserResponse(updated);
  }
}
