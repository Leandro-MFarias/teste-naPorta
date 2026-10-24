import { applyDecorators, SetMetadata } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Role } from '../../generated/prisma/enums.js';
import { ErrorResponseDto } from '../dto/error-response.dto.js';

export const ROLES_KEY = 'roles';

/**
 * Documenta a rota como protegida por JWT e, se `roles` for informado,
 * restringe o acesso a esses papéis. Sem `roles`, qualquer usuário
 * autenticado acessa. A autenticação em si é global (JwtAuthGuard).
 *
 * Ex.: `@Auth(Role.ADMIN)` ou `@Auth()` para ADMIN e USER.
 */
export function Auth(...roles: Role[]): MethodDecorator & ClassDecorator {
  const access = roles.length > 0 ? roles.join(', ') : 'ADMIN, USER';

  return applyDecorators(
    SetMetadata(ROLES_KEY, roles),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({
      description: 'Token ausente, inválido ou expirado.',
      type: ErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description: `Acesso permitido apenas para: ${access}.`,
      type: ErrorResponseDto,
    }),
  );
}
