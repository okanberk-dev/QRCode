'use client';

// Franchise helper on a contact-channel platform page (Instagram, Facebook,
// WhatsApp): branches of one brand usually share the same profile, so the
// saved link can be copied to the other businesses in one go.
//
// Review platforms are excluded on purpose — every branch has its own Google
// / Yemeksepeti page, copying one would send customers to the wrong place.
// Each business is saved with its own PUT /api/restaurants/[id] (same
// validation, permission check and audit log as a single save), one after
// the other; per-business results are listed.

import { useMemo, useState } from 'react';
import { CheckCircle2, Copy, Loader2, XCircle } from 'lucide-react';
import { APCheckbox } from '@/components/ui';
import { PlatformCard } from './PlatformCard';
import type { PlatformUrlField } from '@/lib/platform-management';

interface ApplyBusiness {
  id: string;
  name: string;
  url: string | null;
}

interface ApplyLinkToBusinessesProps {
  locale: 'tr' | 'en';
  platformName: string;
  urlField: PlatformUrlField;
  /** Saved link of the business being edited. */
  url: string;
  sourceRestaurantId: string;
  businesses: ApplyBusiness[];
  /** Called with the ids that were saved, so the page can update its rows. */
  onApplied: (ids: string[], url: string) => void;
}

type RowResult = { ok: true } | { ok: false; message: string };

export function ApplyLinkToBusinesses({
  locale,
  platformName,
  urlField,
  url,
  sourceRestaurantId,
  businesses,
  onApplied,
}: ApplyLinkToBusinessesProps) {
  const isTr = locale === 'tr';
  const others = useMemo(
    () => businesses.filter((business) => business.id !== sourceRestaurantId),
    [businesses, sourceRestaurantId],
  );
  const candidates = others.filter((business) => (business.url ?? '').trim() !== url.trim());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Record<string, RowResult>>({});

  if (others.length === 0) return null;

  const toggle = (id: string, next: boolean) => {
    setSelected((current) => {
      const copy = new Set(current);
      if (next) copy.add(id);
      else copy.delete(id);
      return copy;
    });
  };
  const allSelected = candidates.length > 0 && candidates.every((business) => selected.has(business.id));

  const apply = async () => {
    if (running || selected.size === 0) return;
    setRunning(true);
    setResults({});
    const saved: string[] = [];
    for (const business of candidates) {
      if (!selected.has(business.id)) continue;
      try {
        const response = await fetch(`/api/restaurants/${business.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [urlField]: url.trim() }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            typeof data?.error === 'string' && data.error
              ? data.error
              : isTr
                ? 'Kaydedilemedi.'
                : 'Could not save.',
          );
        }
        saved.push(business.id);
        setResults((current) => ({ ...current, [business.id]: { ok: true } }));
      } catch (err) {
        const message = err instanceof Error && err.message ? err.message : isTr ? 'Kaydedilemedi.' : 'Could not save.';
        setResults((current) => ({ ...current, [business.id]: { ok: false, message } }));
      }
    }
    if (saved.length > 0) onApplied(saved, url.trim());
    setSelected(new Set());
    setRunning(false);
  };

  const savedCount = Object.values(results).filter((result) => result.ok).length;
  const failedCount = Object.values(results).filter((result) => !result.ok).length;

  return (
    <PlatformCard
      icon={<Copy size={18} aria-hidden="true" />}
      title={isTr ? 'Diğer işletmelere uygula' : 'Apply to your other businesses'}
      description={
        isTr
          ? `Şubeleriniz aynı ${platformName} hesabını kullanıyorsa bu linki tek seferde kopyalayın.`
          : `If your branches share one ${platformName} account, copy this link to them in one go.`
      }
    >
      <div className="space-y-3">
        {candidates.length === 0 ? (
          <p className="rounded-[16px] bg-pn-canvas px-4 py-3 text-[14px] text-[#525252]">
            {isTr ? 'Tüm işletmelerinizde bu link zaten kayıtlı.' : 'All your businesses already use this link.'}
          </p>
        ) : (
          <>
            <div className="flex min-h-[44px] items-center justify-between gap-2 px-1">
              <APCheckbox
                checked={allSelected}
                indeterminate={!allSelected && selected.size > 0}
                onChange={(next) => setSelected(next ? new Set(candidates.map((business) => business.id)) : new Set())}
                label={isTr ? 'Tümünü seç' : 'Select all'}
                disabled={running}
              />
              <span className="tabular-nums text-[13px] text-[#737373]">
                {isTr ? `${selected.size} seçili` : `${selected.size} selected`}
              </span>
            </div>
            <ul className="space-y-2" role="list">
              {others.map((business) => {
                const same = (business.url ?? '').trim() === url.trim();
                const result = results[business.id];
                return (
                  <li key={business.id} className="flex min-h-[56px] items-center gap-3 rounded-[16px] bg-pn-canvas px-3 py-2.5">
                    <APCheckbox
                      checked={same || selected.has(business.id)}
                      onChange={(next) => toggle(business.id, next)}
                      disabled={same || running}
                      ariaLabel={business.name}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-pn-ink">{business.name}</p>
                      <p className="truncate tabular-nums text-[13px] text-[#666666]">
                        {same
                          ? isTr
                            ? 'Aynı link kayıtlı'
                            : 'Already uses this link'
                          : business.url?.trim() || (isTr ? 'Link yok' : 'No link')}
                      </p>
                    </div>
                    {result?.ok && (
                      <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-[#E6F7EA] px-2.5 text-[12px] font-medium text-[#1F7A35]">
                        <CheckCircle2 size={13} aria-hidden="true" />
                        {isTr ? 'Kaydedildi' : 'Saved'}
                      </span>
                    )}
                    {result && !result.ok && (
                      <span
                        className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-[#FDECEC] px-2.5 text-[12px] font-medium text-[#C4271B]"
                        title={result.message}
                      >
                        <XCircle size={14} aria-hidden="true" />
                        {isTr ? 'Hata' : 'Failed'}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={apply}
              disabled={selected.size === 0 || running}
              className="bz-btn-primary inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 disabled:cursor-not-allowed sm:w-auto"
            >
              {running ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
              {running
                ? isTr
                  ? 'Kaydediliyor…'
                  : 'Saving…'
                : isTr
                  ? `Seçili ${selected.size} işletmeye kaydet`
                  : `Save to ${selected.size} selected`}
            </button>
          </>
        )}
        <p role="status" aria-live="polite" className="text-[13px] text-[#525252] [&:empty]:hidden">
          {savedCount + failedCount > 0
            ? isTr
              ? `${savedCount} işletmeye kaydedildi${failedCount ? `, ${failedCount} işletmede hata` : ''}.`
              : `Saved to ${savedCount} businesses${failedCount ? `, ${failedCount} failed` : ''}.`
            : ''}
        </p>
      </div>
    </PlatformCard>
  );
}

export default ApplyLinkToBusinesses;
