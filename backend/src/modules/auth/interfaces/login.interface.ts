import type { UserResponse } from '../../users/interfaces/user-response.interface.js';

/** Request de POST /auth/login (seção 9.3). */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Response de POST /auth/login (seção 9.3). */
export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  /** Validade do token em segundos. */
  expiresIn: number;
  user: UserResponse;
}
