import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    const feedbacks = await prisma.feedback.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // Generate CSV
    const header = ['ID', 'Tarih', 'Puan', 'Ad Soyad', 'E-posta', 'Telefon', 'Yorum', 'Şube', 'Masa No', 'IP', 'Pazarlama İzni'];
    const rows = feedbacks.map((f) => [
      f.id,
      f.createdAt.toISOString(),
      f.rating.toString(),
      // Escape quotes and wrap in quotes to handle commas/newlines in text naturally
      `"${(f.name || '').replace(/"/g, '""')}"`,
      `"${(f.email || '').replace(/"/g, '""')}"`,
      `"${(f.phone || '').replace(/"/g, '""')}"`,
      `"${(f.comment || '').replace(/"/g, '""')}"`,
      `"${(f.branch || '').replace(/"/g, '""')}"`,
      `"${(f.tableNumber || '').replace(/"/g, '""')}"`,
      `"${(f.ipAddress || '').replace(/"/g, '""')}"`,
      f.hasMarketingConsent ? 'EVET' : 'HAYIR'
    ]);

    const csvContent = '\ufeff' + [header.join(','), ...rows.map(r => r.join(','))].join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="mammasburger-degerlendirmeler-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

  } catch (error) {
    console.error('Failed to export CSV:', error);
    return NextResponse.json({ error: 'Dışa aktarma başarısız' }, { status: 500 });
  }
}
