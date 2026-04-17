import nodemailer from 'nodemailer';

let transporterInstance: any = null;

export function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, RESEND_API_KEY } = process.env;
  const resendKey = RESEND_API_KEY?.trim();
  
  // Resend auto-configure (sets RESEND_API_KEY via Vercel integration)
  if (resendKey && resendKey !== '') {
    // If we have a Resend key, we ALWAYS use it and ignore Gmail/SMTP fallback
    if (transporterInstance && transporterInstance._resend) return transporterInstance;

    console.log('[Buaze Email] Using Resend SMTP');
    transporterInstance = nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: resendKey,
      },
    });
    (transporterInstance as any)._resend = true;
    return transporterInstance;
  }

  // Fallback: custom SMTP_* env vars
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn('[Buaze Email] No email credentials found (no RESEND_API_KEY or SMTP_USER)');
    return null;
  }

  // If we already have a custom SMTP transporter, reuse it
  if (transporterInstance && !(transporterInstance as any)._resend) return transporterInstance;

  console.log('[Buaze Email] Falling back to custom/Gmail SMTP - User:', SMTP_USER);
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
  (transporterInstance as any)._resend = false;
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
  feedbackId?: string;
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

  const recipientEmail = data.toEmail || process.env.NOTIFICATION_EMAIL || 'hello@buaze.com';
  if (!recipientEmail) {
    console.warn("No notification email configured. Skipping email.");
    return;
  }

  const restaurantName = data.restaurantName || 'Restoran';
  const ratingColor = getRatingColor(data.rating);
  const ratingLabel = getRatingLabel(data.rating);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com';

  // Escalate the subject line by severity. Inbox scan-ability matters more
  // than politeness for low ratings — owners need to spot 1-2 star feedback
  // instantly so they can respond before the customer leaves a public review.
  const isCritical = data.rating <= 2;
  const subjectPrefix = data.rating === 1
    ? '🚨 ACİL'
    : data.rating === 2
      ? '⚠️ DÜŞÜK PUAN'
      : '⚠️';
  const subject = `${subjectPrefix} - ${data.rating} Yıldız / ${restaurantName}${data.branch ? ` - ${data.branch}` : ''}`;

  // For 1-2 star reviews, add a prominent "action required" banner at the
  // top of the email directing the owner to respond quickly.
  const criticalBanner = isCritical
    ? `
          <tr>
            <td style="background:#ffffff;padding:20px 40px 0;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fef2f2;border:2px solid #fca5a5;border-radius:14px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align:middle;padding-right:12px;">
                          <div style="background:#ef4444;border-radius:10px;width:40px;height:40px;text-align:center;line-height:40px;color:#fff;font-size:20px;font-weight:900;">!</div>
                        </td>
                        <td style="vertical-align:middle;">
                          <p style="margin:0;font-size:14px;font-weight:900;color:#991b1b;letter-spacing:-0.2px;">Acil Aksiyon Gerekiyor</p>
                          <p style="margin:3px 0 0;font-size:12px;color:#b91c1c;line-height:1.5;">Müşteri memnuniyetsiz. İlk 60 dakikada iletişime geçmek hem yorumu kurtarma şansınızı hem de müşteri sadakatini belirgin şekilde artırır.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
    : '';

  const htmlBody = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Buaze - Yeni Değerlendirme</title>
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
                ${data.branch ? `<p style="margin:4px 0 0;color:#6b7280;font-size:14px;">${data.branch}${data.tableNumber ? ` - Masa ${data.tableNumber}` : ''}</p>` : ''}
              </div>
            </td>
          </tr>

          ${criticalBanner}

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
              <a href="${appUrl}/tr/auth/login?redirect=${encodeURIComponent('/tr/dashboard/feedbacks' + (data.feedbackId ? `?highlight=${data.feedbackId}` : ''))}" style="display:inline-block;background:${isCritical ? '#ef4444' : '#111827'};color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 32px;border-radius:12px;letter-spacing:0.3px;">
                ${isCritical ? 'Hemen İncele ve Yanıtla →' : 'Panelde İncele →'}
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
${isCritical ? '🚨 ACİL AKSİYON GEREKİYOR\n' : ''}${restaurantName} - Yeni ${data.rating} Yıldız Değerlendirme

Puan: ${data.rating}/5 - ${ratingLabel}
Şube: ${data.branch || 'Belirtilmedi'}
Masa: ${data.tableNumber || 'Belirtilmedi'}
Tarih: ${new Date().toLocaleString('tr-TR')}

Yorum:
${data.comment && data.comment !== 'High Rating Redirect' ? data.comment : 'Yorum bırakılmadı.'}

${isCritical ? 'İlk 60 dakikada iletişime geçmek yorumu kurtarma şansınızı artırır.\n\n' : ''}Panelde inceleyin: ${appUrl}/tr/auth/login?redirect=${encodeURIComponent('/tr/dashboard/feedbacks' + (data.feedbackId ? `?highlight=${data.feedbackId}` : ''))}
  `;

  const resendKey = process.env.RESEND_API_KEY?.trim();
  try {
    await transporter.sendMail({
      from: (resendKey ? '"Buaze" <hello@buaze.com>' : (process.env.SMTP_FROM || '"Buaze" <hello@buaze.com>')),
      to: recipientEmail,
      subject,
      text: textBody,
      html: htmlBody,
    });
  } catch (error) {
    console.error("Failed to send notification email:", error);
  }
}

