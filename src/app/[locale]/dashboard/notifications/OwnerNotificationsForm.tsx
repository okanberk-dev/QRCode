'use client';

import { useEffect, useState } from 'react';
import { Bell, Check, Loader2, Mail, MessageSquare, Webhook } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import { AlertBanner, PageHeader } from '@/components/ui';

interface Prefs {
  lowRatingEmail: boolean;
  dailyDigestEmail: boolean;
  weeklyReport: boolean;
  slackWebhook?: string | null;
}

const DEFAULT_PREFS: Prefs = {
  lowRatingEmail: true,
  dailyDigestEmail: false,
  weeklyReport: true,
  slackWebhook: null,
};

type Notice = { kind: 'success' | 'danger'; text: string } | null;

export default function OwnerNotificationsForm({ locale }: { locale: Locale }) {
  const isTr = locale === 'tr';
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [webhookDirty, setWebhookDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/notifications');
        if (!cancelled && res.ok) {
          const json = (await res.json()) as Prefs;
          setPrefs(json);
        }
      } catch {
        if (!cancelled) {
          setNotice({
            kind: 'danger',
            text: isTr ? 'Bildirim tercihleri yüklenemedi.' : 'Could not load notification preferences.',
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isTr]);

  const flash = (kind: 'success' | 'danger', text: string) => {
    setNotice({ kind, text });
    if (kind === 'success') setTimeout(() => setNotice(null), 2500);
  };

  const save = async (next: Prefs) => {
    setSaving(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(next),
      });
      if (res.ok) {
        const saved = (await res.json()) as Prefs;
        setPrefs({
          lowRatingEmail: Boolean(saved.lowRatingEmail),
          dailyDigestEmail: Boolean(saved.dailyDigestEmail),
          weeklyReport: Boolean(saved.weeklyReport),
          slackWebhook: saved.slackWebhook ?? null,
        });
        setWebhookDirty(false);
        flash('success', isTr ? 'Kaydedildi' : 'Saved');
      } else {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (body.error === 'invalid_webhook') {
          flash(
            'danger',
            isTr
              ? 'Slack webhook geçersiz. https:// ile başlamalı.'
              : 'Invalid Slack webhook. Must start with https://.',
          );
        } else {
          flash('danger', isTr ? `Hata: ${body.error ?? res.status}` : `Error: ${body.error ?? res.status}`);
        }
      }
    } catch {
      flash('danger', isTr ? 'Ağ hatası' : 'Network error');
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key: keyof Prefs) => {
    if (typeof prefs[key] !== 'boolean') return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    save(next);
  };

  const rows: Array<{
    key: keyof Prefs;
    label: { tr: string; en: string };
    desc: { tr: string; en: string };
    icon: React.ComponentType<{ size?: number }>;
  }> = [
    {
      key: 'lowRatingEmail',
      label: { tr: 'Düşük puan uyarısı', en: 'Low-rating alert' },
      desc: {
        tr: '1-2 yıldız bir yorum geldiğinde e-posta ile anında bildir.',
        en: 'Email me instantly when a 1-2 star review arrives.',
      },
      icon: Mail,
    },
    {
      key: 'dailyDigestEmail',
      label: { tr: 'Günlük özet', en: 'Daily digest' },
      desc: {
        tr: 'Her sabah 08:00’de son 24 saatin özetini e-posta ile gönder.',
        en: 'A morning digest of the last 24 hours, every day at 08:00.',
      },
      icon: MessageSquare,
    },
    {
      key: 'weeklyReport',
      label: { tr: 'Haftalık rapor', en: 'Weekly report' },
      desc: {
        tr: 'Pazartesi sabahı puan trendi ve öne çıkan yorumlarla haftalık rapor.',
        en: 'Monday email with rating trend and top reviews from the past week.',
      },
      icon: Bell,
    },
  ];

  return (
    <div className="mx-auto max-w-[980px] px-4 sm:px-7 py-6 lg:py-8 space-y-4">
      <PageHeader
        eyebrow={isTr ? 'BİLDİRİM AYARLARI' : 'NOTIFICATION SETTINGS'}
        title={isTr ? 'Bildirim tercihleri' : 'Notification preferences'}
        description={
          isTr
            ? 'Hangi olaylar için e-posta veya Slack bildirimi alacağını buradan ayarla. Anlık panel uyarıları her zaman zil simgesinde görünür.'
            : 'Choose which events trigger email or Slack alerts. In-panel toasts always appear in the bell icon.'
        }
      />

      {notice && (
        <AlertBanner
          kind={notice.kind === 'success' ? 'success' : 'danger'}
          onDismiss={() => setNotice(null)}
        >
          {notice.text}
        </AlertBanner>
      )}

      {loading ? (
        <div className="bz-card flex items-center justify-center p-20 text-[#737373]">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : (
        <>
          <section className="bz-card divide-y divide-[#EDEDED] overflow-hidden p-0">
            {rows.map((row) => {
              const Icon = row.icon;
              const on = Boolean(prefs[row.key]);
              return (
                <div key={row.key} className="flex items-start justify-between gap-4 p-5">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-[#0A0A0A]">
                      <Icon size={14} />
                    </span>
                    <div>
                      <p className="text-[14px] font-semibold text-[#0A0A0A]">
                        {row.label[isTr ? 'tr' : 'en']}
                      </p>
                      <p className="mt-1 text-[12px] text-[#525252]">
                        {row.desc[isTr ? 'tr' : 'en']}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(row.key)}
                    disabled={saving}
                    role="switch"
                    aria-checked={on}
                    aria-label={row.label[isTr ? 'tr' : 'en']}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 disabled:opacity-60 ${
                      on ? 'bg-[#C6F24E]' : 'bg-[#EDEDED]'
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                        on ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </section>

          <section className="bz-card p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-[#0A0A0A]">
                <Webhook size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-[#0A0A0A]">
                  {isTr ? 'Slack webhook' : 'Slack webhook'}
                </p>
                <p className="mt-1 text-[12px] text-[#525252]">
                  {isTr
                    ? 'Düşük puan geldiğinde Slack kanalına anında mesaj at. Slack’ten oluşturduğun webhook URL’ini yapıştır.'
                    : 'Post low-rating alerts to a Slack channel. Paste the incoming webhook URL from Slack.'}
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="url"
                    placeholder="https://hooks.slack.com/services/..."
                    value={prefs.slackWebhook || ''}
                    onChange={(e) => {
                      setPrefs({ ...prefs, slackWebhook: e.target.value });
                      setWebhookDirty(true);
                    }}
                    className="bz-input flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => save(prefs)}
                    disabled={saving || !webhookDirty}
                    className="bz-btn-primary inline-flex items-center justify-center gap-1.5 px-4 py-2 text-[12px] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Check size={12} />
                    )}
                    {isTr ? 'Kaydet' : 'Save'}
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-[#A3A3A3]">
                  {isTr
                    ? 'İpucu: Slack’te Apps → Incoming Webhooks ile yeni bir webhook oluşturup buraya yapıştır.'
                    : 'Tip: Create an Incoming Webhook in Slack (Apps → Incoming Webhooks) and paste the URL here.'}
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
