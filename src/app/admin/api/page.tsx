'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ActivitySquare,
  Copy,
  Globe,
  KeyRound,
  Loader2,
  Plus,
  RotateCw,
  ShieldCheck,
  Trash2,
  Webhook,
} from 'lucide-react';
import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';
import { PageHeader, Badge, Modal } from '@/components/ui';

interface ApiKey {
  id: string;
  name: string;
  scopes: string[];
  prefix?: string;
  createdAt: string;
  lastUsedAt?: string | null;
  revokedAt?: string | null;
}

interface WebhookRow {
  id: string;
  url: string;
  events: string[];
  status: 'active' | 'paused' | 'failing';
  lastDelivery?: string | null;
}

interface ActivityRow {
  id: string;
  label: string;
  at: string;
  status: 'ok' | 'fail' | 'pending';
}

// API keys are actor-scoped (`/api/api-keys` → `admin:<id>`), so the page is
// safe for every admin role. The sidebar lists it under "Sistem" for
// superadmin — it must not be wrapped in SuperadminBlock (that gate hid the
// whole tool from the only role that can reach it, §38.233).
export default function AdminApiPage() {
  const { locale } = useAdminTranslation();
  const isTr = locale === 'tr';

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [showKey, setShowKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);

  const fetchKeys = async () => {
    const res = await fetch('/api/api-keys');
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    setKeys((data?.data as ApiKey[]) ?? []);
  };

  useEffect(() => {
    (async () => {
      try {
        await fetchKeys();
      } catch {
        setKeys([]);
        flash(isTr ? 'API anahtarları alınamadı' : 'Could not load API keys');
      }
      // Webhooks + recent-activity için henüz backend yok (CRUD + delivery
      // log). Sahte demo veri kaldırıldı — operatör boş state görür, gerçek
      // sistem durumu hakkında yanılmaz. Backend gelince state doldurulacak.
      setWebhooks([]);
      setActivity([]);
      setLoading(false);
    })();
    // Mount-only load. `isTr` only affects render output; locale change via
    // parent layout already triggers a full remount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flash = (m: string) => {
    setNotice(m);
    setTimeout(() => setNotice(null), 2500);
  };

  const onCreate = async () => {
    if (!newKeyName.trim()) return;
    setCreatingKey(true);
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: newKeyName, scopes: ['feedback:read'] }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewToken(typeof data.token === 'string' ? data.token : null);
        await fetchKeys();
        flash(isTr ? 'Anahtar oluşturuldu' : 'Key created');
      } else {
        flash(isTr ? 'Hata' : 'Error');
      }
    } catch {
      flash(isTr ? 'Ağ hatası' : 'Network error');
    }
    setCreatingKey(false);
    setShowKey(false);
    setNewKeyName('');
  };

  const onRevoke = async (id: string) => {
    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(String(res.status));
      await fetchKeys();
      flash(isTr ? 'Anahtar iptal edildi' : 'Key revoked');
    } catch {
      flash(isTr ? 'Hata' : 'Error');
    }
  };

  const onRotate = async (id: string) => {
    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: 'POST' });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setNewToken(typeof data.token === 'string' ? data.token : null);
      await fetchKeys();
      flash(isTr ? 'Anahtar yenilendi' : 'Key rotated');
    } catch {
      flash(isTr ? 'Hata' : 'Error');
    }
  };

  const onCopy = (prefix: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(prefix).catch(() => {});
    }
    flash(isTr ? 'Kopyalandı' : 'Copied');
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8 space-y-5">
      <PageHeader
        eyebrow={isTr ? 'API & WEBHOOK' : 'API & WEBHOOKS'}
        title={isTr ? 'API anahtarları & webhook\'lar' : 'API keys & webhooks'}
        description={
          isTr
            ? 'Kişisel API anahtarlarını yönet, webhook uç noktalarını tanımla, teslimat aktivitesini izle.'
            : 'Manage personal API tokens, define webhook endpoints, track delivery activity.'
        }
        actions={
          notice ? (
            <span className="text-[13px] font-medium rounded-full bg-pn-accent-soft px-3 py-1.5 text-pn-ink">
              {notice}
            </span>
          ) : null
        }
      />

      {newToken && (
        <section className="rounded-[24px] border border-pn-accent bg-[#F7FFE4] p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[13px] font-medium text-pn-ink">{isTr ? 'YENİ ANAHTAR' : 'NEW TOKEN'}</p>
              <p className="mt-1 text-[12px] text-[#525252]">
                {isTr ? 'Bu token sadece bir kez gösterilir.' : 'This token is shown only once.'}
              </p>
            </div>
            <button
              onClick={() => onCopy(newToken)}
              className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-pn-ink bg-white px-3 py-2 font-mono text-[12px] text-pn-ink hover:bg-pn-canvas"
            >
              <Copy size={11} />
              <span className="truncate">{newToken}</span>
            </button>
          </div>
        </section>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-[24px] border border-pn-line bg-white p-20 text-[#737373]">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
          <div className="space-y-4">
            {/* API Keys */}
            <section className="rounded-[24px] border border-pn-line bg-white">
              <div className="flex items-center justify-between gap-4 border-b border-pn-line p-5">
                <div className="flex items-center gap-2">
                  <KeyRound size={14} className="text-pn-ink" />
                  <p className="text-[13px] font-medium text-[#737373]">{isTr ? 'API ANAHTARLARI' : 'API KEYS'}</p>
                </div>
                <button
                  onClick={() => setShowKey(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-pn-accent px-3 py-1.5 text-[12px] font-medium text-white hover:bg-pn-accent-hover"
                >
                  <Plus size={12} /> {isTr ? 'Yeni anahtar' : 'New key'}
                </button>
              </div>
              <div className="divide-y divide-pn-line">
                {keys.length === 0 ? (
                  <p className="p-8 text-center text-[13px] text-[#737373]">
                    {isTr ? 'Henüz API anahtarı yok.' : 'No API keys yet.'}
                  </p>
                ) : (
                  keys.map((k) => (
                    <div key={k.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium text-pn-ink">{k.name}</p>
                        <p className="text-[13px] font-medium mt-0.5 text-[#737373]">
                          {k.scopes.join(' · ')}
                        </p>
                      </div>
                      {k.prefix && (
                        <button
                          onClick={() => onCopy(k.prefix!)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-pn-line bg-pn-canvas px-2.5 py-1.5 font-mono text-[12px] text-[#525252] hover:border-pn-ink"
                        >
                          <Copy size={10} /> {k.prefix}
                        </button>
                      )}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onRotate(k.id)}
                          title={isTr ? 'Yenile' : 'Rotate'}
                          className="bz-btn-icon"
                          aria-label={isTr ? 'Yenile' : 'Rotate'}
                        >
                          <RotateCw size={12} />
                        </button>
                        <button
                          onClick={() => onRevoke(k.id)}
                          title={isTr ? 'İptal et' : 'Revoke'}
                          className="bz-btn-icon text-[#DC2626] hover:bg-[#FEF2F2]"
                          aria-label={isTr ? 'İptal et' : 'Revoke'}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <p className="text-[13px] font-medium w-full text-[#A3A3A3] sm:w-auto">
                        {k.lastUsedAt
                          ? isTr
                            ? `Son kullanım: ${new Date(k.lastUsedAt).toLocaleString('tr-TR')}`
                            : `Last used: ${new Date(k.lastUsedAt).toLocaleString('en-US')}`
                          : isTr
                            ? 'HİÇ KULLANILMADI'
                            : 'NEVER USED'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Webhooks */}
            <section className="rounded-[24px] border border-pn-line bg-white">
              <div className="flex items-center justify-between gap-4 border-b border-pn-line p-5">
                <div className="flex items-center gap-2">
                  <Webhook size={14} className="text-pn-ink" />
                  <p className="text-[13px] font-medium text-[#737373]">{isTr ? 'WEBHOOK' : 'WEBHOOKS'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge kind="ghost">{isTr ? 'Yakında' : 'Coming soon'}</Badge>
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    className="bz-btn bz-btn-sm cursor-not-allowed opacity-50"
                  >
                    <Plus size={12} /> {isTr ? 'Adres ekle' : 'Add endpoint'}
                  </button>
                </div>
              </div>
              <div className="divide-y divide-pn-line">
                {webhooks.length === 0 && (
                  <div className="flex flex-col items-center gap-1.5 p-8 text-center">
                    <Webhook size={18} className="text-[#A3A3A3]" />
                    <p className="text-[13px] font-medium text-pn-ink">
                      {isTr ? 'Henüz webhook adresi yok' : 'No webhook endpoints yet'}
                    </p>
                    <p className="max-w-sm text-[12px] text-[#737373]">
                      {isTr
                        ? 'Olayları dış bir adrese iletme özelliği yakında geliyor. Şu an kayıtlı adres yok.'
                        : 'Webhook delivery (event → external URL) is coming soon. No active endpoints yet.'}
                    </p>
                  </div>
                )}
                {webhooks.map((w) => (
                  <div key={w.id} className="grid gap-3 p-5 md:grid-cols-[1fr_auto]">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[13px] text-pn-ink">{w.url}</p>
                      <p className="text-[13px] font-medium mt-1 text-[#737373]">{w.events.join(' · ')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[13px] font-medium rounded px-2 py-1 ${
                          w.status === 'active'
                            ? 'bg-pn-accent-soft text-pn-ink'
                            : w.status === 'paused'
                              ? 'bg-pn-canvas text-[#737373]'
                              : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {w.status === 'active'
                          ? isTr ? 'AKTİF' : 'ACTIVE'
                          : w.status === 'paused'
                            ? isTr ? 'DURAKLATILDI' : 'PAUSED'
                            : isTr ? 'HATA' : 'FAILING'}
                      </span>
                      {w.lastDelivery && (
                        <span className="text-[13px] font-medium text-[#A3A3A3]">
                          {new Date(w.lastDelivery).toLocaleDateString(isTr ? 'tr-TR' : 'en-US')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* OAuth providers hint card */}
            <section className="rounded-[24px] border border-dashed border-pn-line bg-pn-canvas p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-pn-ink border border-pn-line">
                  <Globe size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-pn-ink">
                    {isTr ? 'Google bağlantıları' : 'Google connections'}
                  </p>
                  <p className="mt-1 text-[12px] text-[#525252]">
                    {isTr
                      ? 'İşletmelerin Google Business Profile bağlantıları '
                      : "Businesses' Google Business Profile connections are tracked on the "}
                    <Link href="/admin/google" className="font-medium text-pn-ink underline underline-offset-2">
                      {isTr ? 'Google Entegrasyonları' : 'Google Integrations'}
                    </Link>
                    {isTr ? ' sayfasından izlenir.' : ' page.'}
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Activity column */}
          <section className="rounded-[24px] border border-pn-line bg-white">
            <div className="flex items-center gap-2 border-b border-pn-line p-5">
              <ActivitySquare size={14} className="text-pn-ink" />
              <p className="text-[13px] font-medium text-[#737373]">{isTr ? 'SON OLAYLAR' : 'RECENT ACTIVITY'}</p>
            </div>
            <ul className="divide-y divide-pn-line">
              {activity.length === 0 && (
                <li className="flex flex-col items-center gap-1.5 p-8 text-center">
                  <ActivitySquare size={18} className="text-[#A3A3A3]" />
                  <p className="text-[13px] font-medium text-pn-ink">
                    {isTr ? 'Henüz olay kaydı yok' : 'No activity yet'}
                  </p>
                  <p className="max-w-xs text-[12px] text-[#737373]">
                    {isTr
                      ? 'Teslimat günlüğü webhook desteğiyle birlikte gelecek.'
                      : 'A delivery log will arrive together with webhook support.'}
                  </p>
                </li>
              )}
              {activity.map((a) => (
                <li key={a.id} className="flex items-start gap-3 p-4">
                  <span
                    className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${
                      a.status === 'ok'
                        ? 'bg-[#16A34A]'
                        : a.status === 'fail'
                          ? 'bg-red-500'
                          : 'bg-pn-accent'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-pn-ink">{a.label}</p>
                    <p className="text-[13px] font-medium mt-0.5 text-[#737373]">
                      {new Date(a.at).toLocaleString(isTr ? 'tr-TR' : 'en-US')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {showKey && (
        <Modal
          size={440}
          onClose={() => setShowKey(false)}
          title={isTr ? 'Yeni API anahtarı oluştur' : 'Create an API key'}
          description={
            isTr
              ? 'Anahtar yalnız yorumları okuyabilir; hiçbir şeyi değiştiremez. Oluşturulunca bir kez gösterilir, hemen kopyala.'
              : 'The key can only read reviews; it cannot change anything. It is shown once after you create it, so copy it right away.'
          }
          footer={
            <>
              <button
                type="button"
                onClick={() => setShowKey(false)}
                className="bz-btn"
              >
                {isTr ? 'Vazgeç' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={onCreate}
                disabled={creatingKey || !newKeyName.trim()}
                className="bz-btn-primary"
              >
                {creatingKey ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                {creatingKey
                  ? isTr
                    ? 'Oluşturuluyor…'
                    : 'Creating…'
                  : isTr
                    ? 'Anahtarı oluştur'
                    : 'Create key'}
              </button>
            </>
          }
        >
          <label className="block">
            <span className="mb-2 block text-[14px] font-medium leading-[1.3] text-pn-ink">
              {isTr ? 'Anahtarın adı' : 'Key name'}
              <span className="ml-1 text-[#E5484D]" aria-hidden="true">*</span>
            </span>
            <span className="mb-2 block text-[13px] leading-[1.45] text-[#737373]">
              {isTr
                ? 'Nerede kullanacağını yaz; listede bu adla görünür.'
                : 'Say where you will use it; the list shows this name.'}
            </span>
            <input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder={isTr ? 'örn. Raporlama aracı' : 'e.g. Reporting tool'}
              aria-required="true"
              className="bz-input w-full"
            />
          </label>
        </Modal>
      )}
    </div>
  );
}
