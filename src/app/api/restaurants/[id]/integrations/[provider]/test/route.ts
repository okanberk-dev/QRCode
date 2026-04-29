import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantAccess } from '@/lib/menu-access';
import { rateLimit, maybeSweep } from '@/lib/rate-limit';
import { ApiErrors } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Section 3 — Integrations test endpoint (Faz 2).
//
// Per-provider URL'i Restaurant tablosundan okur ve server-side HEAD request
// ile reachability check'i yapar. Mevcut /platforms page'de sadece toggle vardı;
// owner artık "Test et" butonuyla URL'in canlı olduğunu doğrulayabilir.
//
// Response: { ok, statusCode, latencyMs, error?, url }.
// 5 saniye timeout (yavaş upstream tek request'i kilitlemesin).

type ProviderId =
  | 'google'
  | 'yemeksepeti'
  | 'getir'
  | 'trendyol_go'
  | 'tripadvisor'
  | 'airbnb'
  | 'instagram'
  | 'facebook'
  | 'whatsapp'
  | 'website'
  | 'reservation';

type RestaurantUrlField =
  | 'googleReviewUrl'
  | 'yemekSepetiUrl'
  | 'getirYemekUrl'
  | 'trendyolYemekUrl'
  | 'tripAdvisorUrl'
  | 'airbnbUrl'
  | 'instagramUrl'
  | 'facebookUrl'
  | 'whatsappUrl'
  | 'website'
  | 'reservationUrl';

const PROVIDER_FIELD_MAP: Record<ProviderId, RestaurantUrlField> = {
  google: 'googleReviewUrl',
  yemeksepeti: 'yemekSepetiUrl',
  getir: 'getirYemekUrl',
  trendyol_go: 'trendyolYemekUrl',
  tripadvisor: 'tripAdvisorUrl',
  airbnb: 'airbnbUrl',
  instagram: 'instagramUrl',
  facebook: 'facebookUrl',
  whatsapp: 'whatsappUrl',
  website: 'website',
  reservation: 'reservationUrl',
};

function isProvider(value: string): value is ProviderId {
  return value in PROVIDER_FIELD_MAP;
}

async function loadRestaurant(id: string) {
  return prisma.restaurant.findUnique({
    where: { id },
    select: {
      googleReviewUrl: true,
      yemekSepetiUrl: true,
      getirYemekUrl: true,
      trendyolYemekUrl: true,
      tripAdvisorUrl: true,
      airbnbUrl: true,
      instagramUrl: true,
      facebookUrl: true,
      whatsappUrl: true,
      website: true,
      reservationUrl: true,
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; provider: string }> },
) {
  maybeSweep();
  const { id, provider } = await params;

  if (!isProvider(provider)) {
    return ApiErrors.badRequest('Geçersiz entegrasyon türü', 'INVALID_PROVIDER');
  }

  const gate = await requireRestaurantAccess(req, id);
  if (!gate.ok) return gate.res;

  // 30 test/dk/restoran. Owner panelinde butona spam tıklamayı engellemek için.
  const rl = await rateLimit(`integration:test:${id}`, 30, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Çok fazla test isteği. Lütfen birazdan tekrar deneyin.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    );
  }

  const restaurant = await loadRestaurant(id);
  if (!restaurant) return ApiErrors.notFound('İşletme bulunamadı');

  const fieldKey = PROVIDER_FIELD_MAP[provider];
  const url = restaurant[fieldKey] ?? '';
  if (!url) {
    return NextResponse.json(
      {
        ok: false,
        statusCode: 0,
        latencyMs: 0,
        error: 'URL boş — önce kaydet, sonra test et.',
        url: '',
      },
      { status: 200 },
    );
  }

  // URL doğrulama — başka biri DB'ye doğrudan eklemiş olabilir
  let target: URL;
  try {
    target = new URL(url);
    if (!/^https?:$/.test(target.protocol)) throw new Error('protocol');
  } catch {
    return NextResponse.json(
      { ok: false, statusCode: 0, latencyMs: 0, error: 'Geçersiz URL formatı.', url },
      { status: 200 },
    );
  }

  const controller = new AbortController();
  const timeoutMs = 5000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

  try {
    let res: Response;
    try {
      res = await fetch(target.toString(), {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          // Bazı kapı bekçileri (CDN'ler) HEAD'i Bot olarak işaretliyor;
          // standart bir User-Agent ile başarısızlığı azalt.
          'User-Agent':
            'Mozilla/5.0 (compatible; BuazeIntegrationsTest/1.0; +https://buaze.com)',
        },
      });
    } catch {
      // Bazı upstream'ler HEAD reddediyor — GET ile fallback (ama yanıt body'sini
      // okumuyoruz, sadece status'a bakıyoruz).
      res = await fetch(target.toString(), {
        method: 'GET',
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; BuazeIntegrationsTest/1.0; +https://buaze.com)',
        },
      });
    }
    const latencyMs = Date.now() - start;
    clearTimeout(timer);
    return NextResponse.json(
      {
        ok: res.ok,
        statusCode: res.status,
        latencyMs,
        error: res.ok ? undefined : `HTTP ${res.status}`,
        url,
      },
      { status: 200 },
    );
  } catch (err) {
    clearTimeout(timer);
    const latencyMs = Date.now() - start;
    const aborted =
      err instanceof Error && (err.name === 'AbortError' || /timeout/i.test(err.message));
    return NextResponse.json(
      {
        ok: false,
        statusCode: 0,
        latencyMs,
        error: aborted
          ? `${timeoutMs / 1000} saniyede yanıt alınamadı.`
          : (err as Error).message || 'Erişilemedi.',
        url,
      },
      { status: 200 },
    );
  }
}
