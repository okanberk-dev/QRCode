'use client';

// "Kasa" — the counter screen (§60): find a card (scan, code, phone, name),
// then add a visit or give a reward; enrol a customer who has no card yet.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Nfc, Search, UserPlus } from 'lucide-react';
import { AlertBanner, Field, Modal } from '@/components/ui';
import { formatMemberCode, normalizePhone } from '@/lib/loyalty';
import MemberActions from './MemberActions';
import ScanDialog from './ScanDialog';
import SoundToggle from '@/components/loyalty/SoundToggle';
import { unlockAudio } from '@/lib/loyalty-sound';
import NfcDialog from './NfcDialog';
import { webNfcSupported } from '@/lib/web-nfc';
import {
  loyaltyFetch,
  loyaltyMessage,
  relativeDay,
  type AccessDto,
  type MemberDto,
  type ProgramDto,
  LoyaltyApiError,
} from './loyalty-client';

interface Props {
  locale: 'tr' | 'en';
  restaurantId: string;
  restaurantName: string;
  program: ProgramDto;
  access: AccessDto;
  onMemberCreated: () => void;
}

const EMPTY_ENROL = { firstName: '', lastName: '', phone: '', email: '', birthMonth: '', birthDay: '', marketing: false, notice: false };

export default function CounterPanel({ locale, restaurantId, restaurantName, program, access, onMemberCreated }: Props) {
  const tr = locale === 'tr';
  const base = `/api/restaurants/${restaurantId}/loyalty`;
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<MemberDto[] | null>(null);
  const [selected, setSelected] = useState<MemberDto | null>(null);
  const [recent, setRecent] = useState<MemberDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [nfcOpen, setNfcOpen] = useState(false);
  const [nfcReady, setNfcReady] = useState(false);
  useEffect(() => setNfcReady(webNfcSupported()), []);
  const [enrolOpen, setEnrolOpen] = useState(false);
  const [enrol, setEnrol] = useState(EMPTY_ENROL);
  const [enrolBusy, setEnrolBusy] = useState(false);
  const [enrolError, setEnrolError] = useState<string | null>(null);
  const [newCard, setNewCard] = useState<MemberDto | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const pick = useCallback((m: MemberDto) => {
    setSelected(m);
    setRecent((prev) => [m, ...prev.filter((x) => x.id !== m.id)].slice(0, 6));
  }, []);

  const search = useCallback(
    async (value: string) => {
      const q = value.trim();
      if (!q) return;
      setSearching(true);
      setError(null);
      try {
        const r = await loyaltyFetch<{ items: MemberDto[] }>(`${base}/lookup`, { method: 'POST', body: JSON.stringify({ query: q }) });
        setResults(r.items);
        if (r.items.length === 1) {
          pick(r.items[0]);
          setQuery('');
        } else {
          setSelected(null);
        }
      } catch (err) {
        setError(loyaltyMessage(err, locale));
      } finally {
        setSearching(false);
      }
    },
    [base, locale, pick],
  );

  const onScan = useCallback(
    (value: string) => {
      setScanOpen(false);
      void search(value);
    },
    [search],
  );

  const onNfc = useCallback(
    (value: string) => {
      setNfcOpen(false);
      void search(value);
    },
    [search],
  );

  const updateMember = (m: MemberDto) => {
    setSelected(m);
    setRecent((prev) => prev.map((x) => (x.id === m.id ? m : x)));
    setResults((prev) => (prev ? prev.map((x) => (x.id === m.id ? m : x)) : prev));
  };

  const openEnrol = () => {
    const digits = query.replace(/\D/g, '');
    const typed = digits.length >= 7 ? '' : query.trim();
    const parts = typed.split(/\s+/).filter(Boolean);
    setEnrol({
      ...EMPTY_ENROL,
      phone: digits.length >= 7 ? query.trim() : '',
      firstName: parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0] ?? '',
      lastName: parts.length > 1 ? parts[parts.length - 1] : '',
    });
    setEnrolError(null);
    setEnrolOpen(true);
  };

  const submitEnrol = async () => {
    // The phone is optional (2026-11-28); a name or a phone is enough.
    const hasPhone = enrol.phone.trim().length > 0;
    if (hasPhone && !normalizePhone(enrol.phone)) {
      setEnrolError(tr ? 'Telefon numarasını kontrol edin ya da boş bırakın.' : 'Check the phone number or leave it empty.');
      return;
    }
    if (!hasPhone && !enrol.firstName.trim() && !enrol.lastName.trim()) {
      setEnrolError(tr ? 'Müşterinin adını ya da telefonunu yazın.' : 'Enter the customer’s name or phone.');
      return;
    }
    if (!enrol.notice) {
      setEnrolError(tr ? 'Müşterinin aydınlatma metnini gördüğünü onaylayın.' : 'Confirm the customer saw the privacy notice.');
      return;
    }
    setEnrolBusy(true);
    setEnrolError(null);
    try {
      const month = Number.parseInt(enrol.birthMonth, 10);
      const day = Number.parseInt(enrol.birthDay, 10);
      const hasBirthday = Number.isFinite(month) && Number.isFinite(day);
      const r = await loyaltyFetch<{ member: MemberDto }>(`${base}/members`, {
        method: 'POST',
        body: JSON.stringify({
          firstName: enrol.firstName.trim() || null,
          lastName: enrol.lastName.trim() || null,
          phone: enrol.phone.trim() || null,
          email: enrol.email.trim() || null,
          ...(hasBirthday ? { birthMonth: month, birthDay: day } : {}),
          marketingConsent: enrol.marketing,
          noticeConfirmed: true,
        }),
      });
      setEnrolOpen(false);
      setQuery('');
      setResults(null);
      pick(r.member);
      setNewCard(r.member);
      onMemberCreated();
    } catch (err) {
      if (err instanceof LoyaltyApiError && err.code === 'PHONE_EXISTS') {
        setEnrolOpen(false);
        void search(enrol.phone);
        return;
      }
      setEnrolError(loyaltyMessage(err, locale));
    } finally {
      setEnrolBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="bz-card min-w-0 p-4 sm:p-5">
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void search(query);
          }}
        >
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">{tr ? 'Kart ara' : 'Find a card'}</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A3A3]" aria-hidden="true" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bz-input w-full pl-9"
              placeholder={tr ? 'Kart kodu, telefon ya da isim' : 'Card code, phone or name'}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="search"
            />
          </label>
          <div className="flex gap-2">
            <button type="submit" className="bz-btn-primary min-h-[44px] flex-1 sm:flex-none" disabled={searching || !query.trim()}>
              {searching ? <Loader2 size={15} className="mx-auto animate-spin" /> : tr ? 'Bul' : 'Find'}
            </button>
            <button
              type="button"
              className="bz-btn-ghost inline-flex min-h-[44px] items-center gap-1.5"
              onClick={() => {
                // Inside the tap, so the "read" sound may play later.
                unlockAudio();
                setScanOpen(true);
              }}
            >
              <Camera size={15} /> {tr ? 'Okut' : 'Scan'}
            </button>
            {nfcReady && (
              <button type="button" className="bz-btn-ghost inline-flex min-h-[44px] items-center gap-1.5" onClick={() => setNfcOpen(true)} aria-label={tr ? 'NFC ile okut' : 'Read by NFC'}>
                <Nfc size={15} /> <span className="hidden sm:inline">NFC</span>
              </button>
            )}
            {access.operate && (
              <button type="button" className="bz-btn-ghost inline-flex min-h-[44px] items-center gap-1.5" onClick={openEnrol}>
                <UserPlus size={15} /> <span className="hidden sm:inline">{tr ? 'Yeni üye' : 'New member'}</span>
              </button>
            )}
          </div>
        </form>

        {error && (
          <div className="mt-3">
            <AlertBanner kind="danger" onDismiss={() => setError(null)}>
              {error}
            </AlertBanner>
          </div>
        )}

        {results && results.length === 0 && (
          <div className="mt-4 rounded-[20px] border border-dashed border-pn-line-strong p-5 text-center">
            <p className="text-[14px] text-[#262626]">{tr ? 'Kart bulunamadı.' : 'No card found.'}</p>
            {access.operate && (
              <button type="button" className="bz-btn-lime mt-3 inline-flex items-center gap-1.5" onClick={openEnrol}>
                <UserPlus size={15} /> {tr ? 'Bu müşteri için kart aç' : 'Open a card for this customer'}
              </button>
            )}
          </div>
        )}

        {results && results.length > 1 && !selected && (
          <ul className="mt-4 divide-y divide-[#F0F0F0] rounded-[20px] border border-pn-line">
            {results.map((m, i) => (
              <li key={m.id} className="bzl-rise" style={{ animationDelay: `${Math.min(i, 6) * 45}ms` }}>
                <button type="button" onClick={() => pick(m)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-pn-canvas">
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium text-pn-ink">{m.name || (tr ? 'İsimsiz üye' : 'Unnamed')}</span>
                    <span className="text-[12px] text-[#737373]">
                      {formatMemberCode(m.code)}
                      {m.phoneMasked ? ` · ${m.phoneMasked}` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 text-[13px] font-medium tabular-nums">{m.balance}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {selected ? (
          <div key={selected.id} className="bzl-rise mt-5 border-t border-pn-line pt-5">
            <MemberActions
              locale={locale}
              restaurantId={restaurantId}
              restaurantName={restaurantName}
              program={program}
              member={selected}
              access={access}
              onChange={updateMember}
            />
          </div>
        ) : (
          !results && (
            <p className="mt-4 text-[13px] text-[#737373]">
              {tr
                ? 'Müşterinin telefonundaki kart QR’ını okutun ya da kartın altındaki kodu yazın. Kartı yoksa adıyla ya da telefonuyla bulabilir, yeni kart açabilirsiniz.'
                : 'Scan the QR on the customer’s card or type the code under it. No card? Find them by name or phone, or open a new card.'}
            </p>
          )
        )}
      </div>

      <aside className="bz-card p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-medium text-pn-ink">{tr ? 'Bu oturumda' : 'This session'}</p>
          <SoundToggle locale={locale} variant="panel" />
        </div>
        {recent.length === 0 ? (
          <p className="mt-2 text-[13px] text-[#737373]">{tr ? 'İşlem yaptığınız kartlar burada görünür.' : 'Cards you serve show up here.'}</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {recent.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => setSelected(m)}
                  className={`flex w-full items-center justify-between gap-2 rounded-[14px] px-2.5 py-2 text-left text-[13px] ${selected?.id === m.id ? 'bg-pn-canvas' : 'hover:bg-pn-canvas'}`}
                >
                  <span className="min-w-0 truncate">{m.name || formatMemberCode(m.code)}</span>
                  <span className="shrink-0 text-[12px] text-[#737373]">{relativeDay(m.lastVisitAt, locale)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {scanOpen && <ScanDialog locale={locale} onResult={onScan} onClose={() => setScanOpen(false)} />}
      {nfcOpen && <NfcDialog locale={locale} mode="read" title={tr ? 'Kartı NFC ile okut' : 'Read the card by NFC'} onRead={onNfc} onClose={() => setNfcOpen(false)} />}

      {enrolOpen && (
        <Modal
          title={tr ? 'Yeni kart aç' : 'Open a new card'}
          onClose={() => setEnrolOpen(false)}
          size={480}
          closeGuard={() => Boolean(enrol.firstName || enrol.lastName || enrol.phone || enrol.email)}
          footer={
            <div className="flex justify-end gap-2">
              <button type="button" className="bz-btn-ghost" onClick={() => setEnrolOpen(false)}>
                {tr ? 'Vazgeç' : 'Cancel'}
              </button>
              <button type="button" className="bz-btn-lime" disabled={enrolBusy} onClick={() => void submitEnrol()}>
                {enrolBusy && <Loader2 size={14} className="mr-1.5 inline animate-spin" />}
                {tr ? 'Kartı aç' : 'Open card'}
              </button>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={tr ? 'Ad' : 'First name'} htmlFor="enrol-first">
                <input id="enrol-first" value={enrol.firstName} onChange={(e) => setEnrol((s) => ({ ...s, firstName: e.target.value }))} className="bz-input w-full" autoCapitalize="words" autoComplete="off" enterKeyHint="next" />
              </Field>
              <Field label={tr ? 'Soyad' : 'Last name'} htmlFor="enrol-last">
                <input id="enrol-last" value={enrol.lastName} onChange={(e) => setEnrol((s) => ({ ...s, lastName: e.target.value }))} className="bz-input w-full" autoCapitalize="words" autoComplete="off" enterKeyHint="next" />
              </Field>
            </div>
            <Field label={tr ? 'Telefon (isteğe bağlı)' : 'Phone (optional)'} htmlFor="enrol-phone">
              <input id="enrol-phone" value={enrol.phone} onChange={(e) => setEnrol((s) => ({ ...s, phone: e.target.value }))} className="bz-input w-full" inputMode="tel" autoComplete="off" placeholder="05xx xxx xx xx" enterKeyHint="next" />
            </Field>
            <Field label={tr ? 'E-posta (kart bağlantısı için, isteğe bağlı)' : 'E-mail (optional)'} htmlFor="enrol-email">
              <input id="enrol-email" type="email" value={enrol.email} onChange={(e) => setEnrol((s) => ({ ...s, email: e.target.value }))} className="bz-input w-full" inputMode="email" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
            </Field>
            {program.birthdayReward && (
              <Field label={tr ? 'Doğum günü (gün / ay, isteğe bağlı)' : 'Birthday (day / month, optional)'}>
                <div className="flex gap-2">
                  <input value={enrol.birthDay} onChange={(e) => setEnrol((s) => ({ ...s, birthDay: e.target.value }))} className="bz-input w-20" inputMode="numeric" placeholder={tr ? 'Gün' : 'Day'} aria-label={tr ? 'Gün' : 'Day'} />
                  <input value={enrol.birthMonth} onChange={(e) => setEnrol((s) => ({ ...s, birthMonth: e.target.value }))} className="bz-input w-20" inputMode="numeric" placeholder={tr ? 'Ay' : 'Month'} aria-label={tr ? 'Ay' : 'Month'} />
                </div>
              </Field>
            )}
            <label className="flex items-start gap-2 text-[13px] text-[#262626]">
              <input type="checkbox" className="mt-0.5 h-4 w-4" checked={enrol.notice} onChange={(e) => setEnrol((s) => ({ ...s, notice: e.target.checked }))} />
              <span>
                {tr
                  ? 'Müşteri, bilgilerinin sadakat kartı için işleneceğini öğrendi ve kabul etti (aydınlatma metni katılım sayfasında).'
                  : 'The customer was told their details are used for the loyalty card and agreed (notice on the join page).'}
              </span>
            </label>
            <label className="flex items-start gap-2 text-[13px] text-[#262626]">
              <input type="checkbox" className="mt-0.5 h-4 w-4" checked={enrol.marketing} onChange={(e) => setEnrol((s) => ({ ...s, marketing: e.target.checked }))} />
              <span>{tr ? 'Müşteri kampanya mesajı almayı da kabul etti (isteğe bağlı).' : 'The customer also agreed to marketing messages (optional).'}</span>
            </label>
            {enrolError && <AlertBanner kind="danger">{enrolError}</AlertBanner>}
          </div>
        </Modal>
      )}

      {newCard && (
        <Modal title={tr ? 'Kart açıldı' : 'Card opened'} onClose={() => setNewCard(null)} size={380}>
          <div className="text-center">
            <img
              src={`/api/restaurants/${restaurantId}/loyalty/qr?member=${newCard.id}`}
              alt={tr ? 'Kart bağlantısının QR kodu' : 'QR code of the card link'}
              width={240}
              height={240}
              className="mx-auto h-[240px] w-[240px]"
            />
            <p className="mt-3 text-[13px] text-[#525252]">
              {tr
                ? `Müşteri bu QR’ı telefonuyla okutup kartını kaydetsin. Kart kodu: ${formatMemberCode(newCard.code)}`
                : `Ask the customer to scan this QR to save their card. Card code: ${formatMemberCode(newCard.code)}`}
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
