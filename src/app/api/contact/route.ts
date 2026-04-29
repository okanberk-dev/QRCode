import { NextRequest, NextResponse } from 'next/server';
import { sendContactAdminEmail, sendFormConfirmationEmail } from '@/lib/email';
import { verifyRecaptchaToken } from '@/lib/recaptcha';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

// Must stay in sync with ContactForm.tsx — form under this dwell time is bot-like.
const MIN_FILL_MS = 2500;

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
    const { name, email, phone, business, message, kvkk, marketing, website, renderedAt } = body;

    // Bot guard — honeypot field filled, or form submitted implausibly fast.
    // Respond 200 so scrapers don't learn the trap, but skip the mail send.
    const dwell = typeof renderedAt === 'number' ? Date.now() - renderedAt : Infinity;
    if ((typeof website === 'string' && website.trim() !== '') || dwell < MIN_FILL_MS) {
      return NextResponse.json({ success: true });
    }

    if (!name || !email || !message || !kvkk) {
      return NextResponse.json({ error: 'Gerekli alanlar eksik veya KVKK onayı verilmemiş.' }, { status: 400 });
    }

    const captcha = await verifyRecaptchaToken(req, body.recaptchaToken, 'contact_submit');
    if (!captcha.ok) {
      return NextResponse.json({ error: captcha.error }, { status: captcha.status });
    }

    // Admin notification — Pulse design (CLAUDE.md §21.6). Replaces the
    // legacy neo-brutalist inline HTML; `replyTo` set to the submitter's
    // email so admins can hit Reply directly.
    const success = await sendContactAdminEmail({
      to: ['hello@buaze.com', 'okanberk16@gmail.com'],
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

    // User-facing confirmation — fire and forget; the contact submission
    // already succeeded internally, no reason to fail the request if this
    // hiccups.
    void sendFormConfirmationEmail({
      to: email,
      formType: 'contact',
      name,
      details: business ? [{ label: 'İşletme', value: String(business) }] : undefined,
    }).catch((err) => console.error('[contact] confirmation mail failed', err));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact form email failed:', error);
    const message = error instanceof Error ? error.message : 'E-posta gönderilirken bir hata oluştu.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
