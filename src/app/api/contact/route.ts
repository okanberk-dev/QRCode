import { NextRequest, NextResponse } from 'next/server';
import { sendContactAdminEmail, sendFormConfirmationEmail } from '@/lib/email';
import { verifyRecaptchaToken } from '@/lib/recaptcha';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { isValidEmail } from '@/lib/validations';
import { recordConsent } from '@/lib/legal/consent';
import { isSupportedLegalLocale, type LegalLocale } from '@/lib/legal/keys';

// Must stay in sync with ContactForm.tsx — form under this dwell time is bot-like.
const MIN_FILL_MS = 2500;

// Strip CR / LF / TAB so user-supplied free text can't escape into mail
// headers (defense-in-depth — Resend HTTP API JSON-encodes the payload, but
// we don't want to depend on transport encoding for header safety).
function stripCtl(value: unknown, max = 1000): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/[\r\n\t]/g, ' ').trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

// Inbox recipients — env-driven so staff additions / departures don't require
// a code change. Falls back to the generic NOTIFICATION_EMAIL pattern so the
// route doesn't silently send to a single hardcoded inbox if the env is
// forgotten on a fresh deploy.
function resolveContactInbox(): string[] {
  const list = (process.env.CONTACT_INBOX_EMAILS || process.env.NOTIFICATION_EMAIL || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length ? list : ['hello@buaze.com'];
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit before parsing body — 3 contact form submissions per IP
    // per 10 min. Resend mail send is per-submission so an unbounded form
    // = unbounded mail spend.
    const ip = getClientIp(req.headers);
    const limit = await rateLimit(`contact:ip:${ip}`, 3, 10 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds || 600) } },
      );
    }

    const body = await req.json();
    const { kvkk, marketing, website, renderedAt } = body;

    // Bot guard — honeypot field filled, or form submitted implausibly fast.
    // Respond 200 so scrapers don't learn the trap, but skip the mail send.
    const dwell = typeof renderedAt === 'number' ? Date.now() - renderedAt : Infinity;
    if ((typeof website === 'string' && website.trim() !== '') || dwell < MIN_FILL_MS) {
      return NextResponse.json({ success: true });
    }

    // Sanitize free-text fields *before* truthiness checks — strips CRLF and
    // caps length, keeping mail-header / spam-rule attacks contained.
    const name = stripCtl(body.name, 200);
    const emailRaw = stripCtl(body.email, 200);
    const phone = stripCtl(body.phone, 60);
    const business = stripCtl(body.business, 200);
    const message = stripCtl(body.message, 4000);

    if (!name || !emailRaw || !message || !kvkk) {
      return NextResponse.json({ error: 'Gerekli alanlar eksik veya KVKK onayı verilmemiş.' }, { status: 400 });
    }

    if (!isValidEmail(emailRaw)) {
      return NextResponse.json({ error: 'Geçerli bir e-posta adresi girin.' }, { status: 400 });
    }
    const email = emailRaw.toLowerCase();

    const captcha = await verifyRecaptchaToken(req, body.recaptchaToken, 'contact_submit');
    if (!captcha.ok) {
      return NextResponse.json({ error: captcha.error }, { status: captcha.status });
    }

    // Admin notification — Pulse design (CLAUDE.md §21.6). `replyTo` is the
    // submitter's e-mail (already CRLF-stripped + RFC validated) so admins
    // can hit Reply directly. Inbox list comes from env (no personal e-mails
    // hardcoded; see resolveContactInbox).
    const success = await sendContactAdminEmail({
      to: resolveContactInbox(),
      replyTo: email,
      name,
      email,
      phone,
      business,
      message,
      marketingConsent: !!marketing,
      sourcePath: 'buaze.com/iletisim',
    });

    if (!success) throw new Error('Mail sending failed');

    // Stage 31b §38.108 — KVKK §10 + ETK m.6 consent log. /api/contact form
    // KVKK + ticari ileti checkbox accept ediyordu ama recordConsent
    // çağırmıyordu (audit gap). Şimdi kvkk=true zorunlu (yukarıda 400
    // gate); marketing=true ise opsiyonel ETK izni log'lanır. Fire-and-
    // forget — log fail mail send'i kırmamalı.
    {
      const ua = req.headers.get('user-agent');
      const localeRaw = typeof body.locale === 'string' ? body.locale.toLowerCase() : 'tr';
      const consentLocale: LegalLocale = isSupportedLegalLocale(localeRaw) ? localeRaw : 'tr';
      void recordConsent({
        key: 'kvkk-aydinlatma',
        locale: consentLocale,
        subjectType: 'email',
        subjectId: email,
        source: 'contact',
        granted: true,
        ipAddress: ip ?? null,
        userAgent: ua,
      });
      if (marketing) {
        void recordConsent({
          key: 'ticari-ileti',
          locale: consentLocale,
          subjectType: 'email',
          subjectId: email,
          source: 'contact',
          granted: true,
          ipAddress: ip ?? null,
          userAgent: ua,
        });
      }
    }

    // User-facing confirmation — fire and forget; the contact submission
    // already succeeded internally, no reason to fail the request if this
    // hiccups.
    void sendFormConfirmationEmail({
      to: email,
      formType: 'contact',
      name,
      details: business ? [{ label: 'İşletme', value: business }] : undefined,
    }).catch((err) => console.error('[contact] confirmation mail failed', err));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact form email failed:', error);
    const message = error instanceof Error ? error.message : 'E-posta gönderilirken bir hata oluştu.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
