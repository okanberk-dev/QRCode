import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { sendResendEmail } from '@/lib/email-internal';
import { verifyRecaptchaToken } from '@/lib/recaptcha';
import { generateRoiPdfBase64 } from '@/lib/roi/generate-roi-pdf';
import type { RoiPdfData } from '@/lib/roi/RoiPdf';
import { generateRoiInsight, type RoiInsight } from '@/lib/roi/generate-insight';
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

  const row = await prisma.rOIRequest.create({
    data: {
      email: email?.toLowerCase() ?? null,
      restaurantName,
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

  // Pulse mail dispatch akışı:
  // 1. PDF için tipli RoiPdfData üret
  // 2. AI insight + PDF base64 paralel — biri diğerini bloklamaz
  // 3. Customer mail (PDF attachment + AI insight body)
  // 4. Sales mail (AI insight + KPI + senaryo)
  //
  // Email yoksa müşteri mail'i gönderilmez ama sales mail (panel ekibi
  // operatöre triage etmesi için) yine gönderilir — eğer en az bir
  // anlamlı projection varsa.
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

    // insightOrFallback önce build edilir — PDF render bunu tek sefer
    // kullanacak. Insight null ise deterministic template fallback'a düşer
    // (kapakta "Buaze analizi" section'ı her zaman görünür).
    const insightOrFallback: RoiInsight = insight ?? {
      summary:
        locale === 'tr'
          ? `${pdfData.restaurantName} için 12 aylık projeksiyon ${pdfData.currency}${Math.round(pdfData.netGain).toLocaleString('tr-TR')} net kazanç ve ${pdfData.roiMultiple.toFixed(1)}× ROI yansıtıyor.`
          : `Your 12-month projection for ${pdfData.restaurantName} shows ${pdfData.currency}${Math.round(pdfData.netGain).toLocaleString('en-US')} net gain at ${pdfData.roiMultiple.toFixed(1)}× ROI.`,
      highlight:
        locale === 'tr'
          ? `Aylık ${pdfData.filteredLowReviews} kötü yorumun Google'a sızmadan filtrelenmesi en yüksek kaldıraç.`
          : `Filtering ${pdfData.filteredLowReviews} low reviews/month from leaking to Google is the strongest leverage.`,
      nextSteps:
        locale === 'tr'
          ? [
              'QR\'ı masa altlığı + kasa yanına yerleştir; ilk 7 gün tarama oranını ölç.',
              'Pulse AI taslak yanıtlarını ilk 2 hafta her yorum için onayla — model işletme tonuna kalibre olsun.',
              `Aktif platformların URL'lerini admin panelden gir; yüksek puan akışı doğru yere gitsin.`,
            ]
          : [
              'Place QR on table tents + cashier; measure scan rate during first 7 days.',
              'Approve every Pulse AI draft for the first 2 weeks so the model calibrates to your tone.',
              'Add URLs for all active platforms in admin so high-rating flow routes correctly.',
            ],
      source: 'template',
    };

    // Tek PDF render — insightOrFallback ile (insight başarılıysa AI,
    // değilse template). Eski paralel akıştaki 2. rerender path'i kaldırıldı.
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

    // Customer mail (Pulse roi-customer-report) — email varsa.
    if (email) {
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com').replace(/\/+$/, '');
      // firstName form'da toplanmıyor → null pas et; template kendi
      // içinde "İşletme adı + ekibi"/"team" fallback'ini üretir.
      // (Eski restaurantName.split(/[\s,.]/)[0] türetimi awkward selamlama
      // üretiyordu: "Cafe Karaköy" → "Hi Cafe,". Kaldırıldı.)
      const customerRendered = renderRoiCustomerReport(
        {
          restaurantName: pdfData.restaurantName,
          firstName: null,
          currency: pdfData.currency,
          netGain: pdfData.netGain,
          roiMultiple: pdfData.roiMultiple,
          monthlyUplift: pdfData.monthlyUplift,
          paybackMonths: pdfData.paybackMonths,
          reviewers: pdfData.reviewers,
          filteredLowReviews: pdfData.filteredLowReviews,
          projectedGoogle: pdfData.projectedGoogle,
          currentGoogle: pdfData.currentGoogle,
          newCustomers: pdfData.newCustomers,
          aiHoursSaved: pdfData.aiHoursSaved,
          plan: pdfData.plan,
          planPrice: pdfData.planPrice,
          platforms: pdfData.platforms,
          aiSummary: insightOrFallback.summary,
          aiHighlight: insightOrFallback.highlight,
          aiNextSteps: insightOrFallback.nextSteps,
          hasPdf: !!attachments,
          contactUrl: `${appUrl}/${locale}/contact`,
          pricingUrl: `${appUrl}/${locale}/pricing`,
        },
        locale,
      );
      sendResendEmail({
        to: email,
        subject: customerRendered.subject,
        html: customerRendered.html,
        text: customerRendered.text,
        attachments,
      }).catch((err) => console.error('[roi/save] customer mail failed', err));
    }

    // Sales mail (Pulse roi-admin-notification) — yalnız email + sales
    // inbox varsa. Lead deduplication: aynı senaryo son 24 saat içinde
    // gelmişse (cache hit) sales mail tekrar GÖNDERİLMEZ — operatör
    // spam'i önlenir. Customer mail yine gider (kullanıcı PDF'i tekrar
    // istemiş olabilir; UX değişmez).
    const salesInbox = process.env.NOTIFICATION_EMAIL;
    if (email && salesInbox && !isDuplicate) {
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com').replace(/\/+$/, '');
      const adminRendered = renderRoiAdminNotification(
        {
          email,
          restaurantName: pdfData.restaurantName,
          phone,
          sector: pdfData.sector,
          monthlyCustomers: pdfData.monthlyCustomers,
          avgTicket: pdfData.avgTicket,
          currentGoogle: pdfData.currentGoogle,
          lowRatingsPerMonth: pdfData.lowRatingsPerMonth,
          platforms: pdfData.platforms,
          plan: pdfData.plan,
          planPrice: pdfData.planPrice,
          currency: pdfData.currency,
          scanned: pdfData.scanned,
          reviewers: pdfData.reviewers,
          filteredLowReviews: pdfData.filteredLowReviews,
          projectedGoogle: pdfData.projectedGoogle,
          newCustomers: pdfData.newCustomers,
          monthlyUplift: pdfData.monthlyUplift,
          yearlyUplift: pdfData.yearlyUplift,
          netGain: pdfData.netGain,
          roiMultiple: pdfData.roiMultiple,
          paybackMonths: pdfData.paybackMonths,
          aiHoursSaved: pdfData.aiHoursSaved,
          aiSummary: insightOrFallback.summary,
          aiHighlight: insightOrFallback.highlight,
          aiNextSteps: insightOrFallback.nextSteps,
          aiSource: insightOrFallback.source,
          panelUrl: `${appUrl}/admin/leads`,
          ip,
        },
        locale,
      );
      sendResendEmail({
        to: salesInbox,
        replyTo: email,
        subject: adminRendered.subject,
        html: adminRendered.html,
        text: adminRendered.text,
      }).catch((err) => console.error('[roi/save] admin sales mail failed', err));
    }
  }

  return NextResponse.json({ ok: true, id: row.id });
}

// PDF için projection JSON'ını tipli payload'a dönüştürür. Beklenmeyen
// shape'te `null` döner; çağıran tarafı PDF + AI insight + mail akışını
// sessizce atlar.
function buildRoiPdfData(
  body: Record<string, unknown>,
  row: { restaurantName: string | null; avgTicket: Prisma.Decimal | null },
  email: string | null,
  locale: 'tr' | 'en',
): RoiPdfData | null {
  const proj = body.projection;
  if (!proj || typeof proj !== 'object') return null;
  const p = proj as Record<string, unknown>;
  const calc =
    typeof p.calc === 'object' && p.calc !== null
      ? (p.calc as Record<string, unknown>)
      : null;
  if (!calc) return null;

  const num = (v: unknown, fallback = 0): number =>
    typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
  const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

  const platforms = arr(p.platforms).filter((x): x is string => typeof x === 'string');
  const breakdownRaw = arr(calc.platformBreakdown);
  const platformBreakdown = breakdownRaw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;
      const key = str(o.key);
      if (!key) return null;
      return {
        key,
        share: num(o.share),
        reviews: num(o.reviews),
      };
    })
    .filter((x): x is { key: string; share: number; reviews: number } => x !== null);

  const planKey = str(p.plan, 'growth');
  const planPriceTr: Record<string, number> = { starter: 499, growth: 899, pro: 1499 };
  const planPrice = planPriceTr[planKey] ?? num(p.planPrice, 899);
  const avgTicketRow = row.avgTicket ? Number(row.avgTicket) : num(p.avgTicket);

  return {
    restaurantName: row.restaurantName ?? str(p.restaurantName, 'İşletmen'),
    email: email ?? '',
    generatedAt: new Date(),
    currency: locale === 'en' ? '$' : '₺',
    locale,
    sector: str(p.sector, 'restaurant'),
    monthlyCustomers: num(p.monthlyCustomers),
    avgTicket: avgTicketRow,
    currentGoogle: num(p.currentGoogle, 4.2),
    lowRatingsPerMonth: num(p.lowRatingsPerMonth),
    platforms,
    plan: planKey,
    planPrice,
    scanned: num(calc.scanned),
    reviewers: num(calc.reviewers),
    filteredLowReviews: num(calc.filteredLowReviews),
    projectedGoogle: num(calc.projectedGoogle, num(p.currentGoogle, 4.2)),
    newCustomers: num(calc.newCustomers),
    monthlyUplift: num(calc.monthlyUplift),
    yearlyUplift: num(calc.yearlyUplift),
    yearlyPlan: planPrice * 12,
    netGain: num(calc.netGain),
    roiMultiple: num(calc.roiMultiple),
    paybackMonths: typeof calc.paybackMonths === 'number' ? calc.paybackMonths : null,
    aiHoursSaved: num(calc.aiHoursSaved),
    platformBreakdown,
  };
}
