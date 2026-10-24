import type { Role } from '../../../generated/prisma/enums.js';

/** Dados públicos de um usuário (seção 9.2). Nunca contém senha ou hash. */
export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  /** true enquanto a senha temporária não for trocada (primeiro acesso). */
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
}
