'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Save,
  Link2,
  Plug,
} from 'lucide-react';
import PlatformLogo from '@/components/marketing/PlatformLogo';

interface RestaurantRow {
  id: string;
  name: string;
  slug: string;
  category: string;
  googleReviewUrl: string | null;
  googlePlaceId: string | null;
  yemekSepetiUrl: string | null;
  getirYemekUrl: string | null;
  trendyolYemekUrl: string | null;
}

type FieldKey =
  | 'googleReviewUrl'
  | 'googlePlaceId'
  | 'yemekSepetiUrl'
  | 'getirYemekUrl'
  | 'trendyolYemekUrl';

interface Draft {
  googleReviewUrl: string;
  googlePlaceId: string;
  yemekSepetiUrl: string;
  getirYemekUrl: string;
  trendyolYemekUrl: string;
}

const EMPTY_DRAFT: Draft = {
  googleReviewUrl: '',
  googlePlaceId: '',
  yemekSepetiUrl: '',
  getirYemekUrl: '',
  trendyolYemekUrl: '',
};

function toDraft(r: RestaurantRow): Draft {
  return {
    googleReviewUrl: r.googleReviewUrl ?? '',
    googlePlaceId: r.googlePlaceId ?? '',
    yemekSepetiUrl: r.yemekSepetiUrl ?? '',
    getirYemekUrl: r.getirYemekUrl ?? '',
    trendyolYemekUrl: r.trendyolYemekUrl ?? '',
  };
}

