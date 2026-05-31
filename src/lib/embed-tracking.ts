import { prisma } from '@/lib/prisma';

interface RecordViewInput {
  slug: string;
  referer?: string | null;
  ip?: string | null;
  ua?: string | null;
}

/**
 * Public embed view tracker. Slug → restaurant resolve, inactive/missing
 * → silent no-op (slug fingerprinting önleme — CLAUDE.md §13.5 pattern).
 * Referer parse defansif: malformed URL → parentDomain null, throw yok.
 */
export async function recordEmbedView(input: RecordViewInput): Promise<{ ok: boolean }> {
  const slug = (input.slug || '').trim();
  if (!slug) return { ok: false };

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { id: true, isActive: true },
  });
  if (!restaurant || !restaurant.isActive) return { ok: true };

  let parentDomain: string | null = null;
  if (input.referer) {
    try {
      const u = new URL(input.referer);
      parentDomain = u.hostname.toLowerCase().slice(0, 253) || null;
    } catch {
      // malformed referer header → parentDomain null, silent
    }
  }

  const ipAddress = input.ip ? String(input.ip).slice(0, 64) || null : null;
  const userAgent = input.ua ? String(input.ua).slice(0, 256) || null : null;

  try {
    await prisma.embedView.create({
      data: {
        restaurantId: restaurant.id,
        parentDomain,
        ipAddress,
        userAgent,
      },
    });
    return { ok: true };
  } catch (err) {
    // §37.7 — structured, PII-free (err.meta may carry the ipAddress query param).
    console.error('[embed-view] insert failed', {
      restaurantId: restaurant.id,
      name: err instanceof Error ? err.name : 'unknown',
      message: err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200),
    });
    return { ok: false };
  }
}
