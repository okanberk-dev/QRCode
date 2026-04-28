'use client';

import { useEffect, useState } from 'react';
import { Bell, Check, Loader2, Mail, MessageSquare, Webhook } from 'lucide-react';
import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';
import SuperadminBlock from '@/components/admin/SuperadminBlock';
import { PageHeader } from '@/components/ui';

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

export default function AdminNotificationsPage() {
  return (
    <SuperadminBlock>
      <AdminNotificationsBody />
    </SuperadminBlock>
  );
}

function AdminNotificationsBody() {
  const { locale } = useAdminTranslation();
  const isTr = locale === 'tr';
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) setPrefs((await res.json()) as Prefs);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, []);

  const flash = (m: string) => {
    setNotice(m);
    setTimeout(() => setNotice(null), 2500);
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
        const saved = await res.json();
        setPrefs({
          lowRatingEmail: Boolean(saved.lowRatingEmail),
          dailyDigestEmail: Boolean(saved.dailyDigestEmail),
          weeklyReport: Boolean(saved.weeklyReport),
          slackWebhook: saved.slackWebhook ?? null,
        });
        flash(isTr ? 'Kaydedildi' : 'Saved');
      } else {
        const body = await res.json().catch(() => ({}));
        flash(isTr ? `Hata: ${body.error ?? res.status}` : `Error: ${body.error ?? res.status}`);
      }
    } catch {
      flash(isTr ? 'Ağ hatası' : 'Network error');
    }
    setSaving(false);
  };

  const toggle = (key: keyof Prefs) => {
    if (typeof prefs[key] !== 'boolean') return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    save(next);
  };

  const rows: { key: keyof Prefs; label: { tr: string; en: string }; desc: { tr: string; en: string }; icon: React.ComponentType<{ size?: number }> }[] = [
    {
      key: 'lowRatingEmail',
      label: { tr: 'Düşük puan uyarısı', en: 'Low-rating alert' },
      desc: { tr: '1-2 yıldız geldiğinde e-posta ile anında bildir.', en: 'Email me instantly when a 1-2 star review arrives.' },
      icon: Mail,
    },
    {
      key: 'dailyDigestEmail',
      label: { tr: 'Günlük özet', en: 'Daily digest' },
      desc: { tr: 'Her sabah 08:00’de son 24 saatin özeti.', en: 'A morning digest of the last 24 hours.' },
      icon: MessageSquare,
    },
    {
      key: 'weeklyReport',
      label: { tr: 'Haftalık rapor', en: 'Weekly report' },
      desc: { tr: 'Pazartesi e-postası: puan trendi + öne çıkan yorumlar.', en: 'Monday email with rating trend + top reviews.' },
      icon: Bell,
    },
  ];

  return (
    <div className="mx-auto max-w-[1100px] px-4 sm:px-7 py-6 lg:py-8 space-y-4">
      <PageHeader
        eyebrow={isTr ? 'BİLDİRİMLER' : 'NOTIFICATIONS'}
        title={isTr ? 'Bildirim tercihleri' : 'Notification preferences'}
        description={
          isTr
            ? 'E-posta ve webhook kanallarına hangi olayların gönderileceğini buradan ayarla.'
            : 'Configure which events get sent to email and webhook channels.'
        }
        actions={
          notice ? (
            <span className="pulse-eyebrow rounded-full bg-[#EAF9B8] px-3 py-1.5 text-[#0A0A0A]">
              {notice}
            </span>
          ) : null
        }
      />

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-[#EDEDED] bg-white p-20 text-[#737373]">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : (
        <>
          <section className="divide-y divide-[#EDEDED] overflow-hidden rounded-2xl border border-[#EDEDED] bg-white">
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
                      <p className="text-[14px] font-semibold text-[#0A0A0A]">{row.label[isTr ? 'tr' : 'en']}</p>
                      <p className="mt-1 text-[12px] text-[#525252]">{row.desc[isTr ? 'tr' : 'en']}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggle(row.key)}
                    disabled={saving}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                      on ? 'bg-[#C6F24E]' : 'bg-[#EDEDED]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                        on ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </section>

          <section className="rounded-2xl border border-[#EDEDED] bg-white p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-[#0A0A0A]">
                <Webhook size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-[#0A0A0A]">{isTr ? 'Slack Webhook' : 'Slack webhook'}</p>
                <p className="mt-1 text-[12px] text-[#525252]">
                  {isTr
                    ? 'Düşük puan geldiğinde Slack kanalına gönder. Webhook URL’ini yapıştır.'
                    : 'Post low-rating alerts to a Slack channel. Paste the webhook URL.'}
                </p>
                <div className="mt-3 flex gap-2">
                  <input
                    type="url"
                    placeholder="https://hooks.slack.com/services/..."
                    value={prefs.slackWebhook || ''}
                    onChange={(e) => setPrefs({ ...prefs, slackWebhook: e.target.value })}
                    onBlur={() => save(prefs)}
                    className="flex-1 rounded-lg border border-[#EDEDED] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#0A0A0A]"
                  />
                  <button
                    onClick={() => save(prefs)}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A0A0A] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#1A1A1A]"
                  >
                    <Check size={12} /> {isTr ? 'Kaydet' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
