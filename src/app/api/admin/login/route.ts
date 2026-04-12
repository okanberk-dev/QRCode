import { NextRequest, NextResponse } from 'next/server';
import { signJwt } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    const validUsername = process.env.ADMIN_USERNAME;
    const validPassword = process.env.ADMIN_PASSWORD;

    // Security Enhancement: Refuse login if env vars are missing
    if (!validUsername || !validPassword) {
      console.error('SERVER MISCONFIGURATION: Missing ADMIN_USERNAME or ADMIN_PASSWORD');
      return NextResponse.json({ error: 'Sunucu yapılandırma hatası' }, { status: 500 });
    }

    if (username === validUsername && password === validPassword) {
      // Create token
      const token = await signJwt({ username, role: 'admin' });
      
      // We will set this token both in the response JSON and as an httpOnly cookie
      const response = NextResponse.json({ success: true });
      
      response.cookies.set('admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 1 day
        path: '/'
      });

      return response;
    }

    return NextResponse.json({ error: 'Kullanıcı adı veya şifre hatalı' }, { status: 401 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
