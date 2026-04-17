import { NextRequest, NextResponse } from 'next/server';
import { sendMail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { name, email, business, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Gerekli alanlar eksik.' }, { status: 400 });
    }

    const subject = `Yeni İletişim Formu: ${business || name}`;
    const text = `Ad: ${name}\nEmail: ${email}\nİşletme: ${business || '-'}\nMesaj: ${message}`;
    
    const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
        <h2 style="font-weight: 900; letter-spacing: -1px;">Yeni Mesaj Alındı ✨</h2>
        <div style="background: #f1f5f9; border: 2px solid #1e293b; border-radius: 12px; padding: 20px; box-shadow: 4px 4px 0px #1e293b;">
          <p><strong>Ad Soyad:</strong> ${name}</p>
          <p><strong>E-posta:</strong> ${email}</p>
          <p><strong>İşletme:</strong> ${business || '-'}</p>
          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px dashed #cbd5e1;">
            <p><strong>Mesaj:</strong></p>
            <p style="white-space: pre-wrap; font-style: italic;">${message}</p>
          </div>
        </div>
      </div>
    `;

    const success = await sendMail({
      to: process.env.NOTIFICATION_EMAIL || 'hello@buaze.com',
      subject,
      text,
      html
    });

    if (!success) throw new Error('Mail sending failed');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Contact form email failed:', error);
    return NextResponse.json({ error: error?.message || 'E-posta gönderilirken bir hata oluştu.' }, { status: 500 });
  }
}
