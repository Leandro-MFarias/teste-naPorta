import { NextResponse, type NextRequest } from 'next/server';
import { clearToken } from '@/lib/session';

/**
 * Encerra a sessão local (apaga o cookie) e volta ao login. Usado quando a
 * API responde 401 durante a renderização, onde cookies não podem ser
 * alterados.
 */
export async function GET(request: NextRequest) {
  await clearToken();
  const url = new URL('/login', request.url);
  const reason = request.nextUrl.searchParams.get('motivo');
  if (reason) {
    url.searchParams.set('motivo', reason);
  }
  return NextResponse.redirect(url);
}
