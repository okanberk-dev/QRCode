import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  
  if (!admin) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  return NextResponse.json({
    id: admin.id,
    username: admin.username,
    role: admin.role || 'superadmin',
    restaurantId: admin.restaurantId || null
  });
}
