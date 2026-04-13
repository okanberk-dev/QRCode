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
  serviceType?: string | null;
  aspects?: {
    food?: number;
    service?: number;
    atmosphere?: number;
  } | null;
}

function renderStars(rating: number): string {
  const filled = '★'.repeat(rating);
  const empty = '☆'.repeat(5 - rating);
  return `<span style="color:#FDBF1D;font-size:28px;letter-spacing:2px;">${filled}</span><span style="color:#d1d5db;font-size:28px;letter-spacing:2px;">${empty}</span>`;
}

function getRatingColor(rating: number): string {
  if (rating <= 2) return '#ef4444';
  if (rating === 3) return '#f59e0b';
  return '#22c55e';
}

function getRatingLabel(rating: number): string {
  const labels: Record<number, string> = {
    1: 'Çok Kötü',
    2: 'Kötü',
    3: 'Orta',
    4: 'İyi',
    5: 'Mükemmel'
  };
  return labels[rating] || `${rating} Yıldız`;
}

export async function sendFeedbackNotification(data: NotificationParams) {
  const transporter = getTransporter();

  if (!transporter) {
    console.warn("SMTP credentials not fully configured. Skipping email notification.");
    return;
  }

  const recipientEmail = data.toEmail || process.env.NOTIFICATION_EMAIL;
  if (!recipientEmail) {
    console.warn("No notification email configured. Skipping email.");
    return;
  }

  const restaurantName = data.restaurantName || 'Restoran';
  const ratingColor = getRatingColor(data.rating);
  const ratingLabel = getRatingLabel(data.rating);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com';
  const subject = `⚠️ ${data.rating} Yıldız — ${restaurantName}${data.branch ? ` / ${data.branch}` : ''} yeni düşük değerlendirme`;

  const htmlBody = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Buaze — Yeni Değerlendirme</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f3f4f6;padding:40px 16px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">

          <!-- HEADER -->
          <tr>
            <td style="background:#111827;border-radius:16px 16px 0 0;padding:32px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background:#FDBF1D;border-radius:8px;width:36px;height:36px;text-align:center;vertical-align:middle;">
                          <span style="font-size:20px;font-weight:900;color:#111827;line-height:36px;display:block;">B</span>
                        </td>
                        <td style="padding-left:12px;vertical-align:middle;">
                          <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Buaze</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="background:${ratingColor}22;color:${ratingColor};font-size:12px;font-weight:700;padding:6px 14px;border-radius:100px;letter-spacing:0.5px;text-transform:uppercase;border:1px solid ${ratingColor}44;">
                      ${ratingLabel}
                    </span>
                  </td>
                </tr>
              </table>
              <div style="margin-top:24px;">
                <p style="margin:0;color:#9ca3af;font-size:13px;font-weight:500;text-transform:uppercase;letter-spacing:1px;">Yeni Değerlendirme</p>
                <h1 style="margin:6px 0 0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">${restaurantName}</h1>
                ${data.branch ? `<p style="margin:4px 0 0;color:#6b7280;font-size:14px;">${data.branch}${data.tableNumber ? ` · Masa ${data.tableNumber}` : ''}</p>` : ''}
              </div>
            </td>
          </tr>

          <!-- RATING SECTION -->
          <tr>
            <td style="background:#ffffff;padding:32px 40px 24px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="border-radius:12px;padding:24px;background:#f8fafc;border:1px solid #e5e7eb;text-align:center;">
                    <div style="font-size:48px;font-weight:900;color:${ratingColor};line-height:1;">${data.rating}</div>
                    <div style="font-size:13px;color:#6b7280;margin-top:2px;margin-bottom:12px;">/ 5 Puan</div>
                    <div>${renderStars(data.rating)}</div>
                    <div style="margin-top:12px;display:inline-block;background:${ratingColor}18;color:${ratingColor};font-weight:700;font-size:13px;padding:6px 20px;border-radius:100px;">${ratingLabel}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- COMMENT SECTION -->
          ${data.comment && data.comment !== 'High Rating Redirect' ? `
          <tr>
            <td style="background:#ffffff;padding:0 40px 28px;">
              <div style="border-left:4px solid ${ratingColor};background:#f8fafc;border-radius:0 12px 12px 0;padding:16px 20px;">
                <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Müşteri Yorumu</p>
                <p style="margin:0;font-size:15px;color:#111827;line-height:1.7;font-style:italic;">"${data.comment.replace(/\n/g, '<br>')}"</p>
              </div>
            </td>
          </tr>
          ` : `
          <tr>
            <td style="background:#ffffff;padding:0 40px 28px;">
              <div style="border-radius:12px;background:#f8fafc;border:1px dashed #d1d5db;padding:16px 20px;text-align:center;">
                <p style="margin:0;font-size:14px;color:#9ca3af;font-style:italic;">Müşteri yorum bırakmadı.</p>
              </div>
            </td>
          </tr>
          `}

          <!-- DETAILS TABLE -->
          <tr>
            <td style="background:#ffffff;padding:0 40px 32px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
                <tr style="background:#f8fafc;">
                  <th style="padding:12px 16px;text-align:left;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;" colspan="2">Detaylar</th>
                </tr>
                ${data.branch ? `
                <tr style="border-top:1px solid #e5e7eb;">
                  <td style="padding:12px 16px;font-size:13px;color:#6b7280;width:40%;">Şube / Mekan</td>
                  <td style="padding:12px 16px;font-size:13px;color:#111827;font-weight:600;">${data.branch}</td>
                </tr>` : ''}
                ${data.tableNumber ? `
                <tr style="border-top:1px solid #e5e7eb;">
                  <td style="padding:12px 16px;font-size:13px;color:#6b7280;">Masa No</td>
                  <td style="padding:12px 16px;font-size:13px;color:#111827;font-weight:600;">Masa ${data.tableNumber}</td>
                </tr>` : ''}
                ${data.serviceType ? `
                <tr style="border-top:1px solid #e5e7eb;">
                  <td style="padding:12px 16px;font-size:13px;color:#6b7280;">Hizmet Türü</td>
                  <td style="padding:12px 16px;font-size:13px;color:#111827;font-weight:600;">${data.serviceType === 'dine_in' ? 'Yerinde' : data.serviceType === 'takeout' ? 'Paket' : 'Teslimat'}</td>
                </tr>` : ''}
                ${data.aspects?.food ? `
                <tr style="border-top:1px solid #e5e7eb;">
                  <td style="padding:12px 16px;font-size:13px;color:#6b7280;">Yemek</td>
                  <td style="padding:12px 16px;font-size:13px;color:#111827;font-weight:600;">${data.aspects.food} / 5</td>
                </tr>` : ''}
                ${data.aspects?.service ? `
                <tr style="border-top:1px solid #e5e7eb;">
                  <td style="padding:12px 16px;font-size:13px;color:#6b7280;">Servis</td>
                  <td style="padding:12px 16px;font-size:13px;color:#111827;font-weight:600;">${data.aspects.service} / 5</td>
                </tr>` : ''}
                ${data.aspects?.atmosphere ? `
                <tr style="border-top:1px solid #e5e7eb;">
                  <td style="padding:12px 16px;font-size:13px;color:#6b7280;">Atmosfer</td>
                  <td style="padding:12px 16px;font-size:13px;color:#111827;font-weight:600;">${data.aspects.atmosphere} / 5</td>
                </tr>` : ''}
                <tr style="border-top:1px solid #e5e7eb;">
                  <td style="padding:12px 16px;font-size:13px;color:#6b7280;">Tarih & Saat</td>
                  <td style="padding:12px 16px;font-size:13px;color:#111827;font-weight:600;">${new Date().toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                </tr>
                <tr style="border-top:1px solid #e5e7eb;">
                  <td style="padding:12px 16px;font-size:13px;color:#6b7280;">Kaynak</td>
                  <td style="padding:12px 16px;font-size:13px;color:#111827;font-weight:600;">QR Kod</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA BUTTON -->
          <tr>
            <td style="background:#ffffff;padding:0 40px 40px;text-align:center;">
              <a href="${appUrl}/admin/dashboard" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 32px;border-radius:12px;letter-spacing:0.3px;">
                Panelde İncele →
              </a>
              <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">Bu bildirimi değerlendirme panelinden yönetebilirsiniz.</p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#111827;border-radius:0 0 16px 16px;padding:24px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td>
                    <p style="margin:0;font-size:12px;color:#6b7280;">Bu e-posta <strong style="color:#9ca3af;">${restaurantName}</strong> için Buaze tarafından otomatik oluşturulmuştur.</p>
                    <p style="margin:6px 0 0;font-size:12px;color:#6b7280;">Bildirimleri kapatmak için restoran ayarlarınızı güncelleyin.</p>
                  </td>
                  <td align="right" style="vertical-align:top;">
                    <p style="margin:0;font-size:12px;color:#FDBF1D;font-weight:700;">buaze.com</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const textBody = `
${restaurantName} — Yeni ${data.rating} Yıldız Değerlendirme

Puan: ${data.rating}/5 — ${ratingLabel}
Şube: ${data.branch || 'Belirtilmedi'}
Masa: ${data.tableNumber || 'Belirtilmedi'}
Tarih: ${new Date().toLocaleString('tr-TR')}

Yorum:
${data.comment && data.comment !== 'High Rating Redirect' ? data.comment : 'Yorum bırakılmadı.'}

Panelde inceleyin: ${appUrl}/admin/dashboard
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"Buaze" <hello@buaze.com>`,
      to: recipientEmail,
      subject,
      text: textBody,
      html: htmlBody,
    });
  } catch (error) {
    console.error("Failed to send notification email:", error);
  }
}
