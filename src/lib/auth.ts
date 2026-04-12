import * as jose from 'jose';
import { NextRequest } from 'next/server';

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || 'cldqlkmC72MfL/WvllPYQq9O0puMk4j+LxrEtzm8PVs='; // Fallback for Vercel if not set
  if (!secret) {
    throw new Error('[Buaze] JWT_SECRET environment variable is not set. Add it to your .env file.');
  }
  return new TextEncoder().encode(secret);
}

export async function signJwt(payload: Record<string, unknown>) {
  const secret = getSecret();

  const jwt = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);

  return jwt;
}

export async function verifyJwt(token: string) {
  try {
    const secret = getSecret();
    const { payload } = await jose.jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export async function getAdminFromRequest(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value ||
                req.headers.get('Authorization')?.split(' ')[1];

  if (!token) return null;

  return await verifyJwt(token);
}

