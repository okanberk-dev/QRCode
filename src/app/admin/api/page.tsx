'use client';

import { useEffect, useState } from 'react';
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
import SuperadminBlock from '@/components/admin/SuperadminBlock';

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

const DEMO_WEBHOOKS: WebhookRow[] = [
  {
    id: 'demo-wh-1',
    url: 'https://hooks.slack.com/services/…/buaze',
    events: ['feedback.created', 'feedback.low_rating'],
    status: 'active',
    lastDelivery: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
];

const DEMO_ACTIVITY: ActivityRow[] = [
  {
    id: 'act-1',
    label: 'feedback.low_rating → Slack (#itibar)',
    at: new Date(Date.now() - 3600000 * 2).toISOString(),
    status: 'ok',
  },
  {
    id: 'act-2',
    label: 'API key "Buaze CLI · local" used',
    at: new Date(Date.now() - 3600000 * 4).toISOString(),
    status: 'ok',
  },
  {
    id: 'act-3',
    label: 'feedback.created → https://retool…/buaze',
    at: new Date(Date.now() - 86400000).toISOString(),
    status: 'fail',
  },
];

export default function AdminApiPage() {
  return (
    <SuperadminBlock>
      <AdminApiBody />
    </SuperadminBlock>
  );
}

function AdminApiBody() {
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
      setWebhooks(DEMO_WEBHOOKS);
      setActivity(DEMO_ACTIVITY);
      setLoading(false);
    })();
    // Mount-only demo data load. `isTr` only affects render output; locale
    // change via parent layout already triggers a full remount.
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
    <div className="mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8 space-y-5">
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
            <span className="pulse-eyebrow rounded-full bg-[#EAF9B8] px-3 py-1.5 text-[#0A0A0A]">
              {notice}
            </span>
          ) : null
        }
      />

      {newToken && (
        <section className="rounded-2xl border border-[#C6F24E] bg-[#F7FFE4] p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="pulse-eyebrow text-[#0A0A0A]">{isTr ? 'YENİ ANAHTAR' : 'NEW TOKEN'}</p>
              <p className="mt-1 text-[12px] text-[#525252]">
                {isTr ? 'Bu token sadece bir kez gösterilir.' : 'This token is shown only once.'}
              </p>
            </div>
            <button
              onClick={() => onCopy(newToken)}
              className="inline-flex min-w-0 items-center gap-1.5 rounded-lg border border-[#0A0A0A] bg-white px-3 py-2 font-mono text-[11px] text-[#0A0A0A] hover:bg-[#FAFAFA]"
            >
              <Copy size={11} />
              <span className="truncate">{newToken}</span>
            </button>
          </div>
        </section>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-[#EDEDED] bg-white p-20 text-[#737373]">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
          <div className="space-y-4">
            {/* API Keys */}
            <section className="rounded-2xl border border-[#EDEDED] bg-white">
              <div className="flex items-center justify-between gap-4 border-b border-[#EDEDED] p-5">
                <div className="flex items-center gap-2">
                  <KeyRound size={14} className="text-[#0A0A0A]" />
                  <p className="pulse-eyebrow text-[#737373]">{isTr ? 'API ANAHTARLARI' : 'API KEYS'}</p>
                </div>
                <button
                  onClick={() => setShowKey(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#C6F24E] px-3 py-1.5 text-[12px] font-semibold text-[#0A0A0A] hover:bg-[#A8D62E]"
                >
                  <Plus size={12} /> {isTr ? 'Yeni anahtar' : 'New key'}
                </button>
              </div>
              <div className="divide-y divide-[#EDEDED]">
                {keys.length === 0 ? (
                  <p className="p-8 text-center text-[13px] text-[#737373]">
                    {isTr ? 'Henüz API anahtarı yok.' : 'No API keys yet.'}
                  </p>
                ) : (
                  keys.map((k) => (
                    <div key={k.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-[#0A0A0A]">{k.name}</p>
                        <p className="pulse-eyebrow mt-0.5 text-[#737373]">
                          {k.scopes.join(' · ')}
                        </p>
                      </div>
                      {k.prefix && (
                        <button
                          onClick={() => onCopy(k.prefix!)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#EDEDED] bg-[#FAFAFA] px-2.5 py-1.5 font-mono text-[11px] text-[#525252] hover:border-[#0A0A0A]"
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
                      <p className="pulse-eyebrow w-full text-[#A3A3A3] sm:w-auto">
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
            <section className="rounded-2xl border border-[#EDEDED] bg-white">
              <div className="flex items-center justify-between gap-4 border-b border-[#EDEDED] p-5">
                <div className="flex items-center gap-2">
                  <Webhook size={14} className="text-[#0A0A0A]" />
                  <p className="pulse-eyebrow text-[#737373]">WEBHOOKS</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge kind="ghost">{isTr ? 'Yakında' : 'Coming soon'}</Badge>
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    className="bz-btn bz-btn-sm cursor-not-allowed opacity-50"
                  >
                    <Plus size={12} /> {isTr ? 'Endpoint ekle' : 'Add endpoint'}
                  </button>
                </div>
              </div>
              <div className="divide-y divide-[#EDEDED]">
                {webhooks.map((w) => (
                  <div key={w.id} className="grid gap-3 p-5 md:grid-cols-[1fr_auto]">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[13px] text-[#0A0A0A]">{w.url}</p>
                      <p className="pulse-eyebrow mt-1 text-[#737373]">{w.events.join(' · ')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`pulse-eyebrow rounded px-2 py-1 ${
                          w.status === 'active'
                            ? 'bg-[#EAF9B8] text-[#0A0A0A]'
                            : w.status === 'paused'
                              ? 'bg-[#F5F5F5] text-[#737373]'
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
                        <span className="pulse-eyebrow text-[#A3A3A3]">
                          {new Date(w.lastDelivery).toLocaleDateString(isTr ? 'tr-TR' : 'en-US')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* OAuth providers hint card */}
            <section className="rounded-2xl border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#0A0A0A] border border-[#EDEDED]">
                  <Globe size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-[#0A0A0A]">
                    {isTr ? 'OAuth sağlayıcılar' : 'OAuth providers'}
                  </p>
                  <p className="mt-1 text-[12px] text-[#525252]">
                    {isTr
                      ? 'Google Business Profile ve Slack OAuth bağlantıları Ayarlar → Entegrasyonlar sekmesinden yönetilecek. Backend gelince bu kart kaybolur.'
                      : 'Google Business Profile and Slack OAuth connections will live in Settings → Integrations once the backend ships.'}
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Activity column */}
          <section className="rounded-2xl border border-[#EDEDED] bg-white">
            <div className="flex items-center gap-2 border-b border-[#EDEDED] p-5">
              <ActivitySquare size={14} className="text-[#0A0A0A]" />
              <p className="pulse-eyebrow text-[#737373]">{isTr ? 'SON OLAYLAR' : 'RECENT ACTIVITY'}</p>
            </div>
            <ul className="divide-y divide-[#EDEDED]">
              {activity.map((a) => (
                <li key={a.id} className="flex items-start gap-3 p-4">
                  <span
                    className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${
                      a.status === 'ok'
                        ? 'bg-[#16A34A]'
                        : a.status === 'fail'
                          ? 'bg-red-500'
                          : 'bg-[#C6F24E]'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-[#0A0A0A]">{a.label}</p>
                    <p className="pulse-eyebrow mt-0.5 text-[#737373]">
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
          title={
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#0A0A0A]" />
              <span>{isTr ? 'Yeni API anahtarı' : 'New API key'}</span>
            </div>
          }
        >
          <label className="block">
            <span className="pulse-eyebrow text-[#737373]">{isTr ? 'AÇIKLAMA' : 'LABEL'}</span>
            <input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder={isTr ? 'örn. Retool prod dashboard' : 'e.g. Retool prod dashboard'}
              className="mt-1 w-full rounded-lg border border-[#EDEDED] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#0A0A0A]"
            />
          </label>
          <p className="mt-3 text-[11px] text-[#737373]">
            {isTr
              ? 'Varsayılan scope\'lar: feedback:read. Scope yönetimi backend bağlandığında eklenir.'
              : "Default scope: feedback:read. Granular scope management ships with the backend."}
          </p>
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              onClick={() => setShowKey(false)}
              className="bz-btn"
            >
              {isTr ? 'İptal' : 'Cancel'}
            </button>
            <button
              onClick={onCreate}
              disabled={creatingKey || !newKeyName.trim()}
              className="bz-btn-lime disabled:opacity-40"
            >
              {creatingKey ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
              {isTr ? 'Oluştur' : 'Create'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
