import { NextRequest, NextResponse } from 'next/server';
import { sendMail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, business, message, kvkk, marketing } = await req.json();

    if (!name || !email || !message || !kvkk) {
      return NextResponse.json({ error: 'Gerekli alanlar eksik veya KVKK onayı verilmemiş.' }, { status: 400 });
    }

    const subject = `Yeni İletişim Formu: ${business || name}`;
    const text = `Ad: ${name}\nEmail: ${email}\nTelefon: ${phone || '-'}\nİşletme: ${business || '-'}\nKVKK: Onaylandı\nPazarlama İzni: ${marketing ? 'Evet' : 'Hayır'}\nMesaj: ${message}`;
    
    const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
        <h2 style="font-weight: 900; letter-spacing: -1px;">Yeni Mesaj Alındı ✨</h2>
        <div style="background: #f1f5f9; border: 2px solid #1e293b; border-radius: 12px; padding: 20px; box-shadow: 4px 4px 0px #1e293b;">
          <p><strong>Ad Soyad:</strong> ${name}</p>
          <p><strong>E-posta:</strong> ${email}</p>
          <p><strong>Telefon:</strong> ${phone || '-'}</p>
          <p><strong>İşletme:</strong> ${business || '-'}</p>
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #cbd5e1; font-size: 14px; color: #475569;">
            <p style="margin: 4px 0;"><strong>KVKK Onayı:</strong> ✅ Verildi</p>
            <p style="margin: 4px 0;"><strong>Pazarlama / İletişim İzni:</strong> ${marketing ? '✅ Evet' : '❌ Hayır'}</p>
          </div>
          <div style="margin-top: 16px; padding-top: 16px; border-top: 2px dashed #94a3b8;">
            <p><strong>Mesaj:</strong></p>
            <p style="white-space: pre-wrap; font-style: italic; background: #fff; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1;">${message}</p>
          </div>
        </div>
      </div>
    `;

    const success = await sendMail({
      to: process.env.NOTIFICATION_EMAIL || 'hello@buaze.com',
      replyTo: email,
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
