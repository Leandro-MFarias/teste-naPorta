import type { Role } from '../../../generated/prisma/enums.js';

/**
 * Request de criação de usuário (seção 9.1). Exclusivo para ADMIN. Não há
 * senha: ela é gerada aleatoriamente e enviada ao email do usuário.
 */
export interface UserRequest {
  name: string;
  email: string;
  role: Role;
}
