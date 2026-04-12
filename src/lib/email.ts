import nodemailer from 'nodemailer';

let transporterInstance: any = null;

function getTransporter() {
  if (transporterInstance) return transporterInstance;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  transporterInstance = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
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
}

export async function sendFeedbackNotification(data: NotificationParams) {
  const transporter = getTransporter();

  if (!transporter) {
    console.warn("SMTP credentials not fully configured. Skipping email notification.");
    return;
  }

  const toEmail = process.env.NOTIFICATION_EMAIL;
  if (!toEmail) {
    console.warn("NOTIFICATION_EMAIL not configured. Skipping email.");
    return;
  }

  const subject = `Yeni Düşük Puanlı Değerlendirme (${data.rating} Yıldız) - ${data.branch || 'Bilinmeyen Şube'}`;
  
  const textBody = `
Mamma's Burger - Yeni Bir Değerlendirme Alındı

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
    <h2>Mamma's Burger - Yeni Değerlendirme Bildirimi</h2>
    <p><strong>Puan:</strong> ${data.rating} Yıldız</p>
    <p><strong>Şube:</strong> ${data.branch || 'Belirtilmedi'}</p>
    <p><strong>Masa No:</strong> ${data.tableNumber || 'Belirtilmedi'}</p>
    
    <h3>Müşteri Bilgileri:</h3>
    <ul>
      <li><strong>Ad Soyad:</strong> ${data.name || 'Belirtilmedi'}</li>
      <li><strong>Telefon:</strong> ${data.phone || 'Belirtilmedi'}</li>
      <li><strong>E-posta:</strong> ${data.email || 'Belirtilmedi'}</li>
    </ul>

    <h3>Müşteri Yorumu:</h3>
    <blockquote style="background-color: #f9f9f9; padding: 15px; border-left: 5px solid #ccc;">
      ${data.comment ? data.comment.replace(/\\n/g, '<br>') : 'Yorum bırakılmadı.'}
    </blockquote>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Mamma\'s Burger" <noreply@mammasburger.com>',
      to: toEmail,
      subject,
      text: textBody,
      html: htmlBody,
    });
  } catch (error) {
    console.error("Failed to send notification email:", error);
  }
}
