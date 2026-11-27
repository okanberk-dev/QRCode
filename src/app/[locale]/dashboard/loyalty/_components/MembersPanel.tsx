'use client';

// Members of the loyalty card (§60): search, sort, "reward ready" filter,
// CSV (managers), and a detail window with actions, history and delete.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Loader2, Search, Trash2 } from 'lucide-react';
import { AlertBanner, Badge, EmptyState, Modal, PulseSelect } from '@/components/ui';
import { activeRewards, formatMemberCode, formatPhoneForDisplay, tierFor } from '@/lib/loyalty';
import MemberActions from './MemberActions';
import { loyaltyFetch, loyaltyMessage, relativeDay, type AccessDto, type MemberDto, type ProgramDto } from './loyalty-client';

interface Props {
  locale: 'tr' | 'en';
  restaurantId: string;
  restaurantName: string;
  program: ProgramDto;
  access: AccessDto;
  refreshKey: number;
  onChanged: () => void;
}

type Sort = 'recent' | 'visits' | 'balance' | 'new';

export default function MembersPanel({ locale, restaurantId, restaurantName, program, access, refreshKey, onChanged }: Props) {
  const tr = locale === 'tr';
  const base = `/api/restaurants/${restaurantId}/loyalty/members`;
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('recent');
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<MemberDto[] | null>(null);
  const [total, setTotal] = useState(0);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<MemberDto | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const t = window.setTimeout(() => setQuery(q.trim()), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  const load = useCallback(
    async (after?: string | null) => {
      const my = ++seq.current;
      if (after) setLoadingMore(true);
      setError(null);
      try {
        const params = new URLSearchParams({ sort, limit: '30' });
        if (query) params.set('q', query);
        if (ready) params.set('ready', '1');
        if (after) params.set('cursor', after);
        const r = await loyaltyFetch<{ items: MemberDto[]; total: number; nextCursor: string | null }>(`${base}?${params}`);
        if (my !== seq.current) return;
        setItems((prev) => (after && prev ? [...prev, ...r.items] : r.items));
        setTotal(r.total);
        setCursor(r.nextCursor);
      } catch (err) {
        if (my === seq.current) setError(loyaltyMessage(err, locale));
      } finally {
        if (my === seq.current) setLoadingMore(false);
      }
    },
    [base, locale, query, ready, sort],
  );

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const update = (m: MemberDto) => {
    setOpen(m);
    setItems((prev) => (prev ? prev.map((x) => (x.id === m.id ? m : x)) : prev));
    onChanged();
  };

  const remove = async () => {
    if (!open) return;
    setDeleting(true);
    try {
      await loyaltyFetch(`${base}/${open.id}`, { method: 'DELETE' });
      setItems((prev) => (prev ? prev.filter((x) => x.id !== open.id) : prev));
      setTotal((t) => Math.max(0, t - 1));
      setConfirmDelete(false);
      setOpen(null);
      onChanged();
    } catch (err) {
      setError(loyaltyMessage(err, locale));
    } finally {
      setDeleting(false);
    }
  };

  const minCost = activeRewards(program.rewards)[0]?.cost ?? Infinity;

  return (
    <div className="bz-card p-4 sm:p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{tr ? 'Üye ara' : 'Search members'}</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A3A3]" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} className="bz-input w-full pl-9" placeholder={tr ? 'İsim, telefon ya da kart kodu' : 'Name, phone or card code'} />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={ready}
            onClick={() => setReady((v) => !v)}
            className={`min-h-[40px] rounded-full px-4 text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent ${ready ? 'bg-pn-accent text-white' : 'bg-pn-canvas text-pn-ink hover:bg-[#EDEDED]'}`}
          >
            {tr ? 'Ödülü hazır' : 'Reward ready'}
          </button>
          <PulseSelect
            value={sort}
            onChange={(v) => setSort(v as Sort)}
            ariaLabel={tr ? 'Sırala' : 'Sort'}
            className="min-w-[150px]"
            options={[
              { value: 'recent', label: tr ? 'Son ziyaret' : 'Last visit' },
              { value: 'visits', label: tr ? 'En çok ziyaret' : 'Most visits' },
              { value: 'balance', label: tr ? 'En yüksek bakiye' : 'Highest balance' },
              { value: 'new', label: tr ? 'En yeni üye' : 'Newest' },
            ]}
          />
          {access.manage && (
            <a href={`${base}/export`} className="bz-btn-ghost inline-flex min-h-[36px] items-center gap-1.5" rel="nofollow">
              <Download size={14} /> CSV
            </a>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3">
          <AlertBanner kind="danger" onDismiss={() => setError(null)}>
            {error}
          </AlertBanner>
        </div>
      )}

      <p className="mt-3 text-[13px] text-[#737373]">{items ? (tr ? `${total} üye` : `${total} members`) : ''}</p>

      {items === null ? (
        <div className="mt-3 space-y-2" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bz-skeleton h-14 rounded-[20px]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          className="mt-4"
          title={query || ready ? (tr ? 'Eşleşen üye yok' : 'No matching members') : tr ? 'Henüz üye yok' : 'No members yet'}
          body={
            query || ready
              ? undefined
              : tr
                ? 'Kasadaki QR’ı okutan ya da kasada kartı açılan müşteriler burada listelenir.'
                : 'Customers who scan the counter QR or get a card at the counter show up here.'
          }
        />
      ) : (
        <>
          <div className="mt-2 hidden overflow-x-auto lg:block">
            <table className="bz-table w-full">
              <thead>
                <tr>
                  <th>{tr ? 'Üye' : 'Member'}</th>
                  <th>{tr ? 'Kart kodu' : 'Code'}</th>
                  <th className="text-right">{program.kind === 'stamps' ? (tr ? 'Damga' : 'Stamps') : tr ? 'Puan' : 'Points'}</th>
                  <th className="text-right">{tr ? 'Ziyaret' : 'Visits'}</th>
                  <th className="text-right">{tr ? 'Ödül' : 'Rewards'}</th>
                  <th>{tr ? 'Son ziyaret' : 'Last visit'}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((m) => {
                  const tier = tierFor(m.visits, program.tiers);
                  return (
                    <tr
                      key={m.id}
                      role="link"
                      tabIndex={0}
                      onClick={() => setOpen(m)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setOpen(m);
                        }
                      }}
                      className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pn-accent-hover"
                    >
                      <td>
                        <span className="font-medium text-pn-ink">{m.name || (tr ? 'İsimsiz' : 'Unnamed')}</span>
                        <span className="ml-2 text-[12px] tabular-nums text-[#737373]">
                          {access.manage && m.phone ? formatPhoneForDisplay(m.phone) : m.phoneMasked}
                        </span>
                        {tier && (
                          <Badge kind="lime" className="ml-2">
                            {tier.name}
                          </Badge>
                        )}
                      </td>
                      <td className="text-[13px] tabular-nums">{formatMemberCode(m.code)}</td>
                      <td className="text-right tabular-nums">
                        {m.balance}
                        {m.balance >= minCost && <span className="ml-1.5 text-[12px] font-medium text-[#23863A]">{tr ? 'hazır' : 'ready'}</span>}
                      </td>
                      <td className="text-right tabular-nums">{m.visits}</td>
                      <td className="text-right tabular-nums">{m.rewardsRedeemed}</td>
                      <td className="text-[#737373]">{relativeDay(m.lastVisitAt, locale)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ul className="mt-2 space-y-2 lg:hidden">
            {items.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => setOpen(m)} className="flex w-full items-center justify-between gap-3 rounded-[20px] border border-pn-line px-4 py-3 text-left">
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium text-pn-ink">{m.name || (tr ? 'İsimsiz' : 'Unnamed')}</span>
                    <span className="text-[12px] text-[#737373]">
                      {access.manage && m.phone ? `${formatPhoneForDisplay(m.phone)} · ` : ''}
                      {formatMemberCode(m.code)} · {m.visits} {tr ? 'ziyaret' : 'visits'} · {relativeDay(m.lastVisitAt, locale)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[16px] font-medium tabular-nums">{m.balance}</span>
                    {m.balance >= minCost && <span className="text-[12px] font-medium text-[#23863A]">{tr ? 'ödül hazır' : 'reward ready'}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {cursor && (
            <div className="mt-3 text-center">
              <button type="button" className="bz-btn-ghost" disabled={loadingMore} onClick={() => void load(cursor)}>
                {loadingMore ? <Loader2 size={14} className="mr-1.5 inline animate-spin" /> : null}
                {tr ? 'Daha fazla' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}

      {open && (
        <Modal
          title={open.name || (tr ? 'Üye' : 'Member')}
          onClose={() => {
            setOpen(null);
            setConfirmDelete(false);
          }}
          size={760}
          footer={
            access.manage ? (
              <div className="flex items-center justify-between gap-2">
                {confirmDelete ? (
                  <>
                    <span className="text-[13px] text-[#991B1B]">
                      {tr ? 'Kart, bakiye ve geçmiş kalıcı olarak silinecek.' : 'The card, balance and history will be deleted for good.'}
                    </span>
                    <span className="flex gap-2">
                      <button type="button" className="bz-btn-ghost" onClick={() => setConfirmDelete(false)}>
                        {tr ? 'Vazgeç' : 'Cancel'}
                      </button>
                      <button type="button" className="bz-btn-primary !bg-[#B91C1C]" disabled={deleting} onClick={() => void remove()}>
                        {deleting && <Loader2 size={14} className="mr-1.5 inline animate-spin" />}
                        {tr ? 'Sil' : 'Delete'}
                      </button>
                    </span>
                  </>
                ) : (
                  <button type="button" className="bz-btn-ghost inline-flex items-center gap-1.5 text-[#B91C1C]" onClick={() => setConfirmDelete(true)}>
                    <Trash2 size={14} /> {tr ? 'Üyeyi sil (KVKK talebi)' : 'Delete member (privacy request)'}
                  </button>
                )}
              </div>
            ) : undefined
          }
        >
          <MemberActions
            locale={locale}
            restaurantId={restaurantId}
            restaurantName={restaurantName}
            program={program}
            member={open}
            access={access}
            onChange={update}
            withHistory
          />
          <p className="mt-4 text-[12px] text-[#A3A3A3]">
            {tr ? 'Katılım' : 'Joined'}: {new Date(open.createdAt).toLocaleDateString(tr ? 'tr-TR' : 'en-GB')} ·{' '}
            {joinedViaLabel(open.joinedVia, tr)} ·{' '}
            {open.marketingConsent ? (tr ? 'kampanya izni var' : 'marketing consent: yes') : tr ? 'kampanya izni yok' : 'marketing consent: no'}
          </p>
        </Modal>
      )}
    </div>
  );
}

function joinedViaLabel(via: string, tr: boolean): string {
  if (via === 'staff') return tr ? 'kasada açıldı' : 'opened at the counter';
  if (via === 'nfc') return tr ? 'NFC ile katıldı' : 'joined by NFC';
  if (via === 'account') return tr ? 'Buaze hesabıyla katıldı' : 'joined with a Buaze account';
  return tr ? 'QR ile katıldı' : 'joined by QR';
}
