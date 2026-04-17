import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { rateLimit, getClientIp, maybeSweep } from '@/lib/rate-limit';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(req: NextRequest) {
  try {
    maybeSweep();
    const ip = getClientIp(req.headers);

    // Rate limit: 5 per IP per 10 minutes
    const ipLimit = rateLimit(`contact:ip:${ip}`, 5, 10 * 60 * 1000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: 'Çok fazla istek. Lütfen bir süre sonra tekrar deneyin.' },
        { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) } },
      );
    }

    const { name, email, business, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Gerekli alanlar eksik.' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const safeName = escapeHtml(String(name));
    const safeEmail = escapeHtml(String(email));
    const safeBusiness = escapeHtml(String(business || '-'));
    const safeMessage = escapeHtml(String(message));

    const mailOptions = {
      from: process.env.SMTP_FROM || '"Buaze" <hello@buaze.com>',
      to: 'hello@buaze.com', // Explicit request by user
      subject: `Yeni İletişim Formu: ${safeBusiness !== '-' ? safeBusiness : safeName}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
          <h2 style="color: #111827; margin-bottom: 24px;">Yeni Bir İletişim Formu Dolduruldu 🎉</h2>

          <table style="width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; border: 1px solid #f3f4f6;">
            <tr>
              <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; font-weight: bold; color: #6b7280; width: 120px;">Ad Soyad:</td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; color: #111827; font-weight: bold;">${safeName}</td>
            </tr>
            <tr>
              <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; font-weight: bold; color: #6b7280;">E-posta:</td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; color: #111827;"><a href="mailto:${safeEmail}" style="color: #1a73e8; text-decoration: none;">${safeEmail}</a></td>
            </tr>
            <tr>
              <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; font-weight: bold; color: #6b7280;">İşletme:</td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; color: #111827;">${safeBusiness}</td>
            </tr>
            <tr>
              <td style="padding: 12px 16px; font-weight: bold; color: #6b7280; vertical-align: top;">Mesaj:</td>
              <td style="padding: 12px 16px; color: #374151; line-height: 1.6; white-space: pre-wrap;">${safeMessage}</td>
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
    return NextResponse.json({ error: 'E-posta gönderilirken bir hata oluştu.' }, { status: 500 });
  }
}
