import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/movement-log',
  '/material',
  '/users',
  '/documents',
];

// Routes that require admin role
const adminRoutes = ['/users'];

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const pathname = request.nextUrl.pathname;

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname.startsWith(route)
  );

  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));

  // Redirect to login if accessing protected route without token
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to dashboard if accessing login with valid token
  if (pathname === '/login' && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Check admin access
  if (isAdminRoute && token) {
    const userStr = request.cookies.get('user')?.value;
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role !== 'admin') {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
      } catch {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/movement-log/:path*',
    '/material/:path*',
    '/users/:path*',
    '/documents/:path*',
    '/login',
  ],
};
