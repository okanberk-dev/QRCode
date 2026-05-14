import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';
import { isValidTableIdentifier, isValidHexColor } from '@/lib/validations';
import { rateLimit, maybeSweep } from '@/lib/rate-limit';
import { isExternalReviewProvider } from '@/lib/restaurant-features';
import { renderAestheticQrSvg } from '@/lib/qr-aesthetic';
import { composePremiumQrPng } from '@/lib/qr-premium-png';
import { isValidTemplateId } from '@/components/panel/qr/templates/registry';
// Plain `qrcode` kept for `?style=plain` opt-out + sharp composite
// fallback path (premium PNG render failure → mono QR rather than 500).
import QRCode from 'qrcode';

const DEFAULT_DARK = '#000000';
const DEFAULT_LIGHT = '#ffffff';
const MIN_WIDTH = 200;
const MAX_WIDTH = 2000;
const DEFAULT_WIDTH = 800;

async function rememberFeedbackQr(params: {
  restaurantId: string;
  qrUrl: string;
  tableNumber: string | null;
  platform: string | null;
  // Stage 96 — persist owner-chosen colour pair so subsequent downloads
  // (lazy SVG re-fetch / explicit PNG / SVG download) honour the same
  // pair. NULL → platform defaults (black/white).
  darkColor: string | null;
  lightColor: string | null;
  // Wave A — print/share template (`classic`, …). NULL when caller didn't
  // pass `?template=` (legacy wizard path / programmatic regeneration).
  templateId: string | null;
}) {
  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.qrGeneration.findFirst({
        where: {
          restaurantId: params.restaurantId,
          type: 'feedback',
          tableNumber: params.tableNumber,
          platform: params.platform,
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });

      if (existing) {
        // Aynı QR yeniden oluşturulduğunda createdAt'i de yenile — owner
        // panelinde "yeni QR" listesinin en üstüne taşınır. Distinct count
        // semantiği değişmez (CLAUDE.md §34.5'teki tek-row kuralı korunur),
        // sadece "freshly-touched" görüntüsü. Renk override edilir — owner
        // yeni renkle aynı slot'u yeniden ürettiğinde history'de güncel
        // renk görünür. Template aynı kurala uyar — explicit pass varsa
        // güncellenir, null pass mevcut kaydı silmez.
        await tx.qrGeneration.update({
          where: { id: existing.id },
          data: {
            qrUrl: params.qrUrl,
            createdAt: new Date(),
            darkColor: params.darkColor,
            lightColor: params.lightColor,
            ...(params.templateId ? { templateId: params.templateId } : {}),
          },
        });
        return;
      }

      await tx.qrGeneration.create({
        data: {
          restaurantId: params.restaurantId,
          qrUrl: params.qrUrl,
          tableNumber: params.tableNumber,
          platform: params.platform,
          type: 'feedback',
          darkColor: params.darkColor,
          lightColor: params.lightColor,
          templateId: params.templateId,
        },
      });
    });
  } catch (trackError) {
    const code = (trackError as { code?: string })?.code;
    if (code !== 'P2021' && code !== 'P2022') {
      console.warn('[QR] Generation tracking skipped:', (trackError as Error).message);
    }
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Single outer try/catch covers EVERYTHING — auth lookup, params await,
  // rate limit, render. Without this, throws above the previous try block
  // (JWT verify, Upstash timeout, params parsing) bubble up to the Next.js
  // framework which returns a generic HTML 500 page → wizard's `res.json()`
  // fails → user sees the bare "QR oluşturulamadı" fallback with no clue
  // what broke. Closure log §38.178 Bug 1 + user complaint trail.
  try {
    maybeSweep();

    const actor = await getPanelActorFromRequest(req);
    if (!actor) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    // QR wizard root-cause defensive guard (belt-and-suspenders with the
    // upstream `auth.ts` runtime check). Eğer ileride bir başka kanal
    // (admin token, impersonation) `actor.id` undefined ile gelirse
    // sessiz P2025 yerine actionable 401 dönsün — "oturum bilgisi eksik,
    // yeniden giriş yapın". Sentry warning event production'da ops'a
    // sinyal verir, kök neden ayrı PR'da kapatılır.
    if (typeof actor.id !== 'string' || actor.id.length === 0) {
      Sentry.captureMessage('QR generate: actor.id missing', {
        level: 'warning',
        tags: { route: 'restaurants.qr.generate', kind: 'actor-id-missing' },
        extra: { source: actor.source, role: actor.role },
      });
      return NextResponse.json(
        { error: 'Oturum bilgisi eksik. Lütfen yeniden giriş yapın.' },
        { status: 401 },
      );
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const table = searchParams.get('table') || '';
    const format = (searchParams.get('format') || 'svg').toLowerCase();
    const platform = searchParams.get('platform') || '';

    // Whitelist mirrors `/r/[slug]` `platformUrls` map + restaurant PUT
    // `ALLOWED_DEFAULT_PLATFORMS`. Konaklama / catch-all sectors need
    // tripadvisor + airbnb + booking + yandex so their QRs honour
    // `?platform=` correctly.
    const validPlatforms = [
      'google', 'yemeksepeti', 'getir', 'trendyol_go',
      'tripadvisor', 'airbnb', 'booking', 'yandex',
    ];
    const sanitizedPlatform = platform && validPlatforms.includes(platform) ? platform : '';

    if (format !== 'svg' && format !== 'png') {
      return NextResponse.json({ error: 'Geçersiz format' }, { status: 400 });
    }

    // Validate optional table identifier — prevents arbitrary-length or
    // characters that would break URL parsing / bloat the DB.
    if (!isValidTableIdentifier(table)) {
      return NextResponse.json(
        { error: 'Geçersiz masa numarası (yalnızca harf, rakam, tire ve alt çizgi, maks. 20 karakter)' },
        { status: 400 }
      );
    }

    // Optional visual customisation — gracefully ignored if invalid.
    const darkRaw = searchParams.get('dark');
    const lightRaw = searchParams.get('light');
    const dark = darkRaw && isValidHexColor(darkRaw) ? darkRaw : DEFAULT_DARK;
    const light = lightRaw && isValidHexColor(lightRaw) ? lightRaw : DEFAULT_LIGHT;

    // Wave A — print/share template id. Whitelist via registry so unknown
    // strings don't poison `qr_generations.template_id`. Empty/invalid →
    // NULL (legacy path; owner gets the classic preview on QRCard).
    const templateRaw = searchParams.get('template');
    const persistTemplate = isValidTemplateId(templateRaw) ? templateRaw : null;

    const widthRaw = searchParams.get('width');
    let width = DEFAULT_WIDTH;
    if (widthRaw) {
      const parsed = Number.parseInt(widthRaw, 10);
      if (Number.isFinite(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
        width = parsed;
      }
    }

    // Per-user generation rate limit. Covers both legitimate admins and
    // compromised credentials that would otherwise flood QrGeneration rows.
    const rl = await rateLimit(`qr:gen:${actor.id}`, 120, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Çok fazla QR isteği. Lütfen biraz bekleyin.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
      );
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      // `name` needed for premium PNG headline (composePremiumQrPng).
      select: { id: true, name: true, slug: true, isActive: true, externalPlatformsEnabled: true },
    });

    if (!restaurant) {
      return NextResponse.json({ error: 'Restoran bulunamadı' }, { status: 404 });
    }

    if (!restaurant.isActive) {
      return NextResponse.json(
        { error: 'Bu işletme pasif durumda. QR oluşturmadan önce aktifleştirin.' },
        { status: 409 }
      );
    }
    if (!restaurant.externalPlatformsEnabled && isExternalReviewProvider(sanitizedPlatform)) {
      return NextResponse.json(
        { error: 'Google dışındaki platformlar bu işletme için kapalı.' },
        { status: 403 },
      );
    }

    const hasAccess = await canAccessRestaurant(actor, restaurant.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    const envAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    const normalizedEnvUrl = envAppUrl?.replace(/\/+$/, '');
    const hasLocalhostEnv = normalizedEnvUrl
      ? /localhost|127\.0\.0\.1/i.test(normalizedEnvUrl)
      : false;
    const appUrl = (!hasLocalhostEnv && normalizedEnvUrl)
      ? normalizedEnvUrl
      : 'https://buaze.com';

    let qrUrl = `${appUrl}/r/${restaurant.slug}?source=qr`;
    if (table) {
      qrUrl += `&table=${encodeURIComponent(table)}`;
    }
    if (sanitizedPlatform) {
      qrUrl += `&platform=${sanitizedPlatform}`;
    }

    // Canonical QR history: one row per restaurant + platform + table
    // signature. Re-rendering/downloading the same QR updates the existing
    // record instead of growing the panel list indefinitely.
    //
    // Stage 96 — colour persistence. We only store a colour pair when the
    // owner explicitly passed BOTH `dark` and `light` query params (i.e.
    // they used the picker, not the default download). Solo override of a
    // single field would be ambiguous — we don't want a stale "remembered"
    // light/dark to leak into an otherwise default flow.
    const persistColors = !!(darkRaw && lightRaw);
    await rememberFeedbackQr({
      restaurantId: restaurant.id,
      qrUrl,
      tableNumber: table || null,
      platform: sanitizedPlatform || null,
      darkColor: persistColors ? dark : null,
      lightColor: persistColors ? light : null,
      templateId: persistTemplate,
    });

    // Aesthetic Buaze QR — rounded modules + unified finder eyes. Used
    // for both the inline SVG response (premium PDF template embeds this)
    // and as the symbol layer inside the composited PNG.
    //
    // `style=plain` query gate keeps a path open for callers that need a
    // raw qrcode (programmatic embed, regression tooling). Default is the
    // branded variant per user request — "wizard kadar estetik".
    const style = (searchParams.get('style') || 'aesthetic').toLowerCase();
    const usePlain = style === 'plain';

    if (format === 'png') {
      try {
        const hostForFooter = (() => {
          try {
            const u = new URL(qrUrl);
            const path = u.pathname.replace(/^\/+|\/+$/g, '');
            const host = u.hostname.replace(/^www\./, '');
            return path ? `${host}/${path.split('?')[0]}` : host;
          } catch {
            return 'buaze.com';
          }
        })();

        const pngBuffer = usePlain
          ? await QRCode.toBuffer(qrUrl, {
              type: 'png',
              width,
              margin: 2,
              color: { dark, light },
              errorCorrectionLevel: 'H' as const,
            })
          : await composePremiumQrPng({
              data: qrUrl,
              size: width,
              dark,
              light,
              restaurantName: restaurant.name,
              qrHost: hostForFooter,
              locale: 'tr',
            });

        // Defensive: empty buffer should never reach the client. sharp /
        // qrcode kütüphaneleri normal akışta throw eder, ama belirsiz bir
        // sürüm uyumsuzluğunda 0-byte buffer döndürebilir → kullanıcıya
        // boş PNG iner. Burada explicit guard ile fallback'e zorlayarak
        // veya 500 dönerek bunu yakalıyoruz (Sentry capture ops için).
        if (!pngBuffer || pngBuffer.length === 0) {
          Sentry.captureMessage('QR composer returned empty buffer', {
            level: 'warning',
            tags: { route: 'restaurants.qr.generate', kind: 'empty-buffer', mode: usePlain ? 'plain' : 'premium' },
            extra: { width, restaurantId: restaurant.id },
          });
          throw new Error('Composer returned empty buffer');
        }

        return new NextResponse(new Uint8Array(pngBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'image/png',
            'Content-Length': String(pngBuffer.length),
            'Content-Disposition': `attachment; filename="qr-${restaurant.slug}${table ? `-masa-${table}` : ''}.png"`,
            'Cache-Control': 'no-store',
          },
        });
      } catch (composeError) {
        // Premium composite failed (sharp / svg parse). Fall back to plain
        // qrcode PNG so the owner still gets a usable download — better a
        // mono QR than a 500.
        console.error('[QR] premium composite failed, falling back to plain:', composeError);
        Sentry.captureMessage('QR composer fallback to plain', {
          level: 'warning',
          tags: { route: 'restaurants.qr.generate', kind: 'composer-fallback' },
          extra: {
            error: (composeError as Error)?.message?.slice(0, 240) ?? String(composeError),
            width,
            restaurantId: restaurant.id,
          },
        });
        const fallback = await QRCode.toBuffer(qrUrl, {
          type: 'png',
          width,
          margin: 2,
          color: { dark, light },
          errorCorrectionLevel: 'H' as const,
        });
        if (!fallback || fallback.length === 0) {
          // Fallback bile boş → bu kez 500 dön; outer catch action'lı
          // hata mesajı + Sentry stack ile production'da görünür.
          throw new Error('Plain QRCode fallback returned empty buffer');
        }
        return new NextResponse(new Uint8Array(fallback), {
          status: 200,
          headers: {
            'Content-Type': 'image/png',
            'Content-Length': String(fallback.length),
            'Content-Disposition': `attachment; filename="qr-${restaurant.slug}${table ? `-masa-${table}` : ''}.png"`,
            'Cache-Control': 'no-store',
          },
        });
      }
    }

    // Default: SVG. Always aesthetic unless caller opted into `style=plain`
    // (parity with PNG branch). Premium PDF template (`qr-premium-template.ts`)
    // consumes this SVG and frames it with HTML/CSS — rounded modules will
    // visibly improve the printed output too.
    let svgString: string;
    if (usePlain) {
      svgString = await QRCode.toString(qrUrl, {
        type: 'svg',
        width,
        margin: 2,
        color: { dark, light },
        errorCorrectionLevel: 'H' as const,
      });
    } else {
      // `renderAestheticQrSvg` builds the matrix synchronously via
      // `qrcode.create()`. On the off chance the helper throws (extreme
      // payload length, qrcode version overflow) we fall back to the raw
      // `qrcode` SVG so the owner still gets a usable artefact — better a
      // mono QR than a 500 they can't recover from.
      try {
        svgString = renderAestheticQrSvg({
          data: qrUrl,
          size: width,
          dark,
          light,
          margin: 2,
          errorCorrectionLevel: 'H',
        }).svg;
      } catch (aestheticError) {
        console.error('[QR] aesthetic SVG render failed, falling back to plain:', aestheticError);
        svgString = await QRCode.toString(qrUrl, {
          type: 'svg',
          width,
          margin: 2,
          color: { dark, light },
          errorCorrectionLevel: 'H' as const,
        });
      }
    }

    return new NextResponse(svgString, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Content-Disposition': `inline; filename="qr-${restaurant.slug}${table ? `-masa-${table}` : ''}.svg"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    // Surface the underlying exception name + message to the wizard so
    // owners + ops can tell apart a Prisma column drift (P2022 / P2021)
    // from a sharp/render crash without digging through server logs.
    // Stack/path stays in `console.error` only — PII (req body) never
    // logged (CLAUDE.md §37.7). Sentry capture with `route` tag so ops
    // can pivot directly from production alert to root cause without
    // digging through Vercel logs.
    console.error('[QR] generation error:', error);
    Sentry.captureException(error, {
      tags: { route: 'restaurants.qr.generate' },
      extra: { errorCode: (error as { code?: string } | undefined)?.code ?? null },
    });

    const err = error as { name?: string; message?: string; code?: string } | undefined;
    const detailParts: string[] = [];
    if (err?.code) detailParts.push(err.code);
    if (err?.name && err.name !== 'Error') detailParts.push(err.name);
    if (err?.message) detailParts.push(err.message.slice(0, 240));
    const detail = detailParts.length > 0 ? ` (${detailParts.join(' · ')})` : '';
    return NextResponse.json(
      { error: `QR kod oluşturulamadı${detail}` },
      { status: 500 },
    );
  }
}
