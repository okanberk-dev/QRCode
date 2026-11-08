// Platform links across every business of a franchise — pure helper behind
// the "Tüm işletmeler" view of /dashboard/platforms (§49). Built on the same
// status model as the single-business page (platform-link-status), so a cell
// and the business page never disagree. Covered by
// `tests/platform-portfolio.test.ts`.

import { MANAGED_REVIEW_PLATFORMS, type ManageablePlatformDef } from '@/lib/platform-management';
import {
  computePlatformLinkStatuses,
  isPlatformLinkVisible,
  summarizePlatformLinks,
  type LatestCheckLite,
  type PlatformLinkRow,
  type PlatformLinkStatus,
  type PlatformLinkSummary,
} from '@/lib/platform-link-status';

export interface PortfolioMatrixRow {
  id: string;
  name: string;
  /** slug → status; `null` = not relevant for this business (out of sector, no link). */
  cells: Record<string, PlatformLinkStatus | null>;
  summary: PlatformLinkSummary;
  /** Something to fix: a broken link, or no working review link at all.
   *  A platform that is simply not added is an option, not a problem. */
  needsWork: boolean;
}

export interface PortfolioMatrix {
  /** Review platforms relevant to at least one business, catalogue order. */
  columns: ManageablePlatformDef[];
  rows: PortfolioMatrixRow[];
}

export function buildPlatformPortfolio<T extends PlatformLinkRow & { id: string; name: string }>(
  businesses: readonly T[],
  checksById: Record<string, Record<string, LatestCheckLite>>,
): PortfolioMatrix {
  const used = new Set<string>();
  const rows: PortfolioMatrixRow[] = businesses.map((business) => {
    const statuses = computePlatformLinkStatuses(business, checksById[business.id] ?? {}, { categories: ['review'] });
    const cells: Record<string, PlatformLinkStatus | null> = {};
    const visible: PlatformLinkStatus[] = [];
    for (const status of statuses) {
      if (isPlatformLinkVisible(status)) {
        cells[status.platform.slug] = status;
        visible.push(status);
        used.add(status.platform.slug);
      } else {
        cells[status.platform.slug] = null;
      }
    }
    const summary = summarizePlatformLinks(visible);
    return {
      id: business.id,
      name: business.name,
      cells,
      summary,
      needsWork: summary.issue > 0 || summary.connected === 0,
    };
  });
  const columns = MANAGED_REVIEW_PLATFORMS.filter((platform) => used.has(platform.slug));
  return { columns, rows };
}
