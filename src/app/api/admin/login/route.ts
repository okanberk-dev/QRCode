import { NextRequest, NextResponse } from 'next/server';
import { signJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    // Security Check: JWT_SECRET must be present for session management
    if (!process.env.JWT_SECRET) {
      console.error('SERVER MISCONFIGURATION: Missing JWT_SECRET');
      return NextResponse.json({ error: 'Sunucu anahtar hatası (JWT_SECRET eksik)' }, { status: 500 });
    }

    // Check if any admin exists in the database
    let admin = await prisma.adminUser.findUnique({
      where: { username }
    });

    // BOOTSTRAP LOGIC: If no admin users exist at all, auto-create the first one 
    // using the provided credentials if they are the default ones.
    const adminCount = await prisma.adminUser.count();
    if (adminCount === 0 && username === 'admin' && password === '123456+') {
      const hashedPassword = await bcrypt.hash(password, 10);
      admin = await prisma.adminUser.create({
        data: {
          username: 'admin',
          passwordHash: hashedPassword
        }
      });
      console.log('BOOTSTRAP: Created first admin user successfully.');
    }

    // Verify credentials
    if (admin) {
      const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
      if (isPasswordValid) {
        // Create token
        const token = await signJwt({ id: admin.id, username: admin.username, role: 'admin' });
        
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
    }

    return NextResponse.json({ error: 'Kullanıcı adı veya şifre hatalı' }, { status: 401 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Sunucu hatası veya veritabanı bağlantı sorunu' }, { status: 500 });
  }
}
