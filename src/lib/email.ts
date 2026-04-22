import { SYSTEM_FEEDBACK } from './constants';
/**
 * Sends an email via Resend HTTP API.
 * This is the ONLY email sending method — no SMTP fallback.
 * Emails are sent from hello@buaze.com via Resend.
 */
async function sendResendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
}: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}) {
  const resendKey = process.env.RESEND_API_KEY?.trim();

  if (!resendKey || resendKey === "") {
    console.error("[Buaze Email] ❌ RESEND_API_KEY is missing or empty! Cannot send email.");
    console.error("[Buaze Email] Make sure RESEND_API_KEY is set in Vercel Environment Variables.");
    return false;
  }

  try {
    console.log("[Buaze Email] Sending via Resend API. To:", to, "Subject:", subject);
    console.log("[Buaze Email] API Key prefix:", resendKey.substring(0, 8) + "...");

    const payload: any = {
      from: "Buaze <noreply@buaze.com>",
      to,
      subject,
      html,
      text,
    };

    if (replyTo) {
      payload.reply_to = replyTo;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

    if (response.ok) {
      console.log("[Buaze Email] ✅ Successfully sent via Resend API. Response:", responseText);
      return true;
    } else {
      console.error(`[Buaze Email] ❌ Resend API error (HTTP ${response.status}):`, responseText);
      
      if (response.status === 403) {
        console.error("[Buaze Email] 🔑 API key may be invalid or domain not verified.");
        console.error("[Buaze Email] → Go to https://resend.com/domains and verify buaze.com");
      } else if (response.status === 422) {
        console.error("[Buaze Email] 📧 Invalid email parameters. Check 'from' domain is verified in Resend.");
        console.error("[Buaze Email] → The 'from' domain (buaze.com) must be added and DNS verified at https://resend.com/domains");
      } else if (response.status === 401) {
        console.error("[Buaze Email] 🔐 Unauthorized. RESEND_API_KEY is invalid.");
      }
      
      return false;
    }
  } catch (error) {
    console.error("[Buaze Email] ❌ Network/fetch exception:", error);
    return false;
  }
}

/**
 * Generic mail sender for other parts of the app.
 */
export async function sendMail({ to, subject, html, text, replyTo }: { to: string | string[], subject: string, html: string, text: string, replyTo?: string }) {
  return await sendResendEmail({ to, subject, html, text, replyTo });
}

// Helper for 3D UI elements in Email
const EMAIL_STYLES = `
  :root { color-scheme: light dark; }
  body { background-color: #f8fafc; color: #1e293b; }
  .card { 
    background-color: #ffffff; 
    border: 3px solid #1e293b; 
    box-shadow: 6px 6px 0px #1e293b; 
  }
  .btn { 
    background-color: #F4B400; 
    border: 3px solid #1e293b; 
    box-shadow: 4px 4px 0px #1e293b; 
    color: #1e293b !important;
  }
  @media (prefers-color-scheme: dark) {
    body { background-color: #0f172a !important; color: #f1f5f9 !important; }
    .card { background-color: #1e293b !important; border-color: #334155 !important; box-shadow: 6px 6px 0px #000000 !important; color: #f1f5f9 !important; }
    .btn { background-color: #F4B400 !important; border-color: #000000 !important; box-shadow: 4px 4px 0px #000000 !important; color: #000000 !important; }
    .text-muted { color: #94a3b8 !important; }
    .bg-accent { background-color: #334155 !important; }
    .border-accent { border-color: #475569 !important; }
  }
`;

const SHARED_LAYOUT = (content: string, title: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>${EMAIL_STYLES}</style>
</head>
<body style="margin:0;padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,'DM Sans',Roboto,Helvetica,Arial,sans-serif;">
  <div align="center">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;">
      <tr>
        <td class="card" style="padding:40px;border-radius:16px;">
          <!-- Header -->
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:32px;">
            <tr>
              <td>
                <div style="background:#F4B400;border:2px solid #1e293b;border-radius:10px;width:40px;height:40px;text-align:center;display:inline-block;vertical-align:middle;">
                  <span style="font-size:20px;font-weight:900;color:#1e293b;line-height:40px;">B</span>
                </div>
                <span style="font-size:24px;font-weight:900;margin-left:12px;vertical-align:middle;">Buaze</span>
              </td>
              <td align="right" style="vertical-align:middle;">
                <span style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;opacity:0.6;">${title}</span>
              </td>
            </tr>
          </table>

          ${content}

          <!-- Footer -->
          <div style="margin-top:40px;padding-top:24px;border-top:2px dashed #cbd5e1;" class="border-accent">
            <p style="margin:0;font-size:12px;opacity:0.6;" class="text-muted">
              © ${new Date().getFullYear()} Buaze. Tüm hakları saklıdır. <br/>
              Premium Müşteri Deneyimi Platformu
            </p>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
`;

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
  return `<span style="color:#F4B400;font-size:28px;letter-spacing:2px;">${filled}</span><span style="color:#d1d5db;font-size:28px;letter-spacing:2px;">${empty}</span>`;
}

function getRatingColor(rating: number): string {
  if (rating <= 2) return '#ef4444';
  if (rating === 3) return '#F4B400';
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
  const recipientEmail = data.toEmail || process.env.NOTIFICATION_EMAIL || 'hello@buaze.com';
  if (!recipientEmail) {
    console.warn("No notification email configured. Skipping email.");
    return;
  }

  const restaurantName = data.restaurantName || 'Restoran';
  const ratingColor = getRatingColor(data.rating);
  const ratingLabel = getRatingLabel(data.rating);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com';
  const isCritical = data.rating <= 2;

  const content = `
    <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;letter-spacing:-1px;">Yeni Değerlendirme!</h1>
    <p style="margin:0 0 24px;font-size:16px;opacity:0.8;">${restaurantName} için yeni bir müşteri geri bildirimi aldınız.</p>

    <div style="background:${ratingColor}15;border:2px solid ${ratingColor};border-radius:14px;padding:30px;margin-bottom:24px;text-align:center;" class="bg-accent border-accent">
      <div style="font-size:56px;font-weight:900;color:${ratingColor};line-height:1;margin-bottom:8px;">${data.rating}</div>
      <div style="font-size:14px;font-weight:800;text-transform:uppercase;color:${ratingColor};">${ratingLabel}</div>
      <div style="margin-top:12px;">${renderStars(data.rating)}</div>
    </div>

    ${data.comment && data.comment !== SYSTEM_FEEDBACK.HIGH_RATING_REDIRECT ? `
    <div style="margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:800;text-transform:uppercase;opacity:0.6;">Müşteri Yorumu</p>
      <div style="background:#f1f5f9;border-radius:12px;padding:20px;font-style:italic;line-height:1.6;" class="bg-accent font-dark">
        "${data.comment.replace(/\n/g, '<br>')}"
      </div>
    </div>
    ` : ''}

    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:32px;">
      ${data.branch ? `<tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px;opacity:0.6;" class="border-accent">Şube</td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px;font-weight:700;text-align:right;" class="border-accent">${data.branch}</td></tr>` : ''}
      ${data.tableNumber ? `<tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px;opacity:0.6;" class="border-accent">Masa</td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px;font-weight:700;text-align:right;" class="border-accent">${data.tableNumber}</td></tr>` : ''}
      ${data.name ? `<tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px;opacity:0.6;" class="border-accent">Müşteri</td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px;font-weight:700;text-align:right;" class="border-accent">${data.name}</td></tr>` : ''}
      ${data.phone ? `<tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px;opacity:0.6;" class="border-accent">Telefon</td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px;font-weight:700;text-align:right;" class="border-accent">${data.phone}</td></tr>` : ''}
      ${data.email ? `<tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px;opacity:0.6;" class="border-accent">E-posta</td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px;font-weight:700;text-align:right;" class="border-accent">${data.email}</td></tr>` : ''}
      <tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px;opacity:0.6;" class="border-accent">Tarih</td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px;font-weight:700;text-align:right;" class="border-accent">${new Date().toLocaleString('tr-TR')}</td></tr>
    </table>

    <div align="center">
      <a href="${appUrl}/tr/auth/login?redirect=${encodeURIComponent('/tr/dashboard/feedbacks' + (data.feedbackId ? `?highlight=${data.feedbackId}` : ''))}" class="btn" style="display:inline-block;padding:16px 40px;font-size:16px;font-weight:900;text-decoration:none;border-radius:12px;">
        ${isCritical ? 'Hemen Müdahale Et →' : 'Geri Bildirimi Gör →'}
      </a>
    </div>
  `;

  const subject = `${isCritical ? '🚨' : '✨'} ${data.rating} Yıldız - ${restaurantName}`;
  const html = SHARED_LAYOUT(content, 'Feedback Alert');
  
  await sendResendEmail({
    to: recipientEmail,
    subject,
    html,
    text: `${restaurantName}: ${data.rating} Yıldız Değerlendirme Alındı.`,
  });
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
  const { to, locale, restaurantName, period, stats } = params;
  const isTr = locale !== 'en';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com';
  const formatDate = (d: Date) => d.toLocaleDateString(isTr ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short' });
  const periodStr = `${formatDate(period.from)} - ${formatDate(period.to)}`;

  const copy = isTr ? {
    title: 'Haftalık Rapor',
    avg: 'Ortalama',
    total: 'Toplam',
    high: 'Pozitif',
    low: 'Negatif',
    dist: 'Puan Dağılımı',
    cta: 'Tüm Detayları Gör →'
  } : {
    title: 'Weekly Report',
    avg: 'Average',
    total: 'Total',
    high: 'Positive',
    low: 'Negative',
    dist: 'Rating Distribution',
    cta: 'View Details →'
  };

  const distRows = [5, 4, 3, 2, 1].map(star => {
    const count = stats.distribution[star] || 0;
    const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
    const barColor = star >= 4 ? '#22c55e' : star === 3 ? '#F4B400' : '#ef4444';
    return `
      <tr>
        <td style="padding:4px 0;width:30px;font-size:12px;font-weight:800;">${star}★</td>
        <td style="padding:4px 0;">
          <div style="background:#e2e8f0;border-radius:100px;height:8px;overflow:hidden;" class="bg-accent">
            <div style="background:${barColor};height:100%;width:${pct}%"></div>
          </div>
        </td>
        <td style="padding:4px 0;width:40px;text-align:right;font-size:12px;opacity:0.6;">${pct}%</td>
      </tr>
    `;
  }).join('');

  const content = `
    <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;letter-spacing:-1px;">${copy.title}</h1>
    <p style="margin:0 0 32px;font-size:16px;opacity:0.8;">${restaurantName} için ${periodStr} özeti.</p>

    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:32px;">
      <tr>
        <td style="width:50%;padding-right:10px;">
          <div class="card" style="padding:20px;text-align:center;border-radius:12px;box-shadow:4px 4px 0px #1e293b;">
            <div style="font-size:32px;font-weight:900;color:#F4B400;">${stats.avgRating}</div>
            <div style="font-size:11px;font-weight:800;text-transform:uppercase;opacity:0.6;">${copy.avg}</div>
          </div>
        </td>
        <td style="width:50%;padding-left:10px;">
          <div class="card" style="padding:20px;text-align:center;border-radius:12px;box-shadow:4px 4px 0px #1e293b;">
            <div style="font-size:32px;font-weight:900;">${stats.total}</div>
            <div style="font-size:11px;font-weight:800;text-transform:uppercase;opacity:0.6;">${copy.total}</div>
          </div>
        </td>
      </tr>
    </table>

    <div style="margin-bottom:32px;">
      <p style="margin:0 0 12px;font-size:12px;font-weight:800;text-transform:uppercase;opacity:0.6;">${copy.dist}</p>
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        ${distRows}
      </table>
    </div>

    <div align="center">
      <a href="${appUrl}/admin/dashboard" class="btn" style="display:inline-block;padding:16px 40px;font-size:16px;font-weight:900;text-decoration:none;border-radius:12px;">
        ${copy.cta}
      </a>
    </div>
  `;

  const subject = `📊 ${copy.title} - ${restaurantName}`;
  const html = SHARED_LAYOUT(content, 'Weekly Insights');

  return await sendResendEmail({
    to,
    subject,
    html,
    text: `${restaurantName} haftalık raporu hazır.`,
  });
}

export async function sendPasswordResetEmail(params: {
  to: string;
  code: string;
  resetUrl: string;
  locale?: 'tr' | 'en';
}) {
  const isTr = params.locale !== 'en';
  const subject = isTr ? 'Buaze - Şifre Sıfırlama' : 'Buaze - Password Reset';
  const copy = isTr ? {
    title: 'Şifrenizi mi Unuttunuz?',
    intro: 'Hesabınız için bir şifre sıfırlama talebi aldık. Eğer bu talebi siz yapmadıysanız lütfen bu e-postayı dikkate almayın.',
    codeLabel: 'Doğrulama Kodunuz',
    cta: 'Şifreyi Yenile →'
  } : {
    title: 'Forgot Password?',
    intro: 'We received a request to reset your password. If you didn\'t make this request, please ignore this email.',
    codeLabel: 'Your Reset Code',
    cta: 'Reset Password →'
  };

  const content = `
    <h1 style="margin:0 0 16px;font-size:28px;font-weight:900;letter-spacing:-1px;">${copy.title}</h1>
    <p style="margin:0 0 32px;font-size:16px;opacity:0.8;line-height:1.6;">${copy.intro}</p>

    <div style="background:#f1f5f9;border:3px solid #1e293b;border-radius:16px;padding:32px;margin-bottom:32px;text-align:center;" class="bg-accent border-accent">
      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;opacity:0.6;">${copy.codeLabel}</div>
      <div style="font-size:48px;font-weight:900;letter-spacing:8px;font-family:monospace;color:#1e293b;">${params.code}</div>
    </div>

    <div align="center">
      <a href="${params.resetUrl}" class="btn" style="display:inline-block;padding:16px 40px;font-size:16px;font-weight:900;text-decoration:none;border-radius:12px;">
        ${copy.cta}
      </a>
    </div>
  `;

  const html = SHARED_LAYOUT(content, 'Security');

  return await sendResendEmail({
    to: params.to,
    subject,
    html,
    text: `${copy.title}: ${params.code}`,
  });
}
