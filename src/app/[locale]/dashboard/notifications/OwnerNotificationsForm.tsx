'use client';

import { useEffect, useState } from 'react';
import { Bell, Loader2, Mail } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import { AlertBanner } from '@/components/ui';

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

/**
 * Owner notification preferences — workspace-level (User scope).
 *
 * Mounted inside `<SettingsSection id="notifications">` of /dashboard/account.
 * SettingsSection zaten kendi PageHeader'ı taşıyor, burada eklemiyoruz
 * (önceki implementasyon duplicate header üretiyordu, design bug).
 *
 * Optimistic toggle: state önce güncellenir, save fail'de eski değere
 * revert edilir + AlertBanner. Eski versiyonda revert yoktu — UI
 * server'la sync dışında kalıyordu (CLAUDE.md §34.x toggle sync bug).
 */
export default function OwnerNotificationsForm({ locale }: { locale: Locale }) {
  const isTr = locale === 'tr';
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [pendingKey, setPendingKey] = useState<keyof Prefs | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/notifications');
        if (!cancelled && res.ok) {
          const json = (await res.json()) as Prefs;
          setPrefs({
            lowRatingEmail: Boolean(json.lowRatingEmail),
            dailyDigestEmail: Boolean(json.dailyDigestEmail),
            weeklyReport: Boolean(json.weeklyReport),
          });
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
    if (kind === 'success') setTimeout(() => setNotice(null), 2200);
  };

  const toggle = async (key: keyof Prefs) => {
    if (pendingKey) return; // tek istek aynı anda
    const previous = prefs;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next); // optimistic
    setPendingKey(key);
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
        flash('success', isTr ? 'Tercih güncellendi' : 'Preference updated');
      } else {
        // Revert — optimistic UI ile server arasında drift'i kapat.
        setPrefs(previous);
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        flash('danger', isTr ? `Güncellenemedi: ${body.error ?? res.status}` : `Update failed: ${body.error ?? res.status}`);
      }
    } catch {
      setPrefs(previous);
      flash('danger', isTr ? 'Ağ hatası — değişiklik geri alındı' : 'Network error — change reverted');
    } finally {
      setPendingKey(null);
    }
  };

  const rows: Array<{
    key: keyof Prefs;
    label: { tr: string; en: string };
    desc: { tr: string; en: string };
    icon: React.ComponentType<{ size?: number }>;
    accent?: string;
  }> = [
    {
      key: 'lowRatingEmail',
      label: { tr: 'Düşük puan uyarısı', en: 'Low-rating alert' },
      desc: {
        tr: '1-3 yıldız bir yorum geldiğinde sana ve bildirim e-posta adresine anında uyarı gönderilir. İtibar yönetimi için kritik.',
        en: 'Sends an instant email to you and your notification address whenever a 1-3 star review arrives. Critical for reputation work.',
      },
      icon: Mail,
      accent: '#FCA5A5',
    },
    {
      key: 'weeklyReport',
      label: { tr: 'Haftalık rapor', en: 'Weekly report' },
      desc: {
        tr: 'Pazartesi sabahı haftalık puan trendi, en çok tıklanan platform ve öne çıkan yorumlarla özet e-posta.',
        en: 'Monday email with weekly rating trend, top-redirected platform, and standout reviews from the past week.',
      },
      icon: Bell,
      accent: '#C6F24E',
    },
  ];

  if (loading) {
    return (
      <div className="bz-card flex items-center justify-center gap-2 p-12 text-[13px] text-[#737373]">
        <Loader2 size={14} className="animate-spin" />
        {isTr ? 'Yükleniyor…' : 'Loading…'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notice && (
        <AlertBanner
          kind={notice.kind === 'success' ? 'success' : 'danger'}
          onDismiss={() => setNotice(null)}
        >
          {notice.text}
        </AlertBanner>
      )}

      <section className="bz-card divide-y divide-[#EDEDED] overflow-hidden p-0">
        {rows.map((row) => {
          const Icon = row.icon;
          const on = Boolean(prefs[row.key]);
          const isPending = pendingKey === row.key;
          return (
            <div
              key={row.key}
              className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 p-4 sm:p-5 transition-colors hover:bg-[#FAFAFA]/40"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <span
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#0A0A0A]"
                  style={{ background: row.accent ? `${row.accent}33` : '#F5F5F5' }}
                >
                  <Icon size={14} />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[14px] font-semibold text-[#0A0A0A]">
                      {row.label[isTr ? 'tr' : 'en']}
                    </p>
                    <span
                      className={`pulse-eyebrow rounded-full px-2 py-0.5 ${
                        on
                          ? 'bg-[#EAF9B8] text-[#0A0A0A]'
                          : 'bg-[#F5F5F5] text-[#737373]'
                      }`}
                      aria-hidden="true"
                    >
                      {on ? (isTr ? 'AKTİF' : 'ACTIVE') : (isTr ? 'PASİF' : 'OFF')}
                    </span>
                  </div>
                  <p className="mt-1 text-[12.5px] leading-[1.55] text-[#525252]">
                    {row.desc[isTr ? 'tr' : 'en']}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggle(row.key)}
                disabled={isPending}
                role="switch"
                aria-checked={on}
                aria-label={row.label[isTr ? 'tr' : 'en']}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 disabled:cursor-wait sm:self-center ${
                  on ? 'bg-[#C6F24E]' : 'bg-[#EDEDED]'
                }`}
              >
                <span
                  aria-hidden
                  className={`absolute top-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform ${
                    on ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                >
                  {isPending && <Loader2 size={10} className="animate-spin text-[#737373]" />}
                </span>
              </button>
            </div>
          );
        })}
      </section>

      <p className="text-[11.5px] leading-[1.55] text-[#737373]">
        {isTr
          ? 'Bildirim e-posta adresini değiştirmek için ilgili işletmenin Ayarlar → Genel sekmesine git.'
          : 'To change the recipient email, open the relevant business → Settings → General.'}
      </p>
    </div>
  );
}
