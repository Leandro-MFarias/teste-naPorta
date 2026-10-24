import type { User } from '../../generated/prisma/client.js';
import type { UserResponse } from './interfaces/user-response.interface.js';

/**
 * Monta explicitamente o objeto público do usuário. Campos novos do
 * modelo só aparecem na API se forem adicionados aqui.
 */
export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
