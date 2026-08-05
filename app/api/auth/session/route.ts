import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/session';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ user: null });
  }

  const payload = await verifySessionToken(token);

  if (!payload) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user: payload });
}
