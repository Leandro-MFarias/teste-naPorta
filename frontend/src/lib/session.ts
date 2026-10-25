import 'server-only';
import { cookies } from 'next/headers';

/**
 * O access token da API fica em um cookie httpOnly: o JavaScript do
 * navegador nunca o lê, e só o servidor Next.js o envia à API.
 */
export const SESSION_COOKIE = 'naporta_session';

export async function getToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/** Só pode ser chamada em Server Actions ou Route Handlers. */
export async function setToken(token: string, expiresIn: number) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: expiresIn,
  });
}

/** Só pode ser chamada em Server Actions ou Route Handlers. */
export async function clearToken() {
  (await cookies()).delete(SESSION_COOKIE);
}
