import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Role } from '../../generated/prisma/enums.js';
import { ROLES_KEY } from '../decorators/auth.decorator.js';

export const FORBIDDEN_MESSAGE =
  'Você não tem permissão para acessar este recurso.';

/**
 * Guard global executado após o JwtAuthGuard: se a rota declara papéis com
 * @Auth(...roles), o usuário autenticado precisa ter um deles.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!roles?.length) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<Request>();
    if (!user || !roles.includes(user.role)) {
      throw new ForbiddenException(FORBIDDEN_MESSAGE);
    }
    return true;
  }
}
