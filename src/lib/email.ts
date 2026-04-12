import nodemailer from 'nodemailer';

let transporterInstance: any = null;

function getTransporter() {
  if (transporterInstance) return transporterInstance;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_USER || !SMTP_PASS) {
    return null;
  }

  transporterInstance = nodemailer.createTransport({
    host: SMTP_HOST || 'smtp.gmail.com',
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  return transporterInstance;
}

export interface NotificationParams {
  rating: number;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  comment?: string | null;
  branch?: string | null;
  tableNumber?: string | null;
  restaurantName?: string;
  toEmail?: string | null;
}

export async function sendFeedbackNotification(data: NotificationParams) {
  const transporter = getTransporter();

  if (!transporter) {
    console.warn("SMTP credentials not fully configured. Skipping email notification.");
    return;
  }

  // Use restaurant-specific email, fallback to env
  const recipientEmail = data.toEmail || process.env.NOTIFICATION_EMAIL;
  if (!recipientEmail) {
    console.warn("No notification email configured. Skipping email.");
    return;
  }

  const restaurantName = data.restaurantName || 'Restoran';
  const subject = `Yeni Düşük Puanlı Değerlendirme (${data.rating} Yıldız) - ${restaurantName} - ${data.branch || ''}`;
  
  const textBody = `
${restaurantName} - Yeni Bir Değerlendirme Alındı

Puan: ${data.rating} Yıldız
Şube: ${data.branch || 'Belirtilmedi'}
Masa No: ${data.tableNumber || 'Belirtilmedi'}

Müşteri Bilgileri:
Ad Soyad: ${data.name || 'Belirtilmedi'}
Telefon: ${data.phone || 'Belirtilmedi'}
E-posta: ${data.email || 'Belirtilmedi'}

Yorum:
${data.comment || 'Yorum bırakılmadı.'}
  `;

  const htmlBody = `
    <div style="font-family: 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1a73e8, #185abc); color: white; padding: 20px 24px; border-radius: 12px 12px 0 0;">
        <h2 style="margin: 0; font-size: 18px;">${restaurantName}</h2>
        <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">Yeni Değerlendirme Bildirimi</p>
      </div>
      
      <div style="background: #fff; border: 1px solid #e0e0e0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
          <span style="font-size: 32px; font-weight: bold; color: ${data.rating <= 2 ? '#d93025' : '#fbbc04'};">${data.rating}</span>
          <span style="color: #5f6368;">/ 5 Yıldız</span>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 8px 0; color: #5f6368; width: 120px;">Şube</td><td style="padding: 8px 0; font-weight: 500;">${data.branch || 'Belirtilmedi'}</td></tr>
          <tr><td style="padding: 8px 0; color: #5f6368;">Masa No</td><td style="padding: 8px 0; font-weight: 500;">${data.tableNumber || 'Belirtilmedi'}</td></tr>
          <tr><td style="padding: 8px 0; color: #5f6368;">Ad Soyad</td><td style="padding: 8px 0; font-weight: 500;">${data.name || 'Belirtilmedi'}</td></tr>
          <tr><td style="padding: 8px 0; color: #5f6368;">Telefon</td><td style="padding: 8px 0; font-weight: 500;">${data.phone || 'Belirtilmedi'}</td></tr>
          <tr><td style="padding: 8px 0; color: #5f6368;">E-posta</td><td style="padding: 8px 0; font-weight: 500;">${data.email || 'Belirtilmedi'}</td></tr>
        </table>

        <div style="margin-top: 16px; padding: 16px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid ${data.rating <= 2 ? '#d93025' : '#fbbc04'};">
          <p style="margin: 0 0 4px; font-size: 12px; color: #5f6368; text-transform: uppercase; letter-spacing: 0.5px;">Müşteri Yorumu</p>
          <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #202124;">${data.comment ? data.comment.replace(/\n/g, '<br>') : 'Yorum bırakılmadı.'}</p>
        </div>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"${restaurantName}" <noreply@qrkod.com>`,
      to: recipientEmail,
      subject,
      text: textBody,
      html: htmlBody,
    });
  } catch (error) {
    console.error("Failed to send notification email:", error);
  }
}
