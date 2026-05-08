'use client';

import { useEffect, useState } from 'react';
import { Bell, Loader2, Mail } from 'lucide-react';
import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';
import SuperadminBlock from '@/components/admin/SuperadminBlock';
import { AlertBanner, PageHeader, APSwitch } from '@/components/ui';

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
  const [pendingKey, setPendingKey] = useState<keyof Prefs | null>(null);
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

  const save = async (next: Prefs, previous: Prefs, key: keyof Prefs) => {
    setPendingKey(key);
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
        setPrefs(previous);
        const body = await res.json().catch(() => ({}));
        flash(isTr ? `Hata: ${body.error ?? res.status}` : `Error: ${body.error ?? res.status}`);
      }
    } catch {
      setPrefs(previous);
      flash(isTr ? 'Ağ hatası' : 'Network error');
    }
    setPendingKey(null);
  };

  const toggle = (key: keyof Prefs) => {
    if (pendingKey) return;
    const previous = prefs;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    save(next, previous, key);
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
        <section className="space-y-3">
          {rows.map((row) => {
            const Icon = row.icon;
            const on = Boolean(prefs[row.key]);
            const isPending = pendingKey === row.key;
            return (
              <div
                key={row.key}
                className="rounded-[24px] border border-[#EDEDED] bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#D4D4D4] sm:p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F5F5F5] text-[#0A0A0A] ring-1 ring-black/5">
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[14px] font-semibold text-[#0A0A0A]">{row.label[isTr ? 'tr' : 'en']}</p>
                        <span
                          role="status"
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                            on ? 'bg-[#EAF9B8] text-[#0A0A0A]' : 'bg-[#F5F5F5] text-[#737373]'
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`inline-block h-1.5 w-1.5 rounded-full ${on ? 'bg-[#A8D62E]' : 'bg-[#A3A3A3]'}`}
                          />
                          {on ? (isTr ? 'Aktif' : 'Active') : (isTr ? 'Pasif' : 'Off')}
                        </span>
                      </div>
                      <p className="mt-1 text-[12.5px] leading-[1.55] text-[#525252]">{row.desc[isTr ? 'tr' : 'en']}</p>
                    </div>
                  </div>
                  <APSwitch
                    checked={on}
                    onChange={() => toggle(row.key)}
                    loading={isPending}
                    disabled={Boolean(pendingKey && !isPending)}
                    ariaLabel={row.label[isTr ? 'tr' : 'en']}
                    className="self-start sm:self-center"
                  />
                </div>
              </div>
            );
          })}
        </section>
      )}
      {notice?.toLowerCase().includes('forbidden') ? (
        <AlertBanner kind="warn">
          {isTr
            ? 'Bu ekran workspace bildirim tercihlerini kullanır. Superadmin hesabının kişisel workspace’i yoksa API doğal olarak 403 döner.'
            : 'This screen uses workspace notification preferences. A superadmin without a personal workspace will naturally receive a 403 from the API.'}
        </AlertBanner>
      ) : null}
    </div>
  );
}
