'use client';

// One customer's card at the counter (§60): add a visit, give a reward or
// the birthday gift, correct the balance (managers), show the card QR.
// Used by the panel counter, the members tab and the staff mode of the
// customer's card page (§61). Each success lands with motion (new stamps
// stamp in, a ring for a visit, confetti for a reward), a sound when the
// device's sound is on (`buaze:sound`, unlocked by a tap) and a short
// vibration on phones.
import { useEffect, useRef, useState } from 'react';
import { Cake, Gift, Loader2, Minus, Nfc, Plus, QrCode } from 'lucide-react';
import { AlertBanner, Badge, Modal } from '@/components/ui';
import LoyaltyCardFace from '@/components/loyalty/LoyaltyCardFace';
import ConfettiBurst from '@/components/loyalty/ConfettiBurst';
import '@/components/loyalty/loyalty-motion.css';
import { haptic, playSound } from '@/lib/loyalty-sound';
import { webNfcSupported } from '@/lib/web-nfc';
import NfcDialog from './NfcDialog';
import {
  birthdayGiftAvailable,
  computeEarn,
  expiresAt,
  formatMemberCode,
  formatPhoneForDisplay,
  nextTier,
  redeemableRewards,
  tierFor,
  unitLabel,
  LOYALTY_LIMITS,
} from '@/lib/loyalty';
import {
  eventLabel,
  loyaltyFetch,
  loyaltyMessage,
  relativeDay,
  type AccessDto,
  type EventDto,
  type MemberDto,
  type ProgramDto,
  LoyaltyApiError,
} from './loyalty-client';

interface Props {
  locale: 'tr' | 'en';
  restaurantId: string;
  restaurantName: string;
  program: ProgramDto;
  member: MemberDto;
  access: AccessDto;
  onChange: (member: MemberDto) => void;
  /** Show history under the actions (members tab). */
  withHistory?: boolean;
}

