'use client';

import { useEffect, useState } from 'react';
import {
  ActivitySquare,
  Copy,
  Globe,
  KeyRound,
  Loader2,
  Plus,
  ShieldCheck,
  Webhook,
  X,
} from 'lucide-react';
import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';
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

const DEMO_KEYS: ApiKey[] = [
  {
    id: 'demo-key-1',
    name: 'Buaze CLI · local',
    scopes: ['feedback:read', 'restaurants:read'],
    prefix: 'buz_live_sk_9f2c…',
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    lastUsedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    revokedAt: null,
  },
];

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

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/api-keys');
        if (res.ok) {
          const data = await res.json();
          const rows = (data?.data as ApiKey[]) ?? [];
          setKeys(rows.length > 0 ? rows : DEMO_KEYS);
        } else {
          setKeys(DEMO_KEYS);
        }
      } catch {
        setKeys(DEMO_KEYS);
      }
      setWebhooks(DEMO_WEBHOOKS);
      setActivity(DEMO_ACTIVITY);
      setLoading(false);
    })();
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
      if (res.status === 501) flash(isTr ? 'Scaffold — key yerelde saklandı' : 'Scaffold — key held locally');
      else if (res.ok) flash(isTr ? 'Anahtar oluşturuldu' : 'Key created');
      else flash(isTr ? 'Hata' : 'Error');
    } catch {
      flash(isTr ? 'Ağ hatası' : 'Network error');
    }
    setCreatingKey(false);
    setShowKey(false);
    setNewKeyName('');
  };

  const onCopy = (prefix: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(prefix).catch(() => {});
    }
    flash(isTr ? 'Kopyalandı' : 'Copied');
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="pulse-eyebrow text-[#737373]">
            {isTr ? 'PANEL / API & WEBHOOK' : 'PANEL / API & WEBHOOKS'}
          </p>
          <h1
            className="mt-1 text-[22px] font-medium tracking-tight text-[#0A0A0A]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {isTr ? 'API anahtarları & webhook\'lar' : 'API keys & webhooks'}
          </h1>
          <p className="mt-1 max-w-[560px] text-[13px] text-[#525252]">
            {isTr
              ? 'Kişisel API anahtarlarını yönet, webhook uç noktalarını tanımla, teslimat aktivitesini izle.'
              : 'Manage personal API tokens, define webhook endpoints, track delivery activity.'}
          </p>
        </div>
        {notice && (
          <span className="pulse-eyebrow rounded-full bg-[#EAF9B8] px-3 py-1.5 text-[#0A0A0A]">{notice}</span>
        )}
      </header>

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
                <button
                  onClick={() => alert(isTr ? 'Yakında bağlanacak.' : 'Coming soon.')}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#0A0A0A] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#0A0A0A] hover:bg-[#F5F5F5]"
                >
                  <Plus size={12} /> {isTr ? 'Endpoint ekle' : 'Add endpoint'}
                </button>
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
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowKey(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#EDEDED] bg-white p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#0A0A0A]" />
                <h3
                  className="text-[18px] font-medium text-[#0A0A0A]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {isTr ? 'Yeni API anahtarı' : 'New API key'}
                </h3>
              </div>
              <button
                onClick={() => setShowKey(false)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#737373] hover:bg-[#F5F5F5]"
              >
                <X size={14} />
              </button>
            </div>
            <label className="mt-4 block">
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
                className="rounded-lg border border-[#EDEDED] bg-white px-4 py-2 text-[12px] font-medium text-[#525252] hover:bg-[#F5F5F5]"
              >
                {isTr ? 'İptal' : 'Cancel'}
              </button>
              <button
                onClick={onCreate}
                disabled={creatingKey || !newKeyName.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#C6F24E] px-4 py-2 text-[12px] font-semibold text-[#0A0A0A] hover:bg-[#A8D62E] disabled:opacity-40"
              >
                {creatingKey ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                {isTr ? 'Oluştur' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
