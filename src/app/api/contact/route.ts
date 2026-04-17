import { NextRequest, NextResponse } from 'next/server';
import { getTransporter } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { name, email, business, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Gerekli alanlar eksik.' }, { status: 400 });
    }

    const transporter = getTransporter();

    if (!transporter) {
      console.warn("SMTP credentials not fully configured for contact form. Falling back to dummy success.");
      // In production, you might want to log this to a service
      return NextResponse.json({ success: true }); 
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || '"Buaze Web Form" <hello@buaze.com>',
      to: 'hello@buaze.com', // Updated to buaze.com address
      subject: `Yeni İletişim Formu: ${business || name}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
          <h2 style="color: #111827; margin-bottom: 24px;">Yeni Bir İletişim Formu Dolduruldu 🎉</h2>
          
          <table style="width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; border: 1px solid #f3f4f6;">
            <tr>
              <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; font-weight: bold; color: #6b7280; width: 120px;">Ad Soyad:</td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; color: #111827; font-weight: bold;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; font-weight: bold; color: #6b7280;">E-posta:</td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; color: #111827;"><a href="mailto:${email}" style="color: #1a73e8; text-decoration: none;">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; font-weight: bold; color: #6b7280;">İşletme:</td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; color: #111827;">${business || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 12px 16px; font-weight: bold; color: #6b7280; vertical-align: top;">Mesaj:</td>
              <td style="padding: 12px 16px; color: #374151; line-height: 1.6; white-space: pre-wrap;">${message}</td>
            </tr>
          </table>

          <p style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 24px;">Bu e-posta Buaze iletişim formu üzerinden otomatik olarak gönderilmiştir.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Contact form email failed:', error);
    return NextResponse.json({ error: error?.message || 'E-posta gönderilirken bir hata oluştu.' }, { status: 500 });
  }
}
