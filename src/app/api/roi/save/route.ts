import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { sendMail, sendFormConfirmationEmail } from '@/lib/email';
import { verifyRecaptchaToken } from '@/lib/recaptcha';
import { generateRoiPdfBase64, type RoiPdfData } from '@/lib/roi/generate-roi-pdf';

export const dynamic = 'force-dynamic';
// PDF render server-side @react-pdf/renderer ile yapılır; tipik ~500-900 ms
// — Vercel default 10s yeterli, yine de explicit tutmak için cap yükselt.
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
    // Önemli alanları okunabilir formata çevir; bilinmeyen tüm yapı için
    // JSON fallback bırakırız ki future schema değişikliklerinde sales mail
    // kırılmasın.
    const projObj =
      body.projection && typeof body.projection === 'object'
        ? (body.projection as Record<string, unknown>)
        : null;
    const calcObj =
      projObj && typeof projObj.calc === 'object' && projObj.calc !== null
        ? (projObj.calc as Record<string, unknown>)
        : null;

    const projLines: string[] = [];
    const projHtmlRows: string[] = [];
    function addRow(label: string, value: unknown) {
      if (value === undefined || value === null || value === '') return;
      const v = typeof value === 'object' ? JSON.stringify(value) : String(value);
      projLines.push(`${label}: ${v}`);
      projHtmlRows.push(`<li>${escape(label)}: ${escape(v)}</li>`);
    }
    if (projObj) {
      addRow('Sektör', projObj.sector);
      addRow('Aylık müşteri', projObj.monthlyCustomers);
      addRow('Mevcut Google ★', projObj.currentGoogle);
      addRow('Aylık 1-3★ yorum', projObj.lowRatingsPerMonth);
      addRow(
        'Platformlar',
        Array.isArray(projObj.platforms) ? projObj.platforms.join(', ') : projObj.platforms,
      );
      addRow('Plan', projObj.plan);
    }
    if (calcObj) {
      addRow('Beklenen QR scan / ay', calcObj.scanned);
      addRow('Beklenen yorum / ay', calcObj.reviewers);
      addRow('Filtrelenen kötü yorum / ay', calcObj.filteredLowReviews);
      addRow('Yeni Google ★', calcObj.projectedGoogle);
      addRow('Yeni müşteri / ay', calcObj.newCustomers);
      addRow('Aylık ek gelir', calcObj.monthlyUplift);
      addRow('Yıllık net kazanç', calcObj.netGain);
      addRow('ROI çarpanı', calcObj.roiMultiple);
      addRow('Amorti (ay)', calcObj.paybackMonths);
      addRow('AI Co-Pilot tasarruf (sa/ay)', calcObj.aiHoursSaved);
    }
    const projectionText = projLines.length ? `\n\n— Projeksiyon —\n${projLines.join('\n')}` : '';
    const projectionHtml = projHtmlRows.length
      ? `<h4 style="margin:16px 0 6px">Projeksiyon</h4><ul>${projHtmlRows.join('')}</ul>`
      : projObj
        ? `<pre style="white-space:pre-wrap">${escape(JSON.stringify(projObj, null, 2))}</pre>`
        : '';

    sendMail({
      to: salesInbox,
      replyTo: email,
      subject: `Buaze ROI hesaplayıcı · yeni lead · ${row.restaurantName ?? email}`,
      text: `Yeni ROI hesap lead'i geldi.\n\nEmail: ${email}\nİşletme: ${row.restaurantName ?? '-'}\nOrt. kişi başı: ${row.avgTicket ?? '-'}${projectionText}`,
      html: `<h3>Yeni ROI lead'i</h3><ul><li>Email: ${escape(email)}</li><li>İşletme: ${escape(row.restaurantName ?? '-')}</li><li>Ort. kişi başı: ${escape(String(row.avgTicket ?? '-'))}</li></ul>${projectionHtml}`,
    }).catch((err) => {
      console.error('[roi/save] sales mail failed', err);
    });
  }

  // User-facing ROI confirmation + estetik PDF eki.
  // PDF, kullanıcının sayfada girdiği senaryo + Buaze hesap modeli sonuçlarını
  // 2 sayfalık Pulse-temalı dokümana dönüştürür. Akış AÇIKÇA anlatılır:
  // "1-2-3★ yorumlar dahili form'a, 4-5★ yorumlar seçili platformlara" —
  // Buaze müşteriden hiçbir şey gizlemez, Google politikası uyumlu kalır.
  if (email) {
    const details: Array<{ label: string; value: string }> = [];
    if (row.restaurantName) details.push({ label: 'İşletme', value: row.restaurantName });
    if (row.avgTicket) details.push({ label: 'Ortalama hesap', value: String(row.avgTicket) });

    // PDF için tip-güvenli payload üret. Eksik / geçersiz projection
    // alanlarında PDF üretimini atla — confirmation maili yine gönder.
    const pdfData = buildRoiPdfData(body, row, email);
    let attachments: Array<{ filename: string; content: string; contentType?: string }> | undefined;
    if (pdfData) {
      try {
        const base64 = await generateRoiPdfBase64(pdfData);
        const safeName = (pdfData.restaurantName || 'isletme')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
          .slice(0, 40) || 'isletme';
        attachments = [
          {
            filename: `buaze-roi-${safeName}.pdf`,
            content: base64,
            contentType: 'application/pdf',
          },
        ];
      } catch (err) {
        // PDF render başarısız olursa fallback: PDF'siz mail. Confirmation
        // maili yine gönderilir, lead kaybedilmez.
        console.error('[roi/save] pdf generation failed', err);
      }
    }

    sendFormConfirmationEmail({
      to: email,
      formType: 'roi',
      name: row.restaurantName,
      details,
      attachments,
    }).catch((err) => console.error('[roi/save] confirmation mail failed', err));
  }

  return NextResponse.json({ ok: true, id: row.id });
}

// PDF için projection JSON'ını tipli payload'a dönüştürür. Beklenmeyen
// shape'te `null` döner; çağıran tarafı PDF üretimini sessizce atlar.
function buildRoiPdfData(
  body: Record<string, unknown>,
  row: { restaurantName: string | null; avgTicket: Prisma.Decimal | null },
  email: string,
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
  // Currency: locale field projection'da yok; ilk platform key veya default
  // ₺ varsayalım. (Hesap TR-first; EN payload'da $ gelirse client tarafı
  // zaten body.currency taşımıyor — fallback TR kabul edilir.)
  const planPriceTr: Record<string, number> = { starter: 499, growth: 899, pro: 1499 };
  const planPrice = planPriceTr[planKey] ?? num(p.planPrice, 899);
  const avgTicketRow = row.avgTicket ? Number(row.avgTicket) : num(p.avgTicket);

  return {
    restaurantName: row.restaurantName ?? str(p.restaurantName, 'İşletmen'),
    email,
    generatedAt: new Date(),
    currency: '₺',
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

function escape(v: string) {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
