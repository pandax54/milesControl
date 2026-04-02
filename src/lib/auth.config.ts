import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      credentials: {
        email: { type: 'email' },
        password: { type: 'password' },
      },
      async authorize() {
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as Record<string, unknown>).role ?? 'USER';
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as 'USER' | 'ADMIN';
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      const PUBLIC_EXACT_ROUTES = [
        '/',
        '/calculator',
        '/login',
        '/promotions',
        '/promotions/calendar',
        '/register',
      ];
      const PUBLIC_PREFIX_ROUTES = ['/api/auth', '/_public'];
      const isPublicRoute =
        PUBLIC_EXACT_ROUTES.includes(pathname) ||
        PUBLIC_PREFIX_ROUTES.some((route) => pathname.startsWith(route));

      if (isPublicRoute) {
        return true;
      }

      if (!isLoggedIn) {
        return false;
      }

      const ADMIN_ROUTES = ['/admin'];
      const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route));

      if (isAdminRoute && (auth?.user as { role?: string })?.role !== 'ADMIN') {
        return Response.redirect(new URL('/', nextUrl.origin));
      }

      return true;
    },
  },
};
