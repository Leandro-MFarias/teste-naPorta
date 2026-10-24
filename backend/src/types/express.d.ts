import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface.js';

declare global {
  namespace Express {
    interface Request {
      /** Definido pelo JwtAuthGuard nas rotas protegidas. */
      user?: AuthenticatedUser;
    }
  }
}

export {};