export default function MemberActions({
  locale,
  restaurantId,
  restaurantName,
  program,
  member,
  access,
  onChange,
  withHistory = false,
}: Props) {
  const tr = locale === 'tr';
  const api = `/api/restaurants/${restaurantId}/loyalty/members/${member.id}`;
  const [count, setCount] = useState(1);
  const [spend, setSpend] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [events, setEvents] = useState<EventDto[] | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [nfcReady, setNfcReady] = useState(false);
  const [nfcUrl, setNfcUrl] = useState<string | null>(null);
  const [nfcOpen, setNfcOpen] = useState(false);
  useEffect(() => setNfcReady(webNfcSupported()), []);

  const openNfc = async () => {
    setNfcUrl(null);
    setNfcOpen(true);
    try {
      const r = await loyaltyFetch<{ url: string }>(`/api/restaurants/${restaurantId}/loyalty/qr?member=${member.id}&format=url`);
      setNfcUrl(r.url);
    } catch (err) {
      setNfcOpen(false);
      setError(loyaltyMessage(err, locale));
    }
  };
  const [confirmReward, setConfirmReward] = useState<{ id: string; title: string; cost: number } | null>(null);
  /** The last successful action, replayed as motion on the card. */
  const [burst, setBurst] = useState<{ id: number; from: number | null; earned: boolean; reward: boolean } | null>(null);
  const burstId = useRef(0);
  const [adjust, setAdjust] = useState({ delta: '', note: '' });

  const kind = program.kind;
  const tier = tierFor(member.visits, program.tiers);
  const upcoming = nextTier(member.visits, program.tiers);
  const redeemable = redeemableRewards(member.balance, program.rewards);
  const birthday = birthdayGiftAvailable(program, member, new Date());
  const expiry = expiresAt(member, program.expiryDays);
  const spendNumber = Number.parseInt(spend, 10);
  const earnPreview = computeEarn(program, { count, spend: Number.isFinite(spendNumber) ? spendNumber : 0 });
  const paused = !program.isActive;

  useEffect(() => {
    setCooldown(false);
    setError(null);
    setNotice(null);
    setCount(1);
    setSpend('');
    setBurst(null);
  }, [member.id]);

  useEffect(() => {
    if (!withHistory) return;
    let alive = true;
    loyaltyFetch<{ events: EventDto[] }>(api)
      .then((r) => alive && setEvents(r.events))
      .catch(() => alive && setEvents([]));
    return () => {
      alive = false;
    };
  }, [api, withHistory, member.balance, member.visits]);

  const act = async (key: string, body: Record<string, unknown>, success: (r: { member: MemberDto; amount?: number; rewardTitle?: string }) => string) => {
    setBusy(key);
    setError(null);
    setNotice(null);
    const before = member.balance;
    try {
      const r = await loyaltyFetch<{ member: MemberDto; amount?: number; rewardTitle?: string }>(`${api}/actions`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      onChange(r.member);
      const reward = key === 'redeem' || key === 'birthday';
      burstId.current += 1;
      setBurst({
        id: burstId.current,
        // New stamps land one by one; the points figure pops.
        from: key === 'earn' ? (kind === 'stamps' ? before : 0) : null,
        earned: key === 'earn',
        reward,
      });
      playSound(reward ? 'reward' : key === 'earn' ? 'stamp' : 'tap');
      haptic(reward ? [18, 50, 28] : 16);
      setCooldown(false);
      setNotice(success(r));
      setSpend('');
      setCount(1);
    } catch (err) {
      if (err instanceof LoyaltyApiError && err.code === 'COOLDOWN') setCooldown(true);
      setError(loyaltyMessage(err, locale));
    } finally {
      setBusy(null);
    }
  };

  const earn = (override = false) =>
    act('earn', { type: 'earn', ...(kind === 'stamps' ? { count } : { spend: Number.isFinite(spendNumber) ? spendNumber : 0 }), ...(override ? { override: true } : {}) }, (r) =>
      tr ? `+${r.amount} ${unitLabel(kind, r.amount ?? 0, locale)} eklendi.` : `Added ${r.amount} ${unitLabel(kind, r.amount ?? 0, locale)}.`,
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[17px] font-semibold text-[#0A0A0A]">{member.name || (tr ? 'İsimsiz üye' : 'Unnamed member')}</p>
          <p className="mt-0.5 text-[12.5px] text-[#737373]">
            <span className="font-mono tracking-[0.1em]">{formatMemberCode(member.code)}</span>
            {(member.phone || member.phoneMasked) && (
              <>
                {' · '}
                {access.manage && member.phone ? (
                  <a href={`tel:${member.phone}`} className="tabular-nums underline-offset-2 hover:underline">
                    {formatPhoneForDisplay(member.phone)}
                  </a>
                ) : (
                  member.phoneMasked
                )}
              </>
            )}
            {access.manage && member.email && <> · {member.email}</>}
            {' · '}
            {tr ? 'Son ziyaret' : 'Last visit'}: {relativeDay(member.lastVisitAt, locale)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {member.hasAccount && (
            <Badge kind="info" dot={false}>
              {tr ? 'Buaze hesabı' : 'Buaze account'}
            </Badge>
          )}
          {tier && <Badge kind="lime">{tier.name}</Badge>}
          <Badge kind="ghost" dot={false}>
            {member.visits} {tr ? 'ziyaret' : 'visits'}
          </Badge>
          {access.operate && (
            <button type="button" className="bz-btn-ghost inline-flex items-center gap-1.5" onClick={() => setShowQr(true)}>
              <QrCode size={14} /> {tr ? 'Kartı göster' : 'Show card'}
            </button>
          )}
          {access.operate && nfcReady && (
            <button type="button" className="bz-btn-ghost inline-flex items-center gap-1.5" onClick={() => void openNfc()}>
              <Nfc size={14} /> {tr ? 'Anahtarlığa yaz' : 'Write key fob'}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,320px)_1fr]">
        <div key={burst?.id ?? 'still'} className={`relative self-start ${burst ? 'bzl-bump' : ''}`}>
          {burst?.earned && (
            <span
              aria-hidden="true"
              className="bzl-ring pointer-events-none absolute inset-0 rounded-[20px] border-[3px]"
              style={{ borderColor: '#C6F24E' }}
            />
          )}
          <LoyaltyCardFace
            businessName={restaurantName}
            programName={program.name}
            kind={kind}
            balance={member.balance}
            rewards={program.rewards}
            accentColor={program.accentColor}
            memberName={member.name?.split(/\s+/)[0] ?? null}
            code={member.code}
            tierName={tier?.name ?? null}
            locale={locale}
            highlightFrom={burst?.from ?? null}
          />
          {burst?.reward && <ConfettiBurst className="left-1/2 top-1/2 z-10" count={28} reach={70} fall={90} />}
        </div>

        <div className="space-y-3">
          {paused && (
            <AlertBanner kind="warn">{tr ? 'Program duraklatılmış: kasa işlemleri kapalı.' : 'Programme paused: counter actions are off.'}</AlertBanner>
          )}
          {tier?.perk && (
            <p className="rounded-lg bg-[#EAF9B8] px-3 py-2 text-[13px] text-[#3F4A00]">
              <strong>{tier.name}:</strong> {tier.perk}
            </p>
          )}

          {access.operate && !paused && (
            <div className="rounded-xl border border-[#EDEDED] p-3">
              {kind === 'stamps' ? (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center rounded-lg border border-[#EDEDED]" aria-label={tr ? 'Damga adedi' : 'Stamp count'}>
                    <button type="button" className="flex h-11 w-11 items-center justify-center disabled:opacity-30" disabled={count <= 1} onClick={() => setCount((c) => Math.max(1, c - 1))} aria-label={tr ? 'Azalt' : 'Less'}>
                      <Minus size={16} />
                    </button>
                    <span className="w-8 text-center text-[16px] font-semibold tabular-nums" aria-live="polite">{count}</span>
                    <button type="button" className="flex h-11 w-11 items-center justify-center disabled:opacity-30" disabled={count >= LOYALTY_LIMITS.stampsPerVisitMax} onClick={() => setCount((c) => Math.min(LOYALTY_LIMITS.stampsPerVisitMax, c + 1))} aria-label={tr ? 'Artır' : 'More'}>
                      <Plus size={16} />
                    </button>
                  </div>
                  <button type="button" className="bz-btn-lime min-h-[44px] flex-1 text-[15px]" disabled={busy !== null} onClick={() => void earn()}>
                    {busy === 'earn' ? <Loader2 size={16} className="mx-auto animate-spin" /> : tr ? `+${count} damga ekle` : `Add ${count} stamp${count === 1 ? '' : 's'}`}
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  {program.pointsPerSpend > 0 && program.spendStep > 0 && (
                    <label className="flex items-center gap-2 text-[13px] text-[#525252]">
                      {tr ? 'Harcama' : 'Spend'}
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={LOYALTY_LIMITS.spendMax}
                        value={spend}
                        onChange={(e) => setSpend(e.target.value)}
                        className="bz-input w-28 tabular-nums"
                        placeholder="0"
                        enterKeyHint="done"
                      />
                      TL
                    </label>
                  )}
                  <button type="button" className="bz-btn-lime min-h-[44px] flex-1 text-[15px]" disabled={busy !== null || earnPreview <= 0} onClick={() => void earn()}>
                    {busy === 'earn' ? <Loader2 size={16} className="mx-auto animate-spin" /> : tr ? `+${earnPreview} puan ekle` : `Add ${earnPreview} points`}
                  </button>
                </div>
              )}
              {cooldown && (
                <button type="button" className="mt-2 text-[13px] font-medium text-[#92400E] underline underline-offset-4" onClick={() => void earn(true)} disabled={busy !== null}>
                  {tr ? 'Yine de ekle (yeni ziyaret)' : 'Add anyway (new visit)'}
                </button>
              )}
            </div>
          )}

          {access.operate && !paused && (redeemable.length > 0 || birthday) && (
            <div className="space-y-2">
              {redeemable.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  disabled={busy !== null}
                  onClick={() => setConfirmReward({ id: r.id, title: r.title, cost: r.cost })}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#A8D62E] bg-[#F6FCE4] px-4 py-3 text-left"
                >
                  <span className="flex items-center gap-2 text-[14px] font-semibold text-[#0A0A0A]">
                    <Gift size={16} aria-hidden="true" /> {r.title}
                  </span>
                  <span className="text-[12.5px] text-[#525252]">
                    {tr ? 'Ödülü ver' : 'Give reward'} · −{r.cost} {unitLabel(kind, r.cost, locale)}
                  </span>
                </button>
              ))}
              {birthday && (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void act('birthday', { type: 'birthday' }, () => (tr ? 'Doğum günü hediyesi kaydedildi.' : 'Birthday gift recorded.'))}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#F5C6D6] bg-[#FFF1F5] px-4 py-3 text-left"
                >
                  <span className="flex items-center gap-2 text-[14px] font-semibold text-[#0A0A0A]">
                    <Cake size={16} aria-hidden="true" /> {program.birthdayReward}
                  </span>
                  <span className="text-[12.5px] text-[#525252]">{tr ? 'Doğum günü ayı' : 'Birthday month'}</span>
                </button>
              )}
            </div>
          )}

          <p className="text-[12.5px] text-[#737373]">
            {upcoming
              ? tr
                ? `${upcoming.visitsLeft} ziyaret sonra ${upcoming.tier.name} seviyesi.`
                : `${upcoming.visitsLeft} more visits to ${upcoming.tier.name}.`
              : null}
            {expiry && (
              <>
                {' '}
                {tr ? 'Bakiye' : 'Balance lapses'} {expiry.toLocaleDateString(tr ? 'tr-TR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}{' '}
                {tr ? 'tarihine kadar geçerli.' : ''}
              </>
            )}
          </p>

          {error && (
            <AlertBanner kind={cooldown ? 'warn' : 'danger'} onDismiss={() => setError(null)}>
              {error}
            </AlertBanner>
          )}
          <div aria-live="polite">
            {notice && (
              <div key={burst?.id ?? 'notice'} className="bzl-rise">
                <AlertBanner kind="success" onDismiss={() => setNotice(null)}>
                  {notice}
                </AlertBanner>
              </div>
            )}
          </div>

          {access.manage && (
            <details className="rounded-xl border border-[#EDEDED] p-3">
              <summary className="cursor-pointer text-[13px] font-medium text-[#525252]">{tr ? 'Bakiyeyi düzelt' : 'Correct the balance'}</summary>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="number"
                  inputMode="numeric"
                  value={adjust.delta}
                  onChange={(e) => setAdjust((a) => ({ ...a, delta: e.target.value }))}
                  className="bz-input w-full sm:w-28"
                  placeholder={tr ? '+2 / −2' : '+2 / -2'}
                  aria-label={tr ? 'Düzeltme miktarı' : 'Correction amount'}
                />
                <input
                  value={adjust.note}
                  maxLength={LOYALTY_LIMITS.noteMax}
                  onChange={(e) => setAdjust((a) => ({ ...a, note: e.target.value }))}
                  className="bz-input min-w-0 flex-1"
                  placeholder={tr ? 'Neden? (zorunlu)' : 'Why? (required)'}
                  aria-label={tr ? 'Düzeltme nedeni' : 'Reason'}
                />
                <button
                  type="button"
                  className="bz-btn-ghost"
                  disabled={busy !== null || !Number.parseInt(adjust.delta, 10) || adjust.note.trim().length < 3}
                  onClick={() =>
                    void act('adjust', { type: 'adjust', delta: Number.parseInt(adjust.delta, 10), note: adjust.note.trim() }, () => {
                      setAdjust({ delta: '', note: '' });
                      return tr ? 'Bakiye düzeltildi.' : 'Balance corrected.';
                    })
                  }
                >
                  {tr ? 'Uygula' : 'Apply'}
                </button>
              </div>
            </details>
          )}
        </div>
      </div>

      {withHistory && (
        <div>
          <p className="text-[13px] font-semibold text-[#0A0A0A]">{tr ? 'Hareketler' : 'History'}</p>
          {events === null ? (
            <p className="mt-2 text-[13px] text-[#737373]">{tr ? 'Yükleniyor…' : 'Loading…'}</p>
          ) : events.length === 0 ? (
            <p className="mt-2 text-[13px] text-[#737373]">{tr ? 'Henüz hareket yok.' : 'No activity yet.'}</p>
          ) : (
            <ul className="mt-2 divide-y divide-[#F0F0F0] rounded-xl border border-[#EDEDED]">
              {events.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-[13px]">
                  <span className="min-w-0 truncate text-[#262626]">{eventLabel(e, unitLabel(kind, Math.abs(e.amount), locale), locale)}</span>
                  <span className="flex shrink-0 items-center gap-3">
                    {e.amount !== 0 && (
                      <span className={`tabular-nums font-medium ${e.amount > 0 ? 'text-[#15803D]' : 'text-[#B91C1C]'}`}>
                        {e.amount > 0 ? '+' : ''}
                        {e.amount}
                      </span>
                    )}
                    <span className="text-[#A3A3A3]">{relativeDay(e.createdAt, locale)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {confirmReward && (
        <Modal
          title={tr ? 'Ödülü ver' : 'Give reward'}
          onClose={() => setConfirmReward(null)}
          size={420}
          footer={
            <div className="flex justify-end gap-2">
              <button type="button" className="bz-btn-ghost" onClick={() => setConfirmReward(null)}>
                {tr ? 'Vazgeç' : 'Cancel'}
              </button>
              <button
                type="button"
                className="bz-btn-lime"
                disabled={busy !== null}
                onClick={() => {
                  const r = confirmReward;
                  setConfirmReward(null);
                  void act('redeem', { type: 'redeem', rewardId: r.id }, (res) =>
                    tr ? `“${res.rewardTitle ?? r.title}” verildi.` : `“${res.rewardTitle ?? r.title}” given.`,
                  );
                }}
              >
                {tr ? 'Ödülü ver' : 'Give reward'}
              </button>
            </div>
          }
        >
          <p className="text-[14px] text-[#262626]">
            {tr
              ? `${member.name || 'Üye'} için “${confirmReward.title}” verilecek ve bakiyeden ${confirmReward.cost} ${unitLabel(kind, confirmReward.cost, locale)} düşülecek.`
              : `“${confirmReward.title}” will be given to ${member.name || 'the member'} and ${confirmReward.cost} ${unitLabel(kind, confirmReward.cost, locale)} taken from the balance.`}
          </p>
        </Modal>
      )}

      {nfcOpen && (
        <NfcDialog
          locale={locale}
          mode="write"
          url={nfcUrl}
          title={tr ? 'Kartı NFC anahtarlığa yaz' : 'Write the card to an NFC key fob'}
          onClose={() => setNfcOpen(false)}
        />
      )}

      {showQr && (
        <Modal title={tr ? 'Müşterinin kartı' : 'Customer card'} onClose={() => setShowQr(false)} size={380}>
          <div className="text-center">
            <img
              src={`/api/restaurants/${restaurantId}/loyalty/qr?member=${member.id}`}
              alt={tr ? 'Kart bağlantısının QR kodu' : 'QR code of the card link'}
              width={260}
              height={260}
              className="mx-auto h-[260px] w-[260px]"
            />
            <p className="mt-3 text-[13px] text-[#525252]">
              {tr
                ? 'Müşteri telefon kamerasıyla okutunca kartı açılır. Kart bağlantısını kendisinden başkası görmesin.'
                : 'The customer scans it with their phone camera to open their card. Keep the link private to them.'}
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
