import { SetMetadata } from '@nestjs/common';

export const ALLOW_PENDING_PASSWORD_CHANGE_KEY = 'allowPendingPasswordChange';

/**
 * Libera a rota para usuários que ainda não trocaram a senha temporária
 * (mustChangePassword). As demais rotas autenticadas retornam 403 até a
 * troca. Usado em GET /auth/me e POST /auth/change-password.
 */
export const AllowPendingPasswordChange = (): MethodDecorator &
  ClassDecorator => SetMetadata(ALLOW_PENDING_PASSWORD_CHANGE_KEY, true);
