'use client';

import { useEffect, useState } from 'react';
import { Bell, Loader2, Mail } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import { AlertBanner, PageHeader } from '@/components/ui';

interface Prefs {
  lowRatingEmail: boolean;
  dailyDigestEmail: boolean;
  weeklyReport: boolean;
}

const DEFAULT_PREFS: Prefs = {
  lowRatingEmail: true,
  dailyDigestEmail: false,
  weeklyReport: true,
};

type Notice = { kind: 'success' | 'danger'; text: string } | null;

export default function OwnerNotificationsForm({ locale }: { locale: Locale }) {
  const isTr = locale === 'tr';
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

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
        });
        flash('success', isTr ? 'Kaydedildi' : 'Saved');
      } else {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        flash('danger', isTr ? `Hata: ${body.error ?? res.status}` : `Error: ${body.error ?? res.status}`);
      }
    } catch {
      flash('danger', isTr ? 'Ağ hatası' : 'Network error');
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key: keyof Prefs) => {
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
        tr: '1-3 yıldız bir yorum geldiğinde e-posta ile anında bildir.',
        en: 'Email me instantly when a 1-3 star review arrives.',
      },
      icon: Mail,
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
            ? 'Hangi olaylar için e-posta bildirimi alacağını buradan ayarla. Anlık panel uyarıları her zaman zil simgesinde görünür.'
            : 'Choose which events trigger email alerts. In-panel toasts always appear in the bell icon.'
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
      )}
    </div>
  );
}