// ─── Weekly Digest ───

export interface WeeklyDigestParams {
  to: string;
  locale: 'tr' | 'en';
  restaurantName: string;
  period: { from: Date; to: Date };
  stats: {
    total: number;
    avgRating: number;
    highRatings: number;
    lowRatings: number;
    distribution: Record<number, number>;
    conversionRate: number | null;
    aspects: {
      food: number | null;
      service: number | null;
      atmosphere: number | null;
    };
  };
}

export async function sendWeeklyDigest(params: WeeklyDigestParams) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('[Buaze] SMTP not configured — skipping weekly digest.');
    return false;
  }

  const { to, locale, restaurantName, period, stats } = params;
  const isTr = locale !== 'en';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com';

  const formatDate = (d: Date) =>
    d.toLocaleDateString(isTr ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short' });

  const periodStr = `${formatDate(period.from)} - ${formatDate(period.to)}`;

  const subject = isTr
    ? `📊 Haftalık Rapor - ${restaurantName} (${periodStr})`
    : `📊 Weekly Report - ${restaurantName} (${periodStr})`;

  const copy = isTr
    ? {
        title: 'Haftalık Performans Raporu',
        period: 'Dönem',
        total: 'Toplam Değerlendirme',
        avg: 'Ortalama Puan',
        high: 'Yüksek Puanlı (4-5★)',
        low: 'Düşük Puanlı (1-3★)',
        dist: 'Puan Dağılımı',
        conversion: 'Google Dönüşüm',
        food: 'Yemek',
        service: 'Servis',
        atmosphere: 'Atmosfer',
        aspects: 'Kategori Puanları',
        cta: 'Paneli Aç',
        footer: `Bu e-posta ${restaurantName} için Buaze tarafından haftalık olarak gönderilmektedir.`,
        noConversion: 'Google bağlantısı yok',
        stars: 'yıldız',
      }
    : {
        title: 'Weekly Performance Report',
        period: 'Period',
        total: 'Total Reviews',
        avg: 'Average Rating',
        high: 'High Ratings (4-5★)',
        low: 'Low Ratings (1-3★)',
        dist: 'Rating Distribution',
        conversion: 'Google Conversion',
        food: 'Food',
        service: 'Service',
        atmosphere: 'Atmosphere',
        aspects: 'Aspect Scores',
        cta: 'Open Dashboard',
        footer: `This email is sent weekly by Buaze for ${restaurantName}.`,
        noConversion: 'No Google link',
        stars: 'stars',
      };

  // Rating color for the average
  const avgColor = stats.avgRating >= 4 ? '#22c55e' : stats.avgRating >= 3 ? '#f59e0b' : '#ef4444';

  // Distribution bars
  const maxDist = Math.max(...Object.values(stats.distribution), 1);
  const distRows = [5, 4, 3, 2, 1]
    .map((star) => {
      const count = stats.distribution[star] || 0;
      const pct = Math.round((count / maxDist) * 100);
      const barColor = star >= 4 ? '#22c55e' : star === 3 ? '#f59e0b' : '#ef4444';
      return `
        <tr>
          <td style="padding:4px 8px;font-size:13px;font-weight:700;color:#111827;width:30px;text-align:right;">${star}★</td>
          <td style="padding:4px 8px;">
            <div style="background:#f3f4f6;border-radius:6px;height:18px;overflow:hidden;">
              <div style="background:${barColor};height:100%;border-radius:6px;width:${Math.max(pct, count > 0 ? 4 : 0)}%;"></div>
            </div>
          </td>
          <td style="padding:4px 8px;font-size:13px;font-weight:600;color:#6b7280;width:36px;">${count}</td>
        </tr>`;
    })
    .join('');

  // Aspect scores row
  const aspectItems = [
    { label: copy.food, value: stats.aspects.food },
    { label: copy.service, value: stats.aspects.service },
    { label: copy.atmosphere, value: stats.aspects.atmosphere },
  ]
    .filter((a) => a.value !== null)
    .map((a) => {
      const c = (a.value ?? 0) >= 4 ? '#22c55e' : (a.value ?? 0) >= 3 ? '#f59e0b' : '#ef4444';
      return `
        <td style="text-align:center;padding:12px;">
          <div style="font-size:24px;font-weight:900;color:${c};">${a.value}</div>
          <div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">${a.label}</div>
        </td>`;
    })
    .join('');

  const html = `
<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
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
                    <span style="background:#FDBF1D22;color:#FDBF1D;font-size:12px;font-weight:700;padding:6px 14px;border-radius:100px;letter-spacing:0.5px;text-transform:uppercase;">📊 ${isTr ? 'HAFTALIK' : 'WEEKLY'}</span>
                  </td>
                </tr>
              </table>
              <div style="margin-top:24px;">
                <p style="margin:0;color:#9ca3af;font-size:13px;font-weight:500;text-transform:uppercase;letter-spacing:1px;">${copy.title}</p>
                <h1 style="margin:6px 0 0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">${restaurantName}</h1>
                <p style="margin:6px 0 0;color:#6b7280;font-size:13px;">${copy.period}: ${periodStr}</p>
              </div>
            </td>
          </tr>

          <!-- BIG NUMBERS -->
          <tr>
            <td style="background:#ffffff;padding:32px 40px 0;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="width:50%;padding:0 8px 0 0;">
                    <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:20px;text-align:center;">
                      <div style="font-size:36px;font-weight:900;color:${avgColor};line-height:1;">${stats.avgRating}</div>
                      <div style="font-size:12px;color:#6b7280;margin-top:4px;">${renderStars(Math.round(stats.avgRating))}</div>
                      <div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-top:8px;">${copy.avg}</div>
                    </div>
                  </td>
                  <td style="width:50%;padding:0 0 0 8px;">
                    <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:20px;text-align:center;">
                      <div style="font-size:36px;font-weight:900;color:#111827;line-height:1;">${stats.total}</div>
                      <div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-top:12px;">${copy.total}</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- STATS ROW -->
          <tr>
            <td style="background:#ffffff;padding:16px 40px 0;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="width:33%;padding:0 4px;">
                    <div style="background:#ecfdf5;border-radius:12px;padding:14px;text-align:center;">
                      <div style="font-size:22px;font-weight:900;color:#22c55e;">${stats.highRatings}</div>
                      <div style="font-size:10px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">${copy.high}</div>
                    </div>
                  </td>
                  <td style="width:33%;padding:0 4px;">
                    <div style="background:#fef2f2;border-radius:12px;padding:14px;text-align:center;">
                      <div style="font-size:22px;font-weight:900;color:#ef4444;">${stats.lowRatings}</div>
                      <div style="font-size:10px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">${copy.low}</div>
                    </div>
                  </td>
                  <td style="width:33%;padding:0 4px;">
                    <div style="background:#eff6ff;border-radius:12px;padding:14px;text-align:center;">
                      <div style="font-size:22px;font-weight:900;color:#3b82f6;">${stats.conversionRate !== null ? stats.conversionRate + '%' : '—'}</div>
                      <div style="font-size:10px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">${copy.conversion}</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- DISTRIBUTION -->
          <tr>
            <td style="background:#ffffff;padding:24px 40px 0;">
              <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">${copy.dist}</p>
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                ${distRows}
              </table>
            </td>
          </tr>

          <!-- ASPECTS -->
          ${aspectItems ? `
          <tr>
            <td style="background:#ffffff;padding:24px 40px 0;">
              <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">${copy.aspects}</p>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;">
                <tr>${aspectItems}</tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- CTA -->
          <tr>
            <td style="background:#ffffff;padding:32px 40px;text-align:center;">
              <a href="${appUrl}/admin/dashboard" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 32px;border-radius:12px;letter-spacing:0.3px;">${copy.cta} →</a>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#111827;border-radius:0 0 16px 16px;padding:24px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td>
                    <p style="margin:0;font-size:12px;color:#6b7280;">${copy.footer}</p>
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

  const text = `
${copy.title} - ${restaurantName}
${copy.period}: ${periodStr}

${copy.avg}: ${stats.avgRating}/5
${copy.total}: ${stats.total}
${copy.high}: ${stats.highRatings}
${copy.low}: ${stats.lowRatings}
${copy.conversion}: ${stats.conversionRate !== null ? stats.conversionRate + '%' : copy.noConversion}

${copy.dist}:
5★: ${stats.distribution[5] || 0}
4★: ${stats.distribution[4] || 0}
3★: ${stats.distribution[3] || 0}
2★: ${stats.distribution[2] || 0}
1★: ${stats.distribution[1] || 0}

${copy.cta}: ${appUrl}/admin/dashboard
  `;

  const resendKey = process.env.RESEND_API_KEY?.trim();
  try {
    await transporter.sendMail({
      from: (resendKey ? '"Buaze" <hello@buaze.com>' : (process.env.SMTP_FROM || '"Buaze" <hello@buaze.com>')),
      to,
      subject,
      text,
      html,
    });
    return true;
  } catch (error) {
    console.error('[Buaze] Failed to send weekly digest:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(params: {
  to: string;
  code: string;
  resetUrl: string;
  locale?: 'tr' | 'en';
}) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('[Buaze] SMTP credentials not configured — cannot send password reset email.');
    return false;
  }

  const isTr = params.locale !== 'en';
  const subject = isTr ? 'Buaze - Şifre Sıfırlama Kodu' : 'Buaze - Password Reset Code';

  const title = isTr ? 'Şifre Sıfırlama' : 'Password Reset';
  const intro = isTr
    ? 'Hesabınız için bir şifre sıfırlama talebi aldık. Aşağıdaki 6 haneli kodu kullanarak şifrenizi yenileyebilirsiniz.'
    : 'We received a request to reset your account password. Use the 6-digit code below to set a new password.';
  const codeLabel = isTr ? 'Doğrulama Kodu' : 'Verification Code';
  const validity = isTr ? 'Bu kod 30 dakika boyunca geçerlidir.' : 'This code is valid for 30 minutes.';
  const cta = isTr ? 'Şifreyi Sıfırla' : 'Reset Password';
  const ignore = isTr
    ? 'Bu talebi siz yapmadıysanız bu e-postayı görmezden gelebilirsiniz — hesabınıza kimse erişemez.'
    : 'If you did not request this, you can safely ignore this email — your account remains secure.';
  const footer = isTr
    ? 'Bu e-posta Buaze tarafından otomatik gönderilmiştir.'
    : 'This email was sent automatically by Buaze.';

  const html = `
<!DOCTYPE html>
<html lang="${isTr ? 'tr' : 'en'}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f3f4f6;padding:40px 16px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;">
          <tr>
            <td style="background:#111827;border-radius:16px 16px 0 0;padding:28px 36px;">
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
          </tr>
          <tr>
            <td style="background:#ffffff;padding:32px 36px 8px;">
              <p style="margin:0;color:#9ca3af;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">${title}</p>
              <h1 style="margin:8px 0 16px;color:#111827;font-size:24px;font-weight:800;letter-spacing:-0.3px;">${title}</h1>
              <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.6;">${intro}</p>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:0 36px 24px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="background:#FDBF1D;border-radius:14px;padding:24px;text-align:center;">
                    <p style="margin:0 0 8px;color:#111827;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">${codeLabel}</p>
                    <p style="margin:0;color:#111827;font-size:40px;font-weight:900;letter-spacing:12px;font-family:'Courier New',monospace;">${params.code}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0;color:#6b7280;font-size:13px;text-align:center;">${validity}</p>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:0 36px 32px;text-align:center;">
              <a href="${params.resetUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 32px;border-radius:12px;letter-spacing:0.3px;">${cta} →</a>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:0 36px 32px;">
              <div style="border-top:1px solid #e5e7eb;padding-top:20px;">
                <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.6;">${ignore}</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#111827;border-radius:0 0 16px 16px;padding:20px 36px;">
              <p style="margin:0;font-size:12px;color:#6b7280;">${footer}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `${title}\n\n${intro}\n\n${codeLabel}: ${params.code}\n\n${validity}\n\n${cta}: ${params.resetUrl}\n\n${ignore}`;

  const resendKey = process.env.RESEND_API_KEY?.trim();
  try {
    await transporter.sendMail({
      from: (resendKey ? '"Buaze" <hello@buaze.com>' : (process.env.SMTP_FROM || '"Buaze" <hello@buaze.com>')),
      to: params.to,
      subject,
      text,
      html,
    });
    return true;
  } catch (error) {
    console.error('[Buaze] Failed to send password reset email:', error);
    return false;
  }
}
