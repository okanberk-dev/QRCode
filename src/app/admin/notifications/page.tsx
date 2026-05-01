'use client';

import { useEffect, useState } from 'react';
import { Bell, Loader2, Mail } from 'lucide-react';
import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';
import SuperadminBlock from '@/components/admin/SuperadminBlock';
import { PageHeader } from '@/components/ui';

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
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    save(next);
  };

  const rows: { key: keyof Prefs; label: { tr: string; en: string }; desc: { tr: string; en: string }; icon: React.ComponentType<{ size?: number }> }[] = [
    {
      key: 'lowRatingEmail',
      label: { tr: 'Düşük puan uyarısı', en: 'Low-rating alert' },
      desc: { tr: '1-3 yıldız geldiğinde e-posta ile anında bildir.', en: 'Email me instantly when a 1-3 star review arrives.' },
      icon: Mail,
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
        eyebrow={isTr ? 'BİLDİRİM AYARLARI' : 'NOTIFICATION SETTINGS'}
        title={isTr ? 'Bildirim tercihleri' : 'Notification preferences'}
        description={
          isTr
            ? 'Hangi olaylar için e-posta bildirimi alacağını buradan ayarla. Anlık panel uyarıları her zaman zil simgesinde görünür.'
            : 'Choose which events trigger email alerts. In-panel toasts always appear in the bell icon.'
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
      )}
    </div>
  );
}
