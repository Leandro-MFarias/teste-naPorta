import type { Role } from '../../../generated/prisma/enums.js';

/** Dados públicos de um usuário (seção 9.2). Nunca contém senha ou hash. */
export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
