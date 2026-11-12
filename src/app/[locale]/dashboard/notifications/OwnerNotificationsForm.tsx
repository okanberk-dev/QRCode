'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Locale } from '@/lib/translations';
import { AlertBanner, APSwitch } from '@/components/ui';
import { SkBox } from '@/components/ui/skeletons/PageSkeleton';

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
  // Real prefs never arrived (4xx/5xx/network). Toggles stay disabled: the
  // PUT sends all three fields, so toggling on top of DEFAULT_PREFS would
  // overwrite the owner's saved choices with defaults.
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/notifications');
        if (cancelled) return;
        if (!res.ok) {
          setLoadFailed(true);
          return;
        }
        const json = (await res.json()) as ApiPrefs;
        if (cancelled) return;
        setPrefs({
          lowRatingEmail: json.lowRatingEmail ?? DEFAULT_PREFS.lowRatingEmail,
          weeklyReport: json.weeklyReport ?? DEFAULT_PREFS.weeklyReport,
          // API uses `disableTrialReminders` (DB schema); UI inverts to
          // `receiveTrialReminders` so every toggle is positive-semantic.
          receiveTrialReminders: !(json.disableTrialReminders ?? false),
        });
        setLoadFailed(false);
      } catch {
        if (!cancelled) setLoadFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  const flash = (kind: 'success' | 'danger', text: string) => {
    setNotice({ kind, text });
    if (kind === 'success') setTimeout(() => setNotice(null), 2200);
  };

  const toggle = async (key: keyof Prefs) => {
    if (pendingKey || loadFailed) return; // tek istek aynı anda; veri yoksa yazma
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
        flash(
          'danger',
          body.error && !/^[a-z0-9_]+$/.test(body.error)
            ? body.error
            : isTr
              ? 'Tercih güncellenemedi. Lütfen tekrar deneyin.'
              : 'Could not update the preference. Please try again.',
        );
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
  }> = [
    {
      key: 'lowRatingEmail',
      label: { tr: 'Düşük puan uyarısı', en: 'Low-rating alert' },
      desc: {
        tr: '1-3 yıldız bir yorum geldiğinde sana ve bildirim e-posta adresine anında uyarı gönderilir. İtibar yönetimi için kritik.',
        en: 'Sends an instant email to you and your notification address whenever a 1-3 star review arrives. Critical for reputation work.',
      },
    },
    {
      key: 'weeklyReport',
      label: { tr: 'Haftalık rapor', en: 'Weekly report' },
      desc: {
        // Cron `0 9 * * 1` UTC → Monday ~12:00 Istanbul, not "morning".
        tr: 'Her pazartesi öğle saatlerinde (Türkiye saati) haftalık puan trendi, en çok tıklanan platform ve öne çıkan yorumlarla özet e-posta.',
        en: 'Every Monday around noon (Istanbul time): an email with your weekly rating trend, top platform and standout reviews.',
      },
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
        tr: 'Deneme bitimine 3 gün ve 1 gün kala bilgilendirme e-postası. Kapatırsan hiçbir hatırlatma gönderilmez.',
        en: 'Heads-up email at 3 days and 1 day before your trial ends. Switch off to silence both reminders.',
      },
    },
  ];

  if (loading) {
    return (
      <div className="bz-card divide-y divide-[#EDEDED] p-0" aria-busy="true">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-4 p-4 sm:p-5">
            <div className="min-w-0 flex-1 space-y-2">
              <SkBox className="h-4 w-40" />
              <SkBox className="h-3 w-full max-w-[420px]" />
            </div>
            <SkBox className="h-6 w-11 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {loadFailed && (
        <AlertBanner kind="danger">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {isTr
              ? 'Bildirim tercihleri yüklenemedi; kayıtlı ayarların üzerine yazılmaması için değişiklik kapalı.'
              : "Couldn't load your notification preferences; changes are disabled so your saved settings aren't overwritten."}
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setReloadTick((n) => n + 1);
              }}
              className="font-semibold underline underline-offset-2"
            >
              {isTr ? 'Tekrar dene' : 'Retry'}
            </button>
          </span>
        </AlertBanner>
      )}

      {notice && (
        <AlertBanner
          kind={notice.kind === 'success' ? 'success' : 'danger'}
          onDismiss={() => setNotice(null)}
        >
          {notice.text}
        </AlertBanner>
      )}

      {/* One card, one row per email. The switch is the state — the old
          "Aktif / Pasif" pill next to each label repeated it. */}
      <div className="bz-card divide-y divide-[#EDEDED] p-0">
        {rows.map((row) => {
          // Unknown state after a failed load — render neutral, not "on".
          const on = !loadFailed && Boolean(prefs[row.key]);
          const isPending = pendingKey === row.key;
          const label = row.label[isTr ? 'tr' : 'en'];
          return (
            <div
              key={row.key}
              className="flex items-start justify-between gap-4 p-4 sm:items-center sm:p-5"
            >
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-[#0A0A0A]">{label}</p>
                <p className="mt-1 text-[12.5px] leading-[1.55] text-[#525252]">
                  {row.desc[isTr ? 'tr' : 'en']}
                </p>
              </div>
              <APSwitch
                checked={on}
                onChange={() => toggle(row.key)}
                loading={isPending}
                disabled={loadFailed || Boolean(pendingKey && !isPending)}
                ariaLabel={label}
                className="shrink-0"
              />
            </div>
          );
        })}
      </div>

      <p className="text-[11.5px] leading-[1.55] text-[#737373]">
        {isTr
          ? 'Bildirim e-posta adresini değiştirmek için '
          : 'To change the recipient email, open '}
        <Link
          href={`/${locale}/dashboard/restaurants`}
          className="font-medium text-[#0A0A0A] underline underline-offset-2"
        >
          {isTr ? 'İşletmeler' : 'Locations'}
        </Link>
        {isTr
          ? ' sayfasından ilgili işletmenin Ayarlar → Genel sekmesini aç.'
          : ', then the business → Settings → General.'}
      </p>
    </div>
  );
}
