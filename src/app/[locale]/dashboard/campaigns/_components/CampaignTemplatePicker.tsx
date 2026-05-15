'use client';

// Stage 119 §38.199 — Template picker step rendered before the compose form.
// Owner picks (a) a global Buaze template (sector-filtered), (b) one of
// their own saved templates, or (c) "Start blank". Result is fed back to
// the parent modal to prefill subject/body.

import { useEffect, useMemo, useState } from 'react';
import { AlertBanner } from '@/components/ui';
import { Loader2, Sparkles, FileText, Tag, ArrowRight } from 'lucide-react';
import type { SectorKey } from '@/lib/sector-platforms';
import { CAMPAIGN_TEMPLATE_CATEGORY_LABELS } from '@/lib/customer-campaign-templates/seed-data';

export interface CampaignTemplate {
  id: string;
  title: string;
  description: string | null;
  sector: string;
  locale: string;
  category: string;
  subject: string;
  body: string;
  isGlobal: boolean;
  isOwn: boolean;
}

interface Props {
  isTr: boolean;
  restaurantId: string;
  defaultSector: SectorKey | null;
  onPick: (template: CampaignTemplate | null) => void;
  onCancel: () => void;
}

const SECTOR_LABELS: Record<SectorKey, { tr: string; en: string }> = {
  food: { tr: 'Restoran / Kafe', en: 'Restaurant / Café' },
  delivery: { tr: 'Paket servis', en: 'Delivery' },
  hospitality: { tr: 'Otel / Konaklama', en: 'Hospitality' },
  clinic: { tr: 'Klinik / Sağlık', en: 'Clinic / Health' },
  legal: { tr: 'Hukuk bürosu', en: 'Legal' },
  spa: { tr: 'Spa / Güzellik', en: 'Spa / Beauty' },
  retail: { tr: 'Perakende / Mağaza', en: 'Retail' },
  fitness: { tr: 'Spor / Stüdyo', en: 'Fitness / Studio' },
  education: { tr: 'Eğitim / Kurs', en: 'Education' },
  other: { tr: 'Diğer', en: 'Other' },
};

const ALL_SECTORS: SectorKey[] = [
  'food',
  'delivery',
  'hospitality',
  'clinic',
  'legal',
  'spa',
  'retail',
  'fitness',
  'education',
  'other',
];

