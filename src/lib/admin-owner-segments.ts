// Stage A5 §38.97 — owner segment resolver for admin bulk mail.
//
// 4 preset segment + custom (admin tarafından manuel multi-select).
// Helper saf: Prisma'dan owner id listesi döner. Bulk mail endpoint
// (segment === 'custom' değilse) preset'ten id listesini çıkarır,
// admin'in seçtiği `ids` parametresi ile Set intersection'ı kullanır
// (admin "trial expiring" preset'i seçti + manuel 5 owner check ettiyse,
// sadece o 5'i gönder — preset bir filter; admin override edebilir).

import { prisma } from '@/lib/prisma';

export type OwnerSegmentPreset =
  | 'all'
  | 'trial_expiring_3d'
  | 'inactive_14d'
  | 'high_volume'
  | 'custom';

export interface SegmentDescriptor {
  preset: OwnerSegmentPreset;
  label: string;
  description: string;
}

export const OWNER_SEGMENT_PRESETS: SegmentDescriptor[] = [
  {
    preset: 'all',
    label: 'Tüm aktif sahipler',
    description: 'Buaze\'ye kayıtlı, isActive=true olan tüm restaurant_owner hesapları.',
  },
  {
    preset: 'trial_expiring_3d',
    label: 'Trial bitime 3 gün kalan',
    description: 'Plan=trial, trialEndsAt 0-3 gün arası. Conversion fırsatı.',
  },
  {
    preset: 'inactive_14d',
    label: 'Pasif (14g+ giriş yok)',
    description: 'updatedAt 14+ gün öncesi (lastLoginAt yok, proxy).',
  },
  {
    preset: 'high_volume',
    label: 'Yüksek hacim (>50 yorum)',
    description: 'Toplam Feedback._count > 50 (her restoranı toplu).',
  },
  {
    preset: 'custom',
    label: 'Özel seçim',
    description: 'Admin tarafından multi-select edilen ID listesi.',
  },
];

/**
 * Preset ID listesi resolver. `ids` param (admin'in checkbox seçimleri):
 *   - preset='custom' → sadece `ids` döner (validation: existsCheck).
 *   - diğer preset'ler → preset query + (ids non-empty ise) intersect.
 *
 * Returns: Set<userId> — caller bunu Prisma `findMany({ where: { id: { in: [...] } } })`
 * ile iletir. KVKK / IDOR check caller endpoint'inde yapılır.
 */
export async function resolveOwnerIdsForSegment(
  preset: OwnerSegmentPreset,
  manualIds: string[] = [],
  now: Date = new Date(),
): Promise<string[]> {
  // 'custom' preset → sadece manuel seçim. Boşsa empty.
  if (preset === 'custom') {
    if (manualIds.length === 0) return [];
    // Validate existence + role check (defense-in-depth — caller endpoint
    // zaten admin role'üne authenticated, ama IDOR guard).
    const existing = await prisma.user.findMany({
      where: {
        id: { in: manualIds },
        role: 'restaurant_owner',
        isActive: true,
      },
      select: { id: true },
    });
    return existing.map((u) => u.id);
  }

  // Preset query.
  let presetIds: string[] = [];
  if (preset === 'all') {
    const users = await prisma.user.findMany({
      where: { role: 'restaurant_owner', isActive: true },
      select: { id: true },
    });
    presetIds = users.map((u) => u.id);
  } else if (preset === 'trial_expiring_3d') {
    const threeDaysAhead = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const users = await prisma.user.findMany({
      where: {
        role: 'restaurant_owner',
        isActive: true,
        plan: 'trial',
        trialEndsAt: { gt: now, lte: threeDaysAhead },
      },
      select: { id: true },
    });
    presetIds = users.map((u) => u.id);
  } else if (preset === 'inactive_14d') {
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const users = await prisma.user.findMany({
      where: {
        role: 'restaurant_owner',
        isActive: true,
        updatedAt: { lt: fourteenDaysAgo },
      },
      select: { id: true },
    });
    presetIds = users.map((u) => u.id);
  } else if (preset === 'high_volume') {
    // Aggregate restaurants with feedback count > 50 → owner unique set.
    const groups = await prisma.feedback.groupBy({
      by: ['restaurantId'],
      _count: { _all: true },
      having: { id: { _count: { gt: 50 } } },
    });
    if (groups.length === 0) return [];
    const restaurantIds = groups
      .map((g) => g.restaurantId)
      .filter((id): id is string => typeof id === 'string');
    const restaurants = await prisma.restaurant.findMany({
      where: { id: { in: restaurantIds }, userId: { not: null } },
      select: { userId: true },
    });
    const ownerIds = new Set<string>();
    for (const r of restaurants) {
      if (r.userId) ownerIds.add(r.userId);
    }
    // Filter to active owners.
    const activeOwners = await prisma.user.findMany({
      where: {
        id: { in: Array.from(ownerIds) },
        role: 'restaurant_owner',
        isActive: true,
      },
      select: { id: true },
    });
    presetIds = activeOwners.map((u) => u.id);
  }

  // Intersection — admin manuel selection preset'in subset'iyse, sadece
  // intersection'ı gönder. Boş manualIds → tüm preset.
  if (manualIds.length === 0) return presetIds;
  const manualSet = new Set(manualIds);
  return presetIds.filter((id) => manualSet.has(id));
}
