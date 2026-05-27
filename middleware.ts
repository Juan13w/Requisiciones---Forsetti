import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/session';

const ROUTE_ROLES: { prefix: string; roles: string[] }[] = [
  { prefix: '/admin', roles: ['admin'] },
  { prefix: '/dashboard-compras', roles: ['compras'] },
  { prefix: '/dashboard', roles: ['coordinador'] },
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const rule = ROUTE_ROLES.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + '/'));
  if (!rule) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const payload = await verifySessionToken(token);

  if (!payload || !rule.roles.includes(payload.rol)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/dashboard-compras/:path*'],
};