export function CampaignTemplatePicker({
  isTr,
  restaurantId,
  defaultSector,
  onPick,
  onCancel,
}: Props) {
  const locale: 'tr' | 'en' = isTr ? 'tr' : 'en';
  const [sector, setSector] = useState<SectorKey>(defaultSector ?? 'other');
  const [globalTemplates, setGlobalTemplates] = useState<CampaignTemplate[]>([]);
  const [ownTemplates, setOwnTemplates] = useState<CampaignTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const url = new URL('/api/customer-campaigns/templates', window.location.origin);
        url.searchParams.set('sector', sector);
        url.searchParams.set('locale', locale);
        url.searchParams.set('restaurantId', restaurantId);
        const res = await fetch(url.toString(), { credentials: 'include' });
        if (!res.ok) throw new Error('fetch_failed');
        const data = await res.json();
        if (!cancelled) {
          setGlobalTemplates(Array.isArray(data?.global) ? data.global : []);
          setOwnTemplates(Array.isArray(data?.own) ? data.own : []);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('[campaign-template-picker] fetch failed', err);
          setError(
            isTr
              ? 'Şablonlar yüklenemedi. Boş başlayabilirsin.'
              : 'Could not load templates. You can start from scratch.',
          );
          setGlobalTemplates([]);
          setOwnTemplates([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sector, locale, restaurantId, isTr]);

  const groupedGlobal = useMemo(() => {
    const buckets: Record<string, CampaignTemplate[]> = {};
    for (const t of globalTemplates) {
      const key = t.category || 'custom';
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(t);
    }
    return buckets;
  }, [globalTemplates]);

  const categoryOrder = ['reactivation', 'special-offer', 'feedback-request', 'custom'];

  return (
    <div className="space-y-4">
      <div className="rounded-[12px] border border-[#EDEDED] bg-[#FAFAFA] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF9B8]">
            <Sparkles size={16} strokeWidth={2.2} className="text-[#0A0A0A]" />
          </div>
          <div className="flex-1">
            <div className="pulse-eyebrow text-[10.5px] text-[#737373]">
              {isTr ? 'ŞABLON SEÇ' : 'PICK A TEMPLATE'}
            </div>
            <h3 className="bz-h-tight text-[16px] mt-0.5">
              {isTr
                ? 'Sektörüne uygun bir şablonla başla — istersen düzenle.'
                : 'Start with a template for your sector — edit freely.'}
            </h3>
            <p className="text-[12.5px] text-[#525252] mt-1 leading-[1.5]">
              {isTr
                ? 'Hazır şablonlar yalnızca taslak; içeriği gönderim öncesi istediğin gibi değiştirebilirsin.'
                : 'Templates are starting points — you can rewrite anything before sending.'}
            </p>
          </div>
        </div>
      </div>

      {/* Sector filter */}
      <div>
        <label className="block bz-h-tight text-[12px] mb-1.5">
          {isTr ? 'Sektör' : 'Sector'}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {ALL_SECTORS.map((s) => {
            const active = s === sector;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSector(s)}
                className={`px-3 py-1 rounded-full text-[12px] border transition-colors ${
                  active
                    ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                    : 'bg-white text-[#525252] border-[#EDEDED] hover:bg-[#FAFAFA]'
                }`}
              >
                {SECTOR_LABELS[s][locale]}
              </button>
            );
          })}
        </div>
      </div>

      {error ? <AlertBanner kind="warn">{error}</AlertBanner> : null}

      {loading ? (
        <div className="flex items-center justify-center py-8 text-[#737373] text-[12px]">
          <Loader2 size={16} className="animate-spin mr-2" />
          {isTr ? 'Şablonlar yükleniyor…' : 'Loading templates…'}
        </div>
      ) : (
        <>
          {/* "Start blank" card always first */}
          <button
            type="button"
            onClick={() => onPick(null)}
            className="group block w-full text-left rounded-[12px] border-2 border-dashed border-[#EDEDED] bg-white p-4 hover:border-[#0A0A0A] hover:bg-[#FAFAFA] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5F5F5] group-hover:bg-[#EAF9B8] transition-colors">
                <FileText size={16} strokeWidth={2.2} className="text-[#525252] group-hover:text-[#0A0A0A]" />
              </div>
              <div className="flex-1">
                <div className="bz-h-tight text-[14px]">
                  {isTr ? 'Boş şablonla başla' : 'Start from scratch'}
                </div>
                <div className="text-[11.5px] text-[#737373] mt-0.5">
                  {isTr ? 'Konuyu ve mesajı sıfırdan yaz.' : 'Write subject and body from scratch.'}
                </div>
              </div>
              <ArrowRight size={14} strokeWidth={2.2} className="text-[#A3A3A3] group-hover:text-[#0A0A0A]" />
            </div>
          </button>

          {/* Owner's saved templates */}
          {ownTemplates.length > 0 ? (
            <div>
              <div className="pulse-eyebrow text-[10.5px] text-[#737373] mb-2">
                {isTr ? 'KAYITLI ŞABLONLARIN' : 'YOUR SAVED TEMPLATES'}
              </div>
              <div className="space-y-2">
                {ownTemplates.map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    isTr={isTr}
                    onClick={() => onPick(t)}
                    badge={isTr ? 'Senin' : 'Yours'}
                    badgeColor="lime"
                  />
                ))}
              </div>
            </div>
          ) : null}

          {/* Global Buaze catalog grouped by category */}
          {globalTemplates.length > 0 ? (
            <div className="space-y-3">
              <div className="pulse-eyebrow text-[10.5px] text-[#737373]">
                {isTr ? 'BUAZE ÖNERİSİ' : 'BUAZE SUGGESTIONS'}
              </div>
              {categoryOrder.map((cat) => {
                const items = groupedGlobal[cat];
                if (!items || items.length === 0) return null;
                const label =
                  CAMPAIGN_TEMPLATE_CATEGORY_LABELS[cat as keyof typeof CAMPAIGN_TEMPLATE_CATEGORY_LABELS]
                    ?.[locale] ?? cat;
                return (
                  <div key={cat} className="space-y-2">
                    <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-[#525252]">
                      <Tag size={12} strokeWidth={2.2} />
                      {label}
                    </div>
                    {items.map((t) => (
                      <TemplateCard
                        key={t.id}
                        template={t}
                        isTr={isTr}
                        onClick={() => onPick(t)}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[12px] border border-[#EDEDED] bg-[#FAFAFA] p-4 text-[12px] text-[#737373] text-center">
              {isTr
                ? 'Bu sektör + dil için Buaze şablonu yok. Boş başlayabilir veya başka sektör seçebilirsin.'
                : 'No Buaze templates yet for this sector + language. Start blank or try another sector.'}
            </div>
          )}
        </>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="bz-btn-ghost px-4 min-h-[40px] text-[12.5px]"
        >
          {isTr ? 'Vazgeç' : 'Cancel'}
        </button>
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  isTr,
  onClick,
  badge,
  badgeColor,
}: {
  template: CampaignTemplate;
  isTr: boolean;
  onClick: () => void;
  badge?: string;
  badgeColor?: 'lime' | 'ghost';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group block w-full text-left rounded-[12px] border border-[#EDEDED] bg-white p-3.5 hover:border-[#0A0A0A] hover:bg-[#FAFAFA] transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <div className="bz-h-tight text-[13.5px] truncate">{template.title}</div>
            {badge ? (
              <span
                className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${
                  badgeColor === 'lime'
                    ? 'bg-[#EAF9B8] text-[#0A0A0A]'
                    : 'bg-[#F5F5F5] text-[#525252]'
                }`}
              >
                {badge}
              </span>
            ) : null}
          </div>
          {template.description ? (
            <div className="text-[11.5px] text-[#737373] line-clamp-2 mb-1">
              {template.description}
            </div>
          ) : null}
          <div className="text-[11.5px] text-[#525252] line-clamp-1 italic">
            <span className="text-[#A3A3A3] not-italic">
              {isTr ? 'Konu: ' : 'Subject: '}
            </span>
            {template.subject}
          </div>
        </div>
        <ArrowRight
          size={14}
          strokeWidth={2.2}
          className="text-[#A3A3A3] group-hover:text-[#0A0A0A] shrink-0 mt-1"
        />
      </div>
    </button>
  );
}
