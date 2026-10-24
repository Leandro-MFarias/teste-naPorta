import type { Role } from '../../../generated/prisma/enums.js';

/** Request de criação de usuário (seção 9.1). Exclusivo para ADMIN. */
export interface UserRequest {
  name: string;
  email: string;
  password: string;
  role: Role;
}
