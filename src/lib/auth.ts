import * as jose from 'jose';
import { NextRequest } from 'next/server';

const DEFAULT_SECRET = 'mammas_burger_secret_key_123456';

export async function signJwt(payload: any) {
  const secretString = process.env.JWT_SECRET || DEFAULT_SECRET;
  const secret = new TextEncoder().encode(secretString);
  
  const jwt = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(secret);
    
  return jwt;
}

export async function verifyJwt(token: string) {
  try {
    const secretString = process.env.JWT_SECRET || DEFAULT_SECRET;
    const secret = new TextEncoder().encode(secretString);
    const { payload } = await jose.jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function getAdminFromRequest(req: NextRequest) {
  // Try taking token from cookies (for page requests) or auth header (for API requests)
  const token = req.cookies.get('admin_token')?.value || 
                req.headers.get('Authorization')?.split(' ')[1];
                
  if (!token) return null;
  
  return await verifyJwt(token);
}
