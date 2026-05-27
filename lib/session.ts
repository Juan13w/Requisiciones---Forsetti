export const SESSION_COOKIE = 'session';

interface SessionPayload {
  id: number;
  rol: string;
  email: string;
}

async function hmacSign(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  const bytes = new Uint8Array(sig);
  let str = '';
  for (const byte of bytes) str += String.fromCharCode(byte);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function toBase64Url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function fromBase64Url(b64: string): string {
  return atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const secret = process.env.SESSION_SECRET ?? 'dev-secret-change-in-production';
  const data = toBase64Url(JSON.stringify(payload));
  const sig = await hmacSign(data, secret);
  return `${data}.${sig}`;
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  const secret = process.env.SESSION_SECRET ?? 'dev-secret-change-in-production';
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  const data = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmacSign(data, secret);
  if (expected !== sig) return null;
  try {
    return JSON.parse(fromBase64Url(data)) as SessionPayload;
  } catch {
    return null;
  }
}
