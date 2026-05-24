'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, QrCode, Sparkles } from 'lucide-react';
import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';
import SuperadminBlock from '@/components/admin/SuperadminBlock';
import { PageHeader } from '@/components/ui';

interface Campaign {
  id: string;
  name: string;
  placement: 'table' | 'receipt' | 'door' | 'pack';
  count: number;
  template: 'lime' | 'white' | 'dark' | 'minimal';
  color: string;
  status: 'draft' | 'live' | 'archived';
  restaurantName?: string | null;
  createdAt: string;
}

const PLACEMENT_LABEL: Record<Campaign['placement'], { tr: string; en: string }> = {
  table: { tr: 'Masa', en: 'Table' },
  receipt: { tr: 'Fatura', en: 'Receipt' },
  door: { tr: 'Kapı', en: 'Door' },
  pack: { tr: 'Paket', en: 'Pack' },
};

const STATUS_STYLE: Record<Campaign['status'], { tr: string; en: string; cls: string }> = {
  live: { tr: 'AKTİF', en: 'LIVE', cls: 'bg-[#EAF9B8] text-[#0A0A0A]' },
  draft: { tr: 'TASLAK', en: 'DRAFT', cls: 'bg-[#F5F5F5] text-[#525252]' },
  archived: { tr: 'ARŞİV', en: 'ARCHIVED', cls: 'bg-[#FAFAFA] text-[#737373]' },
};

export default function AdminCampaignsPage() {
  return (
    <SuperadminBlock>
      <AdminCampaignsBody />
    </SuperadminBlock>
  );
}

function AdminCampaignsBody() {
  const { locale } = useAdminTranslation();
  const isTr = locale === 'tr';
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/campaigns');
        if (res.ok) {
          const data = await res.json();
          setItems((data.data as Campaign[]) ?? []);
        }
      } catch {
        /* empty state will show */
      }
      setLoading(false);
    })();
  }, []);

  const flash = (m: string) => {
    setNotice(m);
    setTimeout(() => setNotice(null), 2500);
  };

  const onCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: isTr ? 'Yeni kampanya' : 'New campaign', placement: 'table', template: 'lime' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.campaign) setItems((list) => [data.campaign, ...list]);
        flash(isTr ? 'Kampanya oluşturuldu' : 'Campaign created');
      } else {
        const body = await res.json().catch(() => ({}));
        flash(isTr ? `Hata: ${body.error ?? res.status}` : `Error: ${body.error ?? res.status}`);
      }
    } catch {
      flash(isTr ? 'Ağ hatası' : 'Network error');
    }
    setCreating(false);
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8 space-y-4">
      <PageHeader
        eyebrow={isTr ? 'KAMPANYALAR' : 'CAMPAIGNS'}
        title={isTr ? 'QR kampanyaları' : 'QR campaigns'}
        description={
          isTr
            ? 'Belirli platformlara veya masa setlerine yönelik QR kampanyaları oluştur ve etkileşimi izle.'
            : 'Create QR campaigns targeting specific platforms or table sets and track engagement.'
        }
        actions={
          <>
            {notice && (
              <span className="pulse-eyebrow rounded-full bg-[#EAF9B8] px-3 py-1.5 text-[#0A0A0A]">
                {notice}
              </span>
            )}
            <button onClick={onCreate} disabled={creating} className="bz-btn-lime">
              {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} strokeWidth={2} />}
              {isTr ? 'Yeni kampanya' : 'New campaign'}
            </button>
          </>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-[#EDEDED] bg-white p-20 text-[#737373]">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-12 text-center">
          <Sparkles size={20} className="text-[#737373]" />
          <p className="text-[13px] text-[#525252]">
            {isTr ? 'Henüz kampanya yok. QR’ı konumlara yaymak için bir tane oluştur.' : 'No campaigns yet. Create one to roll QRs to locations.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((c) => {
            const style = STATUS_STYLE[c.status];
            return (
              <article key={c.id} className="flex flex-col gap-3 rounded-2xl border border-[#EDEDED] bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="pulse-eyebrow text-[#737373]">
                      {PLACEMENT_LABEL[c.placement][isTr ? 'tr' : 'en']} · {c.count}
                    </p>
                    <h3 className="mt-1 text-[16px] font-semibold text-[#0A0A0A]">
                      {c.name}
                    </h3>
                    {c.restaurantName && <p className="mt-0.5 text-[12px] text-[#737373]">{c.restaurantName}</p>}
                  </div>
                  <span className={`pulse-eyebrow rounded px-2 py-1 ${style.cls}`}>{style[isTr ? 'tr' : 'en']}</span>
                </div>
                <div
                  className="flex aspect-[5/3] items-center justify-center rounded-lg"
                  style={{ backgroundColor: c.template === 'dark' ? '#0A0A0A' : c.template === 'lime' ? '#EAF9B8' : '#FAFAFA' }}
                >
                  <QrCode
                    size={72}
                    strokeWidth={1.5}
                    style={{ color: c.template === 'dark' ? '#C6F24E' : '#0A0A0A' }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#737373]">
                  <span>{new Date(c.createdAt).toLocaleDateString(isTr ? 'tr-TR' : 'en-US')}</span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                    <span>{c.template.toUpperCase()}</span>
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
