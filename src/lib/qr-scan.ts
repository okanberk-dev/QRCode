import { prisma } from '@/lib/prisma';

const VALID_SOURCES = new Set(['qr', 'direct', 'link', 'table', 'delivery']);

interface RecordScanInput {
  slug: string;
  tableNumber?: string | null;
  platform?: string | null;
  source?: string | null;
  sessionId?: string | null;
  ip?: string | null;
  ua?: string | null;
}

/**
 * Public scan event recorder. Slug → restaurant resolve, inactive/missing
 * → silent no-op (slug fingerprinting önleme — CLAUDE.md §13.5 menu
 * analytics pattern'ı ile aynı). Tüm input string'leri trim + bounded.
 */
export async function recordQrScan(input: RecordScanInput): Promise<{ ok: boolean }> {
  const slug = (input.slug || '').trim();
  if (!slug) return { ok: false };

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { id: true, isActive: true },
  });
  if (!restaurant || !restaurant.isActive) return { ok: true };

  const tableNumber = input.tableNumber ? String(input.tableNumber).trim().slice(0, 32) || null : null;
  const platform = input.platform ? String(input.platform).trim().slice(0, 32) || null : null;
  const sourceRaw = input.source ? String(input.source).trim().toLowerCase() : null;
  const source = sourceRaw && VALID_SOURCES.has(sourceRaw) ? sourceRaw : null;
  const sessionId = input.sessionId ? String(input.sessionId).trim().slice(0, 64) || null : null;
  const ipAddress = input.ip ? String(input.ip).slice(0, 64) || null : null;
  const userAgent = input.ua ? String(input.ua).slice(0, 256) || null : null;

  try {
    await prisma.qrScan.create({
      data: {
        restaurantId: restaurant.id,
        tableNumber,
        platform,
        source,
        sessionId,
        ipAddress,
        userAgent,
      },
    });
    return { ok: true };
  } catch (err) {
    console.error('[qr-scan] insert failed', err);
    return { ok: false };
  }
}
