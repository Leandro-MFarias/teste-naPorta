import type { ApiErrorResponse } from './types';

/** Erro HTTP da API, com as mensagens já normalizadas em lista. */
export class ApiError extends Error {
  readonly status: number;
  readonly messages: string[];

  constructor(status: number, messages: string[]) {
    super(messages.join('; '));
    this.name = 'ApiError';
    this.status = status;
    this.messages = messages;
  }

  static fromBody(status: number, body: unknown): ApiError {
    const message = (body as Partial<ApiErrorResponse> | null)?.message;
    const messages = Array.isArray(message)
      ? message
      : typeof message === 'string'
        ? [message]
        : [defaultMessage(status)];
    return new ApiError(status, messages);
  }
}

export const API_UNAVAILABLE_MESSAGE =
  'Não foi possível conectar à API. Tente novamente em instantes.';

function defaultMessage(status: number): string {
  if (status >= 500) {
    return 'Erro inesperado no servidor. Tente novamente.';
  }
  return `A requisição falhou (HTTP ${status}).`;
}
