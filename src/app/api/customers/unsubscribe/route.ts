import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyUnsubscribeToken } from '@/lib/email-customer-campaign';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

// §38.48 Wave 2 — Customer campaign unsubscribe endpoint.
// Plan: Phase G.
//
// Mail body'sindeki "Listeden ayrıl" link + RFC 8058 List-Unsubscribe-Post
// header iki yöntem de aynı endpoint'e bağlı:
//   - GET ?token=...  → idempotent unsubscribe + Pulse "ayrıldın" sayfası
//   - POST ?token=... → RFC 8058 one-click (Gmail/Yahoo/Apple Mail bulk
//                       sender requirement) — 200 + JSON, redirect yok.
//
// Auth: yok (public endpoint, token-based dedupe). Token HMAC-signed
// (verifyUnsubscribeToken constant-time compare timing-attack guard).
//
// KVKK: Feedback.hasMarketingConsent = false set + CustomerEmailLog.status =
// 'unsubscribed'. Aynı restaurant'taki tüm contact_key kayıtları update edilir
// (cross-feedback propagate — owner farklı kayıtlarda email değiştirmiş olsa
// bile en azından bu campaign için tüm aynı email/phone unsubscribed sayılır).
//
// Idempotent: tekrar token ile unsubscribe çağrısı değişiklik yapmaz, başarı
// sayfası gösterir.

export const dynamic = 'force-dynamic';

const TR_PAGE = `
<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Aboneliğin sonlandı · Buaze</title>
<style>
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #FFFFFF;
    color: #0A0A0A;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
  .card {
    max-width: 420px;
    text-align: center;
    border: 1px solid #EDEDED;
    border-radius: 16px;
    padding: 40px 32px;
  }
  .eyebrow {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #737373;
    margin-bottom: 16px;
  }
  h1 {
    font-size: 22px;
    font-weight: 500;
    letter-spacing: -0.02em;
    margin: 0 0 12px;
  }
  p {
    font-size: 14px;
    line-height: 1.6;
    color: #525252;
    margin: 0 0 24px;
  }
  a {
    display: inline-block;
    padding: 10px 18px;
    background: #C6F24E;
    color: #0A0A0A;
    text-decoration: none;
    border-radius: 100px;
    font-weight: 600;
    font-size: 13px;
  }
  a:hover { background: #A8D62E; }
</style>
</head>
<body>
<main class="card">
  <div class="eyebrow">İletişim tercihi</div>
  <h1>Aboneliğin sonlandı.</h1>
  <p>Artık bu listeden mail almayacaksın. Ne zaman istersen restoran sahibi seni tekrar listeye ekleyebilir.</p>
  <a href="https://buaze.com">Buaze'a dön</a>
</main>
</body>
</html>`.trim();

