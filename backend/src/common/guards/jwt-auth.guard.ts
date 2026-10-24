import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ALLOW_PENDING_PASSWORD_CHANGE_KEY } from '../decorators/allow-pending-password-change.decorator.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import type { JwtPayload } from '../interfaces/authenticated-user.interface.js';

export const INVALID_TOKEN_MESSAGE =
  'Token de acesso ausente, inválido ou expirado.';
export const PASSWORD_CHANGE_REQUIRED_MESSAGE =
  'Troque a senha temporária antes de continuar.';

/**
 * Guard global: toda rota exige `Authorization: Bearer <token>`, exceto as
 * marcadas com @Public(). Além da assinatura e validade do token, confirma
 * que o usuário ainda existe e está ativo, e usa o papel atual do banco;
 * assim desativação e troca de papel valem antes do token expirar.
 *
 * Primeiro acesso: enquanto o usuário não trocar a senha temporária
 * (mustChangePassword), só as rotas com @AllowPendingPasswordChange()
 * são liberadas; as demais retornam 403.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      targets,
    );
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException(INVALID_TOKEN_MESSAGE);
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException(INVALID_TOKEN_MESSAGE);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
      },
    });
    if (!user?.isActive) {
      throw new UnauthorizedException(INVALID_TOKEN_MESSAGE);
    }

    if (
      user.mustChangePassword &&
      !this.reflector.getAllAndOverride<boolean>(
        ALLOW_PENDING_PASSWORD_CHANGE_KEY,
        targets,
      )
    ) {
      throw new ForbiddenException(PASSWORD_CHANGE_REQUIRED_MESSAGE);
    }

    request.user = { id: user.id, role: user.role };
    return true;
  }
}

function extractBearerToken(request: Request): string | undefined {
  const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
  return scheme?.toLowerCase() === 'bearer' && token ? token : undefined;
}
