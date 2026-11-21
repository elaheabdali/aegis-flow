import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_LOCALE, isValidLocale } from '@/i18n/config';

function applySecurityHeaders(response: NextResponse): NextResponse {
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    "connect-src 'self' ws: wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return applySecurityHeaders(NextResponse.next());
  }

  const segments = pathname.split('/');
  const firstSegment = segments[1] ?? '';

  if (isValidLocale(firstSegment)) {
    const response = NextResponse.next();
    response.cookies.set('NEXT_LOCALE', firstSegment, {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    });
    return applySecurityHeaders(response);
  }

  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  const preferredLocale =
    cookieLocale && isValidLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = `/${preferredLocale}${pathname === '/' ? '' : pathname}`;

  return applySecurityHeaders(NextResponse.redirect(redirectUrl));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};