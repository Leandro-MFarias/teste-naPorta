import { NextResponse, type NextRequest } from 'next/server';

// Mesmo nome de src/lib/session.ts (o proxy não importa módulos server-only).
const SESSION_COOKIE = 'naporta_session';

const PUBLIC_PATHS = ['/login'];

/**
 * Checagem otimista: só olha se o cookie de sessão existe. A validação real
 * do token é feita pela API em cada chamada (401 leva a /sair).
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (!hasSession && !isPublic) {
    const url = new URL('/login', request.url);
    if (pathname !== '/') {
      url.searchParams.set('next', `${pathname}${search}`);
    }
    return NextResponse.redirect(url);
  }

  if (hasSession && (isPublic || pathname === '/')) {
    return NextResponse.redirect(new URL('/pedidos', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Ignora assets, arquivos estáticos e /sair (que apaga o cookie).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sair|.*\\..*).*)'],
};
