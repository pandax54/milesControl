import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

const PUBLIC_ROUTES = ['/login', '/register', '/api/auth'];
const ADMIN_ROUTES = ['/admin'];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  if (isPublicRoute) {
    return NextResponse.next();
  }

  if (!req.auth) {
    const loginUrl = new URL('/login', req.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route));

  if (isAdminRoute && req.auth.user.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/', req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
};
