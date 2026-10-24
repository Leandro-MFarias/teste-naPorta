import type { Role } from '../../generated/prisma/enums.js';

/** Payload assinado no JWT: apenas o necessário (seção 8.1). */
export interface JwtPayload {
  sub: string;
  role: Role;
}

/** Usuário autenticado anexado à requisição pelo JwtAuthGuard. */
export interface AuthenticatedUser {
  id: string;
  role: Role;
}
