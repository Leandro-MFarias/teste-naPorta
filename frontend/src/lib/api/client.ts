import 'server-only';
import { redirect } from 'next/navigation';
import { getToken } from '../session';
import { API_UNAVAILABLE_MESSAGE, ApiError } from './errors';

const API_URL = (process.env.API_URL ?? 'http://localhost:3333').replace(
  /\/$/,
  '',
);

/** Mensagem do backend quando a senha temporária ainda não foi trocada. */
const PASSWORD_CHANGE_REQUIRED =
  'Troque a senha temporária antes de continuar.';

interface ApiRequest {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  /** false nas rotas públicas (login): 401 vira erro, não fim de sessão. */
  auth?: boolean;
}

/**
 * Chama a API com o token da sessão. Sessão expirada (401) leva a /sair,
 * que apaga o cookie; senha temporária pendente (403) leva ao primeiro
 * acesso. Demais erros viram ApiError.
 */
export async function apiFetch<T>(
  path: string,
  { method = 'GET', body, query, auth = true }: ApiRequest = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (auth) {
    const token = await getToken();
    if (!token) {
      redirect('/login');
    }
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}${toQueryString(query)}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(503, [API_UNAVAILABLE_MESSAGE]);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload: unknown = await response.json().catch(() => null);
  if (response.ok) {
    return payload as T;
  }

  const error = ApiError.fromBody(response.status, payload);
  if (auth && error.status === 401) {
    redirect('/sair?motivo=sessao-expirada');
  }
  if (
    auth &&
    error.status === 403 &&
    error.messages.includes(PASSWORD_CHANGE_REQUIRED)
  ) {
    redirect('/primeiro-acesso');
  }
  throw error;
}

function toQueryString(query: ApiRequest['query']): string {
  if (!query) {
    return '';
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}
