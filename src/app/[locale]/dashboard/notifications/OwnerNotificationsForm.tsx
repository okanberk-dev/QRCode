'use client';

import { useEffect, useState } from 'react';
import { Bell, Loader2, Mail, Clock } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import { AlertBanner, APSwitch } from '@/components/ui';

// Wave A5/A7 (CLAUDE.md §38.A) — dailyDigestEmail removed (orphan toggle);
// receiveTrialReminders added. UI keeps every toggle in POSITIVE semantics
// ("ON = receive the mail") for cognitive uniformity, but the API still uses
// `disableTrialReminders` (mirrors the DB schema). The form translates at
// the API boundary: `disableTrialReminders = !receiveTrialReminders`.
interface Prefs {
  lowRatingEmail: boolean;
  weeklyReport: boolean;
  receiveTrialReminders: boolean;
}

const DEFAULT_PREFS: Prefs = {
  lowRatingEmail: true,
  weeklyReport: true,
  receiveTrialReminders: true,
};

interface ApiPrefs {
  lowRatingEmail?: boolean;
  weeklyReport?: boolean;
  disableTrialReminders?: boolean;
}

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
          const json = (await res.json()) as ApiPrefs;
          setPrefs({
            lowRatingEmail: json.lowRatingEmail ?? DEFAULT_PREFS.lowRatingEmail,
            weeklyReport: json.weeklyReport ?? DEFAULT_PREFS.weeklyReport,
            // API uses `disableTrialReminders` (DB schema); UI inverts to
            // `receiveTrialReminders` so every toggle is positive-semantic.
            receiveTrialReminders: !(json.disableTrialReminders ?? false),
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
      // Translate UI semantics → API semantics. `receiveTrialReminders=true`
      // means the owner WANTS the mail, so DB needs `disableTrialReminders=false`.
      const payload: ApiPrefs = {
        lowRatingEmail: next.lowRatingEmail,
        weeklyReport: next.weeklyReport,
        disableTrialReminders: !next.receiveTrialReminders,
      };
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const saved = (await res.json()) as ApiPrefs;
        setPrefs({
          lowRatingEmail: saved.lowRatingEmail ?? DEFAULT_PREFS.lowRatingEmail,
          weeklyReport: saved.weeklyReport ?? DEFAULT_PREFS.weeklyReport,
          receiveTrialReminders: !(saved.disableTrialReminders ?? false),
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
    {
      // Wave A5 — trial reminder opt-out. ON = receive (D-3 + D-1 reminders);
      // OFF = silence the trial-ending mails entirely. The toggle persists
      // beyond the trial period — once the owner upgrades the cron query
      // skips them anyway (`plan: 'trial'` filter), so the value just sits
      // dormant.
      key: 'receiveTrialReminders',
      label: { tr: 'Deneme süresi hatırlatmaları', en: 'Trial reminders' },
      desc: {
        tr: 'Deneme bitimine 3 gün ve 1 gün kala bilgilendirme e-postası. Sustur dersen hiçbir hatırlatma gönderilmez.',
        en: 'Heads-up email at 3 days and 1 day before your trial ends. Switch off to silence both reminders.',
      },
      icon: Clock,
      accent: '#FDE68A',
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
                  <span
                    className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-[#0A0A0A] ring-1 ring-black/5"
                    style={{ background: row.accent ? `${row.accent}33` : '#F5F5F5' }}
                  >
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[14px] font-semibold text-[#0A0A0A]">
                        {row.label[isTr ? 'tr' : 'en']}
                      </p>
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
                    <p className="mt-1 text-[12.5px] leading-[1.55] text-[#525252]">
                      {row.desc[isTr ? 'tr' : 'en']}
                    </p>
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

      <p className="text-[11.5px] leading-[1.55] text-[#737373]">
        {isTr
          ? 'Bildirim e-posta adresini değiştirmek için ilgili işletmenin Ayarlar → Genel sekmesine git.'
          : 'To change the recipient email, open the relevant business → Settings → General.'}
      </p>
    </div>
  );
}
