import * as jose from 'jose';
import { NextRequest } from 'next/server';

export async function signJwt(payload: any) {
  if (!process.env.JWT_SECRET) throw new Error("Missing JWT_SECRET");
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  
  const jwt = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(secret);
    
  return jwt;
}

export async function verifyJwt(token: string) {
  try {
    if (!process.env.JWT_SECRET) throw new Error("Missing JWT_SECRET");
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
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
