import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { sendMail, sendFormConfirmationEmail } from '@/lib/email';
import { verifyRecaptchaToken } from '@/lib/recaptcha';

export const dynamic = 'force-dynamic';

function toInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.floor(value);
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.floor(n) : null;
  }
  return null;
}

function toFloat(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toDecimal(value: unknown): Prisma.Decimal | null {
  const f = toFloat(value);
  if (f === null) return null;
  return new Prisma.Decimal(f.toFixed(2));
}

function toStr(value: unknown, max = 200): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    /* ignore */
  }

  const ip = getClientIp(req.headers);
  const limit = rateLimit(`roi-save:${ip}`, 10, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: limit.retryAfterSeconds },
      { status: 429 },
    );
  }

  const captcha = await verifyRecaptchaToken(req, body.recaptchaToken, 'roi_save');
  if (!captcha.ok) {
    return NextResponse.json({ error: 'recaptcha_failed' }, { status: captcha.status });
  }

  const email = toStr(body.email);
  if (email && (!email.includes('@') || email.length > 200)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }

  const row = await prisma.rOIRequest.create({
    data: {
      email: email?.toLowerCase() ?? null,
      restaurantName: toStr(body.restaurantName),
      tables: toInt(body.tables),
      avgTicket: toDecimal(body.avgTicket),
      noShowRate: toFloat(body.noShowRate),
      projection:
        body.projection && typeof body.projection === 'object'
          ? (body.projection as Prisma.InputJsonValue)
          : undefined,
      ip,
    },
  });

  const salesInbox = process.env.NOTIFICATION_EMAIL;
  if (email && salesInbox) {
    const projectionSnippet =
      body.projection && typeof body.projection === 'object'
        ? `\n\nProjeksiyon: ${JSON.stringify(body.projection)}`
        : '';
    sendMail({
      to: salesInbox,
      replyTo: email,
      subject: `Buaze ROI hesaplayıcı · yeni lead · ${row.restaurantName ?? email}`,
      text: `Yeni ROI hesap lead'i geldi.\n\nEmail: ${email}\nİşletme: ${row.restaurantName ?? '-'}\nMasa: ${row.tables ?? '-'}\nOrt. kişi başı: ${row.avgTicket ?? '-'}\nNo-show oranı: ${row.noShowRate ?? '-'}${projectionSnippet}`,
      html: `<h3>Yeni ROI lead'i</h3><ul><li>Email: ${escape(email)}</li><li>İşletme: ${escape(row.restaurantName ?? '-')}</li><li>Masa: ${escape(String(row.tables ?? '-'))}</li><li>Ort. kişi başı: ${escape(String(row.avgTicket ?? '-'))}</li><li>No-show oranı: ${escape(String(row.noShowRate ?? '-'))}</li></ul>${projectionSnippet ? `<pre>${escape(projectionSnippet)}</pre>` : ''}`,
    }).catch((err) => {
      console.error('[roi/save] sales mail failed', err);
    });
  }

  // User-facing ROI confirmation. Pulse template, fire and forget.
  if (email) {
    const details: Array<{ label: string; value: string }> = [];
    if (row.restaurantName) details.push({ label: 'İşletme', value: row.restaurantName });
    if (row.tables !== null) details.push({ label: 'Masa', value: String(row.tables) });
    if (row.avgTicket) details.push({ label: 'Ortalama hesap', value: String(row.avgTicket) });
    sendFormConfirmationEmail({
      to: email,
      formType: 'roi',
      name: row.restaurantName,
      details,
    }).catch((err) => console.error('[roi/save] confirmation mail failed', err));
  }

  return NextResponse.json({ ok: true, id: row.id });
}

function escape(v: string) {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