export default function DashboardIntegrationsPage() {
  const params = useParams();
  const locale = params?.locale === 'en' ? 'en' : 'tr';
  const isTr = locale === 'tr';

  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const copy = useMemo(
    () => ({
      eyebrow: isTr ? 'PANEL / ENTEGRASYONLAR' : 'PANEL / INTEGRATIONS',
      title: isTr ? 'Entegrasyonlar' : 'Integrations',
      subtitle: isTr
        ? 'Her platform için yorum yönlendirme bağlantısını tek panelden gir. Müşteri yüksek puan verince doğrudan o platforma yönlendirilir.'
        : 'Set the review-redirect link for every platform from one place. High ratings route the customer straight to that platform.',
      noRest: isTr
        ? 'Henüz işletmen yok. Önce bir işletme oluştur.'
        : 'No locations yet. Create one first.',
      addRest: isTr ? 'İşletme ekle' : 'Add a location',
      pickRest: isTr ? 'İşletme' : 'Location',
      save: isTr ? 'Kaydet' : 'Save',
      saving: isTr ? 'Kaydediliyor…' : 'Saving…',
      saved: isTr ? 'Kaydedildi' : 'Saved',
      noChange: isTr ? 'Değişiklik yok' : 'No changes',
      loadFail: isTr ? 'İşletmeler yüklenemedi.' : 'Could not load locations.',
      saveFail: isTr ? 'Kaydedilemedi.' : 'Could not save.',
      openProfile: isTr ? 'Detaylı işletme ayarları' : 'Full location settings',
      preview: isTr ? 'Yorum sayfasını test et' : 'Open review page',
      hint: {
        google:
          isTr
            ? 'Google Place ID veya doğrudan g.page/r/... formatında yorum URL\'i. Boşsa Google\'a yönlendirme kapanır.'
            : 'Either the Google Place ID or a g.page/r/... review URL. Leave empty to disable Google.',
        yemeksepeti:
          isTr ? 'Yemeksepeti restoran sayfası bağlantısı.' : 'Yemeksepeti restaurant page link.',
        getir: isTr ? 'Getir Yemek restoran sayfası bağlantısı.' : 'Getir Yemek restaurant page link.',
        trendyol: isTr ? 'Trendyol GO restoran sayfası bağlantısı.' : 'Trendyol GO restaurant page link.',
      },
      labels: {
        google: 'Google',
        yemeksepeti: 'Yemeksepeti',
        getir: 'Getir Yemek',
        trendyol: 'Trendyol GO',
      },
    }),
    [isTr],
  );

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/restaurants');
        if (!res.ok) {
          if (!cancelled) {
            setError(copy.loadFail);
            setLoading(false);
          }
          return;
        }
        const data = await res.json();
        const list: RestaurantRow[] = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
        if (cancelled) return;
        setRestaurants(list);
        const seed: Record<string, Draft> = {};
        for (const r of list) seed[r.id] = toDraft(r);
        setDrafts(seed);
        if (list.length > 0) setActiveId(list[0].id);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError(copy.loadFail);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [copy.loadFail]);

  const active = useMemo(
    () => restaurants.find((r) => r.id === activeId) || null,
    [restaurants, activeId],
  );
  const draft = drafts[activeId] ?? EMPTY_DRAFT;
  const original = active ? toDraft(active) : EMPTY_DRAFT;
  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(original),
    [draft, original],
  );

  const setField = (key: FieldKey, value: string) => {
    if (!activeId) return;
    setDrafts((prev) => ({
      ...prev,
      [activeId]: { ...(prev[activeId] ?? EMPTY_DRAFT), [key]: value },
    }));
    setSavedAt(null);
  };

  const handleSave = async () => {
    if (!active || !isDirty) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/restaurants/${active.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleReviewUrl: draft.googleReviewUrl.trim(),
          googlePlaceId: draft.googlePlaceId.trim(),
          yemekSepetiUrl: draft.yemekSepetiUrl.trim(),
          getirYemekUrl: draft.getirYemekUrl.trim(),
          trendyolYemekUrl: draft.trendyolYemekUrl.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || copy.saveFail);
      }
      const updated = await res.json();
      setRestaurants((prev) =>
        prev.map((r) =>
          r.id === active.id
            ? {
                ...r,
                googleReviewUrl: updated.googleReviewUrl ?? null,
                googlePlaceId: updated.googlePlaceId ?? null,
                yemekSepetiUrl: updated.yemekSepetiUrl ?? null,
                getirYemekUrl: updated.getirYemekUrl ?? null,
                trendyolYemekUrl: updated.trendyolYemekUrl ?? null,
              }
            : r,
        ),
      );
      setSavedAt(Date.now());
    } catch (e) {
      setError((e as Error).message || copy.saveFail);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0A0A0A]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[900px] space-y-6 px-4 py-8 sm:px-7 lg:py-10">
      <header>
        <p className="pulse-eyebrow text-[#737373]">{copy.eyebrow}</p>
        <h1
          className="mt-2 flex items-center gap-2 text-[26px] sm:text-[32px] font-medium tracking-[-0.025em] leading-[1.05] text-[#0A0A0A]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          <Plug size={24} strokeWidth={2} className="text-[#0A0A0A]" />
          {copy.title}
        </h1>
        <p className="mt-2 text-[14px] text-[#525252] leading-[1.55]">{copy.subtitle}</p>
      </header>

      {restaurants.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-10 text-center">
          <p className="text-[14px] text-[#525252]">{copy.noRest}</p>
          <Link
            href={`/${locale}/dashboard/restaurants`}
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#C6F24E] px-5 py-2.5 text-[13px] font-medium text-[#0A0A0A] hover:bg-[#A8D62E] transition-colors"
          >
            {copy.addRest}
          </Link>
        </div>
      ) : (
        <>
          {/* Restaurant picker — only renders when there are 2+ */}
          {restaurants.length > 1 && (
            <div className="rounded-2xl border border-[#EDEDED] bg-white p-4 sm:p-5">
              <label
                htmlFor="rest-picker"
                className="pulse-eyebrow text-[#737373] block"
              >
                {copy.pickRest}
              </label>
              <select
                id="rest-picker"
                value={activeId}
                onChange={(e) => {
                  setActiveId(e.target.value);
                  setSavedAt(null);
                  setError(null);
                }}
                className="mt-2 w-full rounded-xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none focus:border-[#0A0A0A] transition-colors"
              >
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Form */}
          {active && (
            <div className="rounded-2xl border border-[#EDEDED] bg-white p-5 sm:p-7 space-y-5">
              {/* Header strip with name + open-detail link */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <h2
                    className="text-[18px] sm:text-[20px] font-semibold text-[#0A0A0A] tracking-[-0.015em] truncate"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {active.name}
                  </h2>
                  <p className="pulse-eyebrow text-[#737373] mt-0.5 truncate">
                    {active.category}
                  </p>
                </div>
                <Link
                  href={`/${locale}/dashboard/restaurants/${active.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#EDEDED] bg-white px-3.5 py-2 text-[12px] font-medium text-[#0A0A0A] hover:border-[#0A0A0A] transition-colors"
                >
                  {copy.openProfile}
                  <ExternalLink size={12} strokeWidth={2} />
                </Link>
              </div>

              {/* Google */}
              <PlatformField
                logo={<PlatformLogo id="google" size={20} rounded={5} />}
                label={copy.labels.google}
                hint={copy.hint.google}
                accent="#4285F4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="url"
                    inputMode="url"
                    value={draft.googleReviewUrl}
                    onChange={(e) => setField('googleReviewUrl', e.target.value)}
                    placeholder="https://g.page/r/..."
                    className="w-full rounded-xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none focus:border-[#4285F4] transition-colors"
                    aria-label="Google review URL"
                  />
                  <input
                    type="text"
                    value={draft.googlePlaceId}
                    onChange={(e) => setField('googlePlaceId', e.target.value)}
                    placeholder="Place ID (ChIJ…)"
                    className="w-full rounded-xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none focus:border-[#4285F4] transition-colors font-mono"
                    aria-label="Google Place ID"
                  />
                </div>
              </PlatformField>

              {/* Yemeksepeti */}
              <PlatformField
                logo={<PlatformLogo id="yemeksepeti" size={20} rounded={5} />}
                label={copy.labels.yemeksepeti}
                hint={copy.hint.yemeksepeti}
                accent="#FA0050"
              >
                <input
                  type="url"
                  inputMode="url"
                  value={draft.yemekSepetiUrl}
                  onChange={(e) => setField('yemekSepetiUrl', e.target.value)}
                  placeholder="https://www.yemeksepeti.com/..."
                  className="w-full rounded-xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none focus:border-[#FA0050] transition-colors"
                />
              </PlatformField>

              {/* Getir */}
              <PlatformField
                logo={<PlatformLogo id="getir-yemek" size={20} rounded={5} />}
                label={copy.labels.getir}
                hint={copy.hint.getir}
                accent="#5D3EBC"
              >
                <input
                  type="url"
                  inputMode="url"
                  value={draft.getirYemekUrl}
                  onChange={(e) => setField('getirYemekUrl', e.target.value)}
                  placeholder="https://getir.com/yemek/..."
                  className="w-full rounded-xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none focus:border-[#5D3EBC] transition-colors"
                />
              </PlatformField>

              {/* Trendyol */}
              <PlatformField
                logo={<PlatformLogo id="trendyol-go" size={20} rounded={5} />}
                label={copy.labels.trendyol}
                hint={copy.hint.trendyol}
                accent="#F27A1A"
              >
                <input
                  type="url"
                  inputMode="url"
                  value={draft.trendyolYemekUrl}
                  onChange={(e) => setField('trendyolYemekUrl', e.target.value)}
                  placeholder="https://www.trendyol.com/..."
                  className="w-full rounded-xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none focus:border-[#F27A1A] transition-colors"
                />
              </PlatformField>

              {/* Save bar */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-3 border-t border-[#EDEDED]">
                <div className="flex items-center gap-2 min-h-[20px]" aria-live="polite">
                  {error ? (
                    <>
                      <AlertCircle size={14} className="text-[#DC2626]" />
                      <span className="text-[12px] text-[#DC2626]">{error}</span>
                    </>
                  ) : savedAt ? (
                    <>
                      <CheckCircle2 size={14} className="text-[#16A34A]" />
                      <span className="text-[12px] text-[#16A34A]">{copy.saved}</span>
                    </>
                  ) : !isDirty ? (
                    <span className="text-[12px] text-[#737373]">{copy.noChange}</span>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link
                    href={`/r/${active.slug}`}
                    target="_blank"
                    className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#EDEDED] bg-white px-4 py-2.5 text-[13px] font-medium text-[#0A0A0A] hover:border-[#0A0A0A] transition-colors"
                  >
                    <Link2 size={13} strokeWidth={2} />
                    {copy.preview}
                  </Link>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!isDirty || saving}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#C6F24E] px-5 py-2.5 text-[13px] font-medium text-[#0A0A0A] hover:bg-[#A8D62E] transition-colors disabled:bg-[#EDEDED] disabled:text-[#A3A3A3] disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Save size={13} strokeWidth={2} />
                    )}
                    {saving ? copy.saving : copy.save}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PlatformField({
  logo,
  label,
  hint,
  accent,
  children,
}: {
  logo: React.ReactNode;
  label: string;
  hint: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="shrink-0">{logo}</span>
        <span
          className="text-[13px] font-semibold text-[#0A0A0A] tracking-[-0.01em]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {label}
        </span>
        <span
          aria-hidden="true"
          className="inline-block h-1 w-1 rounded-full"
          style={{ backgroundColor: accent }}
        />
      </div>
      {children}
      <p className="text-[11px] text-[#737373] leading-[1.5]">{hint}</p>
    </div>
  );
}
