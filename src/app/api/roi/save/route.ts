import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { sendResendEmail } from '@/lib/email-internal';
import { verifyRecaptchaToken } from '@/lib/recaptcha';
import { generateRoiPdfBase64 } from '@/lib/roi/generate-roi-pdf';
import type { RoiPdfData } from '@/lib/roi/RoiPdf';
import {
  buildRoiTemplateInsight,
  generateRoiInsight,
  type RoiInsight,
} from '@/lib/roi/generate-insight';
import { computeRoi, isRoiSector, normalizeRoiInputs } from '@/lib/roi/roi-model';
import {
  buildInsightCacheKey,
  getCachedInsight,
  setCachedInsight,
} from '@/lib/roi/insight-cache';
import { checkSpamGuard } from '@/lib/roi/spam-guard';
import { renderRoiAdminNotification } from '@/lib/email/templates/roi-admin-notification';
import { renderRoiCustomerReport } from '@/lib/email/templates/roi-customer-report';

export const dynamic = 'force-dynamic';
// Toplam request budget: AI insight (8s timeout) + PDF render (1-2s) +
// 2 mail send (1-2s). Vercel default 10s yetmez; 30s explicit cap güvenli.
export const maxDuration = 30;

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
  // CRLF strip — restaurantName / phone subject veya mail header'a
  // gidebilir; defansif sanitization. Resend HTTP API JSON-encoded body
  // kullansa da defense-in-depth: header injection / line break artifact
  // önler.
  const cleaned = value.replace(/[\r\n\t]/g, ' ').trim();
  if (!cleaned) return null;
  return cleaned.slice(0, max);
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    /* ignore */
  }

  const ip = getClientIp(req.headers);
  const limit = await rateLimit(`roi-save:${ip}`, 10, 10 * 60 * 1000);
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

  // Spam guard — reCAPTCHA Enterprise üstüne defense-in-depth katmanı.
  // Honeypot / disposable email / submission velocity. Bot'a "başarılı"
  // yanıt döndürürüz (200 + ok:true) — gerçek müşteri akışını (DB write,
  // PDF, AI, mail) tetiklemeyiz; bot loop'ları heyecanlanır ama lead
  // düşmez. CLAUDE.md §14.1 reCAPTCHA pattern'i ile uyumlu.
  if (email) {
    const guard = checkSpamGuard({
      email,
      honeypot: body.website_url, // form'daki hidden field
      formStartedAt: typeof body.formStartedAt === 'number' ? body.formStartedAt : undefined,
    });
    if (!guard.ok) {
      console.warn('[roi/save] spam guard rejected', {
        reason: guard.reason,
        ip,
        emailDomain: email.split('@')[1],
      });
      // Sessiz başarı — bot 200 alır, DB / mail tetiklenmez.
      return NextResponse.json({ ok: true });
    }
  }

  const phone = toStr(body.phone, 60);
  const locale: 'tr' | 'en' = body.locale === 'en' ? 'en' : 'tr';
  const restaurantName = toStr(body.restaurantName);

  // Email + işletme adı ikisi de yoksa lead value sıfır → DB'ye yazma.
  // Bot rate-limit içinde kalıp anonim form post etse bile rOIRequest
  // tablosu kirlenmesin. Legitimate "abandon-with-projection" akışında
  // kullanıcı en az birini doldurur (en azından restoran adı).
  if (!email && !restaurantName) {
    return NextResponse.json({ ok: true });
  }

  // Size-cap the user-supplied projection JSON before handing it to Prisma.
  // Without a cap an attacker can stuff a multi-megabyte object into the
  // JSONB column on every request and bloat the DB. 50 KB easily covers a
  // legitimate ROI calculator payload (KPIs + per-platform breakdown) with
  // multiple-x headroom.
  const MAX_PROJECTION_BYTES = 50_000;
  let projectionJson: Prisma.InputJsonValue | undefined;
  if (body.projection && typeof body.projection === 'object') {
    try {
      const serialized = JSON.stringify(body.projection);
      if (serialized.length <= MAX_PROJECTION_BYTES) {
        projectionJson = body.projection as Prisma.InputJsonValue;
      } else {
        console.warn('[roi/save] projection too large — dropped', {
          bytes: serialized.length,
          limit: MAX_PROJECTION_BYTES,
        });
      }
    } catch {
      /* unserializable (cycle, BigInt, etc.) — drop silently */
    }
  }

  const row = await prisma.rOIRequest.create({
    data: {
      email: email?.toLowerCase() ?? null,
      restaurantName,
      tables: toInt(body.tables),
      avgTicket: toDecimal(body.avgTicket),
      noShowRate: toFloat(body.noShowRate),
      projection: projectionJson,
      ip,
    },
  });

  // Mail dispatch:
  // 1. Recompute the estimate on the server from the visitor's inputs
  //    (roi-model) — the client's own result is never trusted for the mails.
  // 2. Summary (AI or template), then a single PDF render.
  // 3. Visitor mail (PDF attached) and sales mail (needs an email address).
  const pdfData = buildRoiPdfData(body, row, email, locale);

  if (pdfData) {
    // Cache + dedupe: aynı senaryo için tek bir OpenAI çağrısı (24 saat
    // TTL); aynı email son 24 saat içinde aynı projection ile geldiyse
    // sales mail tekrar gönderilmez (operatör spam'i yok).
    const cacheKey = buildInsightCacheKey(pdfData, locale);
    const cachedInsight = await getCachedInsight(cacheKey);
    const isDuplicate = cachedInsight !== null;

    // AI insight önce, sonra tek PDF render. Eski paralel akış AI sonucu
    // gelince PDF'i 2. kez render ediyordu (~1-2s ekstra latency).
    // generateRoiInsight kendi içinde 8s timeout'lu; başarısız olursa
    // null döner ve aşağıdaki insightOrFallback kapsar — PDF bir kez,
    // doğru insight ile basılır.
    const insight: RoiInsight | null = cachedInsight
      ? cachedInsight
      : await generateRoiInsight({ data: pdfData, locale })
          .then(async (result) => {
            if (result) {
              // Sadece AI source'lu insight'ı cache'le; template fallback'i
              // her zaman yeniden hesaplansın (deterministic + cheap).
              if (result.source === 'ai') {
                await setCachedInsight(cacheKey, result).catch((err) =>
                  console.error('[roi/save] cache write failed', err),
                );
              }
              return result;
            }
            return null;
          })
          .catch((err) => {
            console.error('[roi/save] insight generation failed', err);
            return null as RoiInsight | null;
          });

    // Template summary when the AI path is unavailable or rejected — the PDF
    // and the mails always carry a summary.
    const insightOrFallback: RoiInsight = insight ?? buildRoiTemplateInsight({ data: pdfData, locale });

    // Single PDF render with the final summary.
    const pdfBase64 = await generateRoiPdfBase64({
      ...pdfData,
      insight: insightOrFallback,
    }).catch((err) => {
      console.error('[roi/save] pdf generation failed', err);
      return null;
    });

    const safeName =
      (pdfData.restaurantName || 'isletme')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 40) || 'isletme';
    const attachments = pdfBase64
      ? [
          {
            filename: `buaze-roi-${safeName}.pdf`,
            content: pdfBase64,
            contentType: 'application/pdf',
          },
        ]
      : undefined;

    // Visitor mail (Pulse roi-customer-report) — only with an email address.
    if (email) {
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.buaze.com').replace(/\/+$/, '');
      // The form does not collect a first name; the template greets the team.
      const customerRendered = await renderRoiCustomerReport(
        {
          restaurantName: pdfData.restaurantName,
          firstName: null,
          inputs: pdfData.inputs,
          estimate: pdfData.result,
          planName: pdfData.planName,
          aiSummary: insightOrFallback.summary,
          aiHighlight: insightOrFallback.highlight,
          aiNextSteps: insightOrFallback.nextSteps,
          aiSource: insightOrFallback.source,
          hasPdf: !!attachments,
          contactUrl: `${appUrl}/${locale}/contact`,
          pricingUrl: `${appUrl}/${locale}/pricing`,
          registerUrl: `${appUrl}/${locale}/auth/register`,
        },
        locale,
      );
      sendResendEmail({
        template: 'roi-customer-report',
        locale,
        to: email,
        subject: customerRendered.subject,
        html: customerRendered.html,
        text: customerRendered.text,
        attachments,
        logMetadata: { plan: pdfData.planName ?? 'none', hoursSaved: pdfData.result.hoursSaved },
      }).catch((err) => console.error('[roi/save] customer mail failed', err));
    }

    // Sales mail (Pulse roi-admin-notification) — needs an email and a sales
    // inbox. De-duplication: when the same estimate arrived in the last 24 h
    // (insight cache hit) the sales mail is NOT sent again; the visitor mail
    // still goes out (they may have asked for the PDF again).
    const salesInbox = process.env.NOTIFICATION_EMAIL;
    if (email && salesInbox && !isDuplicate) {
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.buaze.com').replace(/\/+$/, '');
      const adminRendered = await renderRoiAdminNotification(
        {
          email,
          restaurantName: pdfData.restaurantName,
          phone,
          sector: pdfData.sector,
          planName: pdfData.planName,
          inputs: pdfData.inputs,
          estimate: pdfData.result,
          aiSummary: insightOrFallback.summary,
          aiHighlight: insightOrFallback.highlight,
          aiNextSteps: insightOrFallback.nextSteps,
          aiSource: insightOrFallback.source,
          panelUrl: `${appUrl}/admin/customers`,
          ip,
        },
        locale,
      );
      sendResendEmail({
        template: 'roi-admin-notification',
        locale,
        to: salesInbox,
        replyTo: email,
        subject: adminRendered.subject,
        html: adminRendered.html,
        text: adminRendered.text,
        logMetadata: { plan: pdfData.planName ?? 'none', sector: pdfData.sector },
      }).catch((err) => console.error('[roi/save] admin sales mail failed', err));
    }
  }

  return NextResponse.json({ ok: true, id: row.id });
}

// Turns the submitted projection into the typed report payload. Only the
// visitor's inputs are read; the estimate is recomputed here with the same
// model the calculator uses, so a tampered client result never reaches the
// PDF or the mails. Unexpected shape → null (no PDF, no summary, no mails).
function buildRoiPdfData(
  body: Record<string, unknown>,
  row: { restaurantName: string | null },
  email: string | null,
  locale: 'tr' | 'en',
): RoiPdfData | null {
  const proj = body.projection;
  if (!proj || typeof proj !== 'object') return null;
  const p = proj as Record<string, unknown>;
  if (!p.inputs || typeof p.inputs !== 'object') return null;

  const inputs = normalizeRoiInputs(p.inputs as Record<string, unknown>, locale);
  const planName = toStr(p.planName, 60);

  return {
    restaurantName: row.restaurantName ?? (locale === 'en' ? 'Your business' : 'İşletmeniz'),
    email: email ?? '',
    generatedAt: new Date(),
    locale,
    sector: isRoiSector(p.sector) ? p.sector : 'other',
    planName: inputs.planMonthlyUsd === null ? null : planName,
    inputs,
    result: computeRoi(inputs),
  };
}
