import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

const protectedRoutes = ['/dashboard', '/projects', '/settings'];
const authRoutes = ['/login', '/signup', '/forgot-password'];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isProtectedRoute = protectedRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  );

  // Helper to construct redirects ensuring the true request host is used (never localhost on production)
  const getRedirectUrl = (path: string) => {
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || nextUrl.host;
    const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    return new URL(path, `${proto}://${host}`);
  };

  // Redirect logged-in users away from auth pages
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(getRedirectUrl('/dashboard'));
  }

  // Redirect unauthenticated users to login
  if (isProtectedRoute && !isLoggedIn) {
    const callbackUrl = encodeURIComponent(nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(
      getRedirectUrl(`/login?callbackUrl=${callbackUrl}`)
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|share).*)',
  ],
};
