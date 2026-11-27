'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ScrollText } from 'lucide-react';
import { AlertBanner, Badge, PageHeader, Tabs, type TabItem } from '@/components/ui';
import { formatStampInTimeZone } from '@/lib/timezone';
import { LegalDocGroupsSkeleton } from './LegalDocGroupsSkeleton';

interface DocCell {
  id: string | null;
  key: string;
  locale: string;
  label: string;
  description: string;
  title: string;
  version: number;
  isActive: boolean;
  updatedAt: string | null;
  effectiveAt: string | null;
  source: 'db' | 'default';
}

const STATUS_TABS: TabItem[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'active', label: 'Aktif' },
  { id: 'inactive', label: 'Pasif' },
  { id: 'unseeded', label: 'Henüz oluşturulmadı' },
];

export default function LegalDocumentsIndexPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [docs, setDocs] = useState<DocCell[]>([]);
  const [search, setSearch] = useState('');
  // Debounced copy drives the fetch — one request per pause, not per key.
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (status && status !== 'all') params.set('status', status);
    (async () => {
      try {
        const res = await fetch(`/api/admin/legal-documents?${params.toString()}`);
        const body = await res.json();
        if (!alive) return;
        if (!res.ok) throw new Error(body.error || 'Yüklenemedi');
        setDocs(body.docs);
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [searchQuery, status, refreshKey]);

  const grouped = useMemo(() => {
    const map = new Map<string, DocCell[]>();
    for (const d of docs) {
      const arr = map.get(d.key) ?? [];
      arr.push(d);
      map.set(d.key, arr);
    }
    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      label: items[0].label,
      description: items[0].description,
      items: items.sort((a, b) => a.locale.localeCompare(b.locale)),
    }));
  }, [docs]);

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow="HUKUKİ METİNLER"
        title="Sözleşmeler ve onay metinleri"
        description="KVKK aydınlatma, açık rıza, kullanım şartları, çerez politikası ve diğer hukuki belgeleri buradan oluştur, düzenle ve versiyonla."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/legal-documents/variables"
              className="bz-btn-ghost"
            >
              Değişkenler
            </Link>
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="bz-btn-ghost"
              aria-label="Yenile"
            >
              Yenile
            </button>
          </div>
        }
      />

      {error && (
        <AlertBanner
          kind="danger"
          className="mb-4"
          onDismiss={() => setError(null)}
        >
          {error}
        </AlertBanner>
      )}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          placeholder="Başlık veya tür ara..."
          aria-label="Hukuki metin ara"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bz-input w-full sm:max-w-[320px]"
          enterKeyHint="search"
        />
        <Tabs items={STATUS_TABS} active={status} onChange={setStatus} />
      </div>

      <AlertBanner kind="info" className="mb-5">
        <div className="text-[13px] leading-[1.6]">
          <strong>Hukuki taslak uyarısı.</strong> Buradaki metinler genel taslaktır ve yayına alınmadan önce
          hukuk danışmanı veya KVKK uzmanı tarafından onaylanmalıdır. Şirket adı, adres, e-posta ve saklama süresi
          gibi alanlar <code className="rounded bg-white px-1 py-0.5 text-[12px]">{'{{PLACEHOLDER}}'}</code> formatındadır;
          metni kaydetmeden önce gerçek değerlerle doldurun.
        </div>
      </AlertBanner>

      {loading && docs.length === 0 ? (
        // Same group-card skeleton as loading.tsx (§40.10) — the list area
        // used to stay blank until the first response.
        <LegalDocGroupsSkeleton />
      ) : grouped.length === 0 ? (
        <div className="rounded-[24px] border border-pn-line bg-white p-10 text-center">
          <ScrollText size={28} className="mx-auto mb-3 text-[#A3A3A3]" />
          <p className="text-[14px] text-[#525252]">Filtrelere uyan metin bulunamadı.</p>
        </div>
      ) : (
        <div
          aria-busy={loading}
          className={`space-y-4 transition-opacity ${loading ? 'opacity-60' : ''}`}
        >
          {grouped.map((group) => (
            <div key={group.key} className="bz-card overflow-hidden">
              <div className="border-b border-pn-line px-5 py-4">
                <h2 className="bz-h-tight text-[16px] sm:text-[18px] tracking-[-0.02em]">
                  {group.label}
                </h2>
                <p className="mt-1 text-[13px] text-[#737373] leading-[1.55]">
                  {group.description}
                </p>
                <div className="mt-2 text-[12px] text-[#A3A3A3]">
                  {group.key}
                </div>
              </div>
              <div className="divide-y divide-pn-line">
                {group.items.map((item) => (
                  <Link
                    key={`${item.key}-${item.locale}`}
                    href={`/admin/legal-documents/${item.key}/${item.locale}`}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-pn-canvas"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-pn-line bg-white text-[12px] font-medium text-[#525252]">
                        {item.locale}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-medium text-pn-ink">
                          {item.title}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[12px] text-[#737373]">
                          {item.source === 'db' ? (
                            <>v{item.version}</>
                          ) : (
                            <span className="font-medium text-[#92400E]">Henüz oluşturulmadı · varsayılan metin kullanılıyor</span>
                          )}
                          {item.updatedAt && (
                            <span className="hidden sm:inline">
                              · Güncellendi {formatStampInTimeZone(item.updatedAt, 'tr')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {item.source === 'db' ? (
                        <Badge kind={item.isActive ? 'ok' : 'off'}>
                          {item.isActive ? 'Aktif' : 'Pasif'}
                        </Badge>
                      ) : (
                        <Badge kind="ghost">Taslak</Badge>
                      )}
                      <ArrowRight size={16} className="text-[#A3A3A3]" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
