import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from '@/lib/auth.config';
import { getPublicRewritePath } from '@/lib/seo/public-pages';

const { auth } = NextAuth(authConfig);

export const proxy = auth((request) => {
  const rewritePath = getPublicRewritePath(request.nextUrl.pathname, !!request.auth?.user);

  if (!rewritePath) {
    return NextResponse.next();
  }

  return NextResponse.rewrite(new URL(rewritePath, request.url));
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
};
