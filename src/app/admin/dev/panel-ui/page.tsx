'use client';

/**
 * Stage 68 §38.149 — HANDOFF Admin & Owner panel UI v2 showcase mount
 * (admin variant). Pulse §11 + Stage 65 §38.146 AP* primitive set'inin
 * canlı demo sayfası. Sidebar → Mail → "Panel UI v2 (dev)" link'i ile
 * erişilir, sadece `NODE_ENV !== 'production'` durumunda görünür.
 *
 * Ana mantık: production'da bu sayfa otomatik olarak 404 olmaz (admin
 * layout auth check → superadmin/manager intact); ama sidebar'da
 * görünmez ve doğrudan URL ile erişilse bile dev-only "DEV ONLY"
 * banner'ı gerçek bir feature olmadığını netleştirir. CLAUDE.md §38.146
 * paterni — "PR1-5'te kademeli migrate, PR6'da counterparts sil".
 *
 * Owner mirror: `/[locale]/dashboard/dev/panel-ui` (owner role) —
 * aynı `<PanelUiShowcase>` mount edilir, surface="owner" prop'uyla
 * banner copy farklılaşır.
 */

import { PageHeader } from '@/components/ui';
import { PanelUiShowcase } from '@/components/dev/PanelUiShowcase';

export default function AdminPanelUiShowcasePage() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow="DEV TOOLS · PANEL UI"
        title="Panel UI v2 — AP* primitive showcase"
        description="HANDOFF JSX prototip 24 AP* primitive'in canlı demo'su. 6 frame içinde buttons / toggles / KPI / inbox / owner cards / alerts. PR1-5'te mevcut bz-btn-*/Toggle/Badge/Tabs callsite'ları kademeli migrate."
      />
      <PanelUiShowcase surface="admin" />
    </div>
  );
}
