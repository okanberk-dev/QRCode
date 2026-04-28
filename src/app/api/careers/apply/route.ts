import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { sendMail, sendFormConfirmationEmail } from '@/lib/email';
import { isStorageConfigured, uploadToStorage } from '@/lib/supabase-storage';
import { verifyRecaptchaToken } from '@/lib/recaptcha';

export const dynamic = 'force-dynamic';

const DATA_URL_RE = /^data:([a-zA-Z0-9.+\/-]+);base64,(.+)$/;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
]);

function toStr(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function extFromMime(mime: string): string {
  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'application/msword') return 'doc';
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/jpeg') return 'jpg';
  return 'bin';
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const limit = await rateLimit(`careers-apply:${ip}`, 5, 30 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: limit.retryAfterSeconds },
      { status: 429 },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const captcha = await verifyRecaptchaToken(req, body.recaptchaToken, 'careers_apply');
  if (!captcha.ok) {
    return NextResponse.json({ error: 'recaptcha_failed' }, { status: captcha.status });
  }

  const name = toStr(body.name, 120);
  const email = toStr(body.email, 200)?.toLowerCase() ?? null;
  const message = toStr(body.message, 4000);
  const roleSlug = toStr(body.roleSlug, 64);
  const portfolio = toStr(body.portfolio, 500);
  const localeParam = toStr(body.locale, 4);
  const locale = localeParam === 'en' ? 'en' : 'tr';

  if (!name || !email || !email.includes('@')) {
    return NextResponse.json({ error: 'invalid_input', hint: 'name + email required' }, { status: 400 });
  }

  let attachmentUrl: string | null = null;
  const attachmentRaw = typeof body.attachment === 'string' ? body.attachment : null;

  if (attachmentRaw) {
    const match = DATA_URL_RE.exec(attachmentRaw);
    if (!match) {
      // Already-hosted URL — keep as-is if looks remote.
      if (/^https?:\/\//i.test(attachmentRaw) && attachmentRaw.length <= 500) {
        attachmentUrl = attachmentRaw;
      } else {
        return NextResponse.json({ error: 'invalid_attachment' }, { status: 400 });
      }
    } else {
      const mime = match[1];
      const base64 = match[2];
      if (!ALLOWED_MIME.has(mime)) {
        return NextResponse.json({ error: 'unsupported_mime', mime }, { status: 400 });
      }
      const buf = Buffer.from(base64, 'base64');
      if (buf.byteLength > MAX_ATTACHMENT_BYTES) {
        return NextResponse.json({ error: 'attachment_too_large' }, { status: 413 });
      }
      if (!isStorageConfigured()) {
        return NextResponse.json({ error: 'storage_unconfigured' }, { status: 503 });
      }
      const ext = extFromMime(mime);
      const path = `careers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      try {
        attachmentUrl = await uploadToStorage(buf, path, mime);
      } catch (err) {
        console.error('[careers/apply] storage upload failed', err);
        return NextResponse.json({ error: 'upload_failed' }, { status: 502 });
      }
    }
  }

  const row = await prisma.careerApplication.create({
    data: {
      name,
      email,
      message,
      roleSlug,
      portfolio,
      attachment: attachmentUrl,
      locale,
      ip,
    },
  });

  const hrInbox = process.env.CAREERS_INBOX_EMAIL || process.env.NOTIFICATION_EMAIL;
  if (hrInbox) {
    sendMail({
      to: hrInbox,
      replyTo: email,
      subject: `Buaze kariyer başvurusu · ${roleSlug ?? 'general'} · ${name}`,
      text: [
        `Yeni kariyer başvurusu.`,
        ``,
        `İsim: ${name}`,
        `Email: ${email}`,
        `Rol: ${roleSlug ?? '-'}`,
        `Portfolyo: ${portfolio ?? '-'}`,
        `Dosya: ${attachmentUrl ?? '-'}`,
        ``,
        `Mesaj:`,
        message ?? '-',
      ].join('\n'),
      html: `<h3>Yeni kariyer başvurusu</h3>
<ul>
  <li>İsim: ${esc(name)}</li>
  <li>Email: ${esc(email)}</li>
  <li>Rol: ${esc(roleSlug ?? '-')}</li>
  <li>Portfolyo: ${portfolio ? `<a href="${esc(portfolio)}">${esc(portfolio)}</a>` : '-'}</li>
  <li>Dosya: ${attachmentUrl ? `<a href="${esc(attachmentUrl)}">${esc(attachmentUrl)}</a>` : '-'}</li>
</ul>
<h4>Mesaj</h4>
<pre style="white-space:pre-wrap;font-family:inherit">${esc(message ?? '-')}</pre>`,
    }).catch((err) => {
      console.error('[careers/apply] hr mail failed', err);
    });
  }

  // Applicant confirmation — Pulse template, fire and forget.
  sendFormConfirmationEmail({
    to: email,
    formType: 'career',
    name,
    details: roleSlug ? [{ label: 'Pozisyon', value: roleSlug }] : undefined,
  }).catch((err) => console.error('[careers/apply] confirmation mail failed', err));

  return NextResponse.json({ ok: true, id: row.id });
}

function esc(v: string) {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
