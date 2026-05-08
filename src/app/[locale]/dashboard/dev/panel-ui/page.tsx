'use client';

/**
 * Stage 68 §38.149 — HANDOFF Admin & Owner panel UI v2 showcase mount
 * (owner variant). Admin variant'ın (`/admin/dev/panel-ui`) lokal-aware
 * mirror'ı; owner panel sidebar dev section'ında görünür. Sadece
 * `NODE_ENV !== 'production'` durumunda sidebar item visible.
 *
 * Ana mantık: 24 AP* primitive (Stage 65 §38.146 PR0 base) tek sayfada
 * canlı render. Owner'a özel surface="owner" copy + banner farklılığı;
 * primitive davranışları admin variant ile birebir.
 *
 * CLAUDE.md §38.146 paterni — gerçek owner panel callsite'ları
 * dokunulmadı (bz-btn-* / Toggle / Badge / Tabs intact); PR1-5'te kademeli
 * migrate.
 */

import { PageHeader } from '@/components/ui';
import { PanelUiShowcase } from '@/components/dev/PanelUiShowcase';

export default function OwnerPanelUiShowcasePage() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow="DEV TOOLS · PANEL UI"
        title="Panel UI v2 — AP* primitive showcase"
        description="HANDOFF JSX prototip 24 AP* primitive'in canlı demo'su. Buttons / toggles / KPI / inbox / owner cards / alerts. Mevcut owner panel callsite'ları intact (bz-btn-* / Toggle / Badge / Tabs) — PR1-5'te kademeli migrate."
      />
      <PanelUiShowcase surface="owner" />
    </div>
  );
}
