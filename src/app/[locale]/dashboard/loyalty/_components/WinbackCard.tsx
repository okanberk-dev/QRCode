'use client';

// Win-back e-mail settings (CLAUDE.md §61), Program tab of the home
// business. Off by default; turning it on asks once for the owner's
// confirmation that commercial messages are theirs to send.
import { useEffect, useState } from 'react';
import { Loader2, MailOpen } from 'lucide-react';
import { AlertBanner, APSwitch, Field, PulseSelect } from '@/components/ui';
import { LOYALTY_LIMITS } from '@/lib/loyalty';
import { loyaltyFetch, loyaltyMessage } from './loyalty-client';

interface Settings {
  enabled: boolean;
  days: number;
  message: string | null;
  confirmedAt: string | null;
}
interface Audience {
  reachable: number;
  due: number;
}

export default function WinbackCard({ locale, restaurantId, canManage }: { locale: 'tr' | 'en'; restaurantId: string; canManage: boolean }) {
  const tr = locale === 'tr';
  const api = `/api/restaurants/${restaurantId}/loyalty/winback`;
  const [saved, setSaved] = useState<Settings | null>(null);
  const [draft, setDraft] = useState<{ enabled: boolean; days: number; message: string }>({ enabled: false, days: 30, message: '' });
  const [confirm, setConfirm] = useState(false);
  const [audience, setAudience] = useState<Audience | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loyaltyFetch<{ settings: Settings; audience: Audience }>(api)
      .then((r) => {
        if (!alive) return;
        setSaved(r.settings);
        setAudience(r.audience);
        setDraft({ enabled: r.settings.enabled, days: r.settings.days, message: r.settings.message ?? '' });
      })
      .catch((err) => alive && setError(loyaltyMessage(err, locale)));
    return () => {
      alive = false;
    };
  }, [api, locale]);

  const needsConfirm = draft.enabled && !saved?.confirmedAt;
  const dirty = Boolean(saved) && (draft.enabled !== saved!.enabled || draft.days !== saved!.days || draft.message.trim() !== (saved!.message ?? ''));

  const save = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const r = await loyaltyFetch<{ settings: Settings; audience: Audience }>(api, {
        method: 'PUT',
        body: JSON.stringify({ enabled: draft.enabled, days: draft.days, message: draft.message.trim() || null, confirm }),
      });
      setSaved(r.settings);
      setAudience(r.audience);
      setNotice(
        r.settings.enabled
          ? tr
            ? 'Kaydedildi. Mailler her sabah, koşula uyan üyelere gider.'
            : 'Saved. Mails go out every morning to members who qualify.'
          : tr
            ? 'Kaydedildi. Geri çağırma maili kapalı.'
            : 'Saved. Win-back e-mail is off.',
      );
    } catch (err) {
      setError(loyaltyMessage(err, locale));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bz-card p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-pn-accent text-white">
            <MailOpen size={17} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="text-[15px] font-medium text-pn-ink">{tr ? 'Geri çağırma maili' : 'Win-back e-mail'}</h3>
            <p className="mt-0.5 text-[13px] text-[#737373]">
              {tr
                ? 'Bir süredir gelmeyen üyelere kartlarını hatırlatan kısa bir e-posta. Yalnız e-posta bırakıp kampanya iznine “evet” diyen üyelere gider; aynı üyeye en çok 90 günde bir.'
                : 'A short e-mail reminding members who have not visited for a while. Only to members who gave an e-mail and agreed to offers; the same member at most once in 90 days.'}
            </p>
          </div>
        </div>
        <APSwitch
          checked={draft.enabled}
          onChange={(v) => setDraft((d) => ({ ...d, enabled: v }))}
          disabled={!canManage || !saved}
          label={draft.enabled ? (tr ? 'Açık' : 'On') : tr ? 'Kapalı' : 'Off'}
        />
      </div>

      {!saved ? (
        <div className="bz-skeleton mt-4 h-24 rounded-[20px]" />
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
            <Field label={tr ? 'Kaç gündür gelmeyenlere' : 'Not visited for'}>
              <PulseSelect
                value={String(draft.days)}
                onChange={(v) => setDraft((d) => ({ ...d, days: Number(v) }))}
                ariaLabel={tr ? 'Gün sayısı' : 'Days'}
                disabled={!canManage}
                options={[30, 45, 60, 90].map((n) => ({ value: String(n), label: tr ? `${n} gün` : `${n} days` }))}
              />
            </Field>
            <Field
              label={tr ? 'Mesajınız (isteğe bağlı)' : 'Your message (optional)'}
              hint={`${draft.message.length} / ${LOYALTY_LIMITS.winbackMessageMax}`}
            >
              <textarea
                value={draft.message}
                maxLength={LOYALTY_LIMITS.winbackMessageMax}
                onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
                rows={3}
                disabled={!canManage}
                className="bz-input w-full"
                placeholder={
                  tr
                    ? 'Bir süredir uğramadınız. Kartınız ve biriktirdikleriniz duruyor; bir sonraki ziyaretinizde kasada gösterin.'
                    : 'It has been a while. Your card and what you collected are still here.'
                }
              />
            </Field>
          </div>

          {audience && (
            <p className="text-[13px] text-[#525252]">
              {tr
                ? `E-posta + kampanya izni olan üye: ${audience.reachable}. Şu ayarla şimdi mail alacak üye: ${audience.due}.`
                : `Members with e-mail + consent: ${audience.reachable}. Would get the mail now: ${audience.due}.`}
            </p>
          )}

          {needsConfirm && (
            <label className="flex cursor-pointer items-start gap-2.5 rounded-[20px] border border-[#FDE68A] bg-[#FFFBEB] p-3">
              <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-pn-ink" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
              <span className="text-[13px] leading-relaxed text-[#713F12]">
                {tr
                  ? 'Bu mailler işletmem adına gönderilen ticari iletilerdir. Onayları saklamak ve gerekiyorsa İYS’ye (İleti Yönetim Sistemi) yüklemek benim sorumluluğumdadır. Üyeler her maildeki bağlantıyla tek tıkla ayrılabilir.'
                  : 'These are commercial messages sent on behalf of my business. Keeping the consents and, where required, registering them in İYS is my responsibility. Members can opt out with one click in every mail.'}
              </span>
            </label>
          )}

          {error && (
            <AlertBanner kind="danger" onDismiss={() => setError(null)}>
              {error}
            </AlertBanner>
          )}
          {notice && (
            <AlertBanner kind="success" onDismiss={() => setNotice(null)}>
              {notice}
            </AlertBanner>
          )}

          {canManage && (
            <div className="flex justify-end">
              <button type="button" className="bz-btn-primary" disabled={busy || !dirty || (needsConfirm && !confirm)} onClick={() => void save()}>
                {busy && <Loader2 size={14} className="mr-1.5 inline animate-spin" />}
                {tr ? 'Kaydet' : 'Save'}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