const EN_PAGE = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>You're unsubscribed · Buaze</title>
<style>
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #FFFFFF;
    color: #0A0A0A;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
  .card {
    max-width: 420px;
    text-align: center;
    border: 1px solid #EDEDED;
    border-radius: 16px;
    padding: 40px 32px;
  }
  .eyebrow {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #737373;
    margin-bottom: 16px;
  }
  h1 {
    font-size: 22px;
    font-weight: 500;
    letter-spacing: -0.02em;
    margin: 0 0 12px;
  }
  p {
    font-size: 14px;
    line-height: 1.6;
    color: #525252;
    margin: 0 0 24px;
  }
  a {
    display: inline-block;
    padding: 10px 18px;
    background: #C6F24E;
    color: #0A0A0A;
    text-decoration: none;
    border-radius: 100px;
    font-weight: 600;
    font-size: 13px;
  }
  a:hover { background: #A8D62E; }
</style>
</head>
<body>
<main class="card">
  <div class="eyebrow">Email preferences</div>
  <h1>You're unsubscribed.</h1>
  <p>You will no longer receive emails from this list. The restaurant can add you back to the list whenever you wish.</p>
  <a href="https://buaze.com">Back to Buaze</a>
</main>
</body>
</html>`.trim();

const ERROR_PAGE_TR = `
<!DOCTYPE html>
<html lang="tr"><head><meta charset="UTF-8"><title>Bağlantı geçersiz · Buaze</title>
<style>body{margin:0;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;color:#0A0A0A}.card{max-width:420px;text-align:center;border:1px solid #EDEDED;border-radius:16px;padding:40px 32px}h1{font-size:20px;margin:0 0 12px}p{font-size:14px;line-height:1.6;color:#525252}</style>
</head><body><main class="card"><h1>Bağlantı bulunamadı</h1><p>Bu link geçersiz veya süresi dolmuş olabilir. Daha yeni bir mail'deki "buradan çık" bağlantısını kullanabilirsin.</p></main></body></html>`.trim();

async function processUnsubscribe(token: string): Promise<{ ok: boolean }> {
  const decoded = verifyUnsubscribeToken(token);
  if (!decoded) return { ok: false };

  const { campaignId, contactKey } = decoded;

  // Find campaign to get restaurantId scope.
  const campaign = await prisma.customerEmailCampaign.findUnique({
    where: { id: campaignId },
    select: { restaurantId: true },
  });
  if (!campaign) return { ok: false };

  // Update CustomerEmailLog status='unsubscribed' for this campaign + contact.
  // Best-effort: if log doesn't exist (edge case), still succeed.
  try {
    await prisma.customerEmailLog.updateMany({
      where: {
        campaignId,
        contactKey,
      },
      data: {
        status: 'unsubscribed',
      },
    });
  } catch {
    /* non-blocking */
  }

  // KVKK: Feedback.hasMarketingConsent = false for all matching contact rows
  // in the same restaurant. Cross-feedback propagate — same email/phone
  // can have multiple feedback rows; flip all consent flags off.
  try {
    await prisma.feedback.updateMany({
      where: {
        restaurantId: campaign.restaurantId,
        OR: [
          { email: { equals: contactKey, mode: 'insensitive' } },
          { phone: contactKey },
        ],
      },
      data: {
        hasMarketingConsent: false,
      },
    });
  } catch (err) {
    // Log but don't fail the unsubscribe — KVKK propagate is best-effort.
    console.error('[CUSTOMERS_UNSUBSCRIBE_PROPAGATE]', err);
  }

  return { ok: true };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const locale = url.searchParams.get('locale') === 'en' ? 'en' : 'tr';

  if (!token) {
    return new NextResponse(ERROR_PAGE_TR, {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // IP rate limit (audit §38.B M2). processUnsubscribe re-writes consent on
  // every call (not no-op idempotent), so a bot replaying a valid token can
  // spam updateMany. Generous cap keeps real human double-clicks unaffected.
  const ip = getClientIp(req.headers);
  const limit = await rateLimit(`customer-unsubscribe:get:${ip}`, 20, 60_000);
  if (!limit.allowed) {
    return new NextResponse(locale === 'en' ? EN_PAGE : TR_PAGE, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  const result = await processUnsubscribe(token);
  if (!result.ok) {
    return new NextResponse(ERROR_PAGE_TR, {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  return new NextResponse(locale === 'en' ? EN_PAGE : TR_PAGE, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

// RFC 8058 one-click POST — Gmail/Yahoo/Apple Mail's "Unsubscribe" button
// hits this without confirmation. 200 + JSON (no redirect). Same logic as
// GET, idempotent.
export async function POST(req: NextRequest) {
  // §38.78 — IP rate limit (CLAUDE.md §14.2 paterni). Token HMAC-verify
  // timing-safe compare zaten brute-force engeller; rate limit token reuse
  // loop + log bloat'a karşı ek savunma. RFC 8058 zorunluluğu: 200 OK her
  // durumda (token geçersiz / rate limit aşıldığında bile retry önleme).
  const ip = getClientIp(req.headers);
  const limit = await rateLimit(`customer-unsubscribe:ip:${ip}`, 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Token gerekli' }, { status: 400 });
  }
  const result = await processUnsubscribe(token);
  // RFC 8058 zorunluluğu: 200 OK her durumda (token geçersiz olsa bile, çünkü
  // mail client retry yapmasın). Bu davranış newsletter/unsubscribe ile aynı.
  return NextResponse.json({ ok: result.ok }, { status: 200 });
}
