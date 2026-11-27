'use client';

// Chain loyalty card (CLAUDE.md §61): one card valid at the owner's other
// businesses. `BranchesCard` (Program tab of the home business) adds and
// removes branches; `JoinChainCard` (a business without a card) joins an
// existing card as a branch instead of starting a new one.
import { useEffect, useState } from 'react';
import { Building2, Link2, Loader2, Store, X } from 'lucide-react';
import { AlertBanner } from '@/components/ui';
import { loyaltyFetch, loyaltyMessage } from './loyalty-client';

export interface ChainDto {
  homeRestaurantId: string;
  homeName: string;
  isBranch: boolean;
  branches: Array<{ restaurantId: string; name: string }>;
}

export interface ChainOption {
  restaurantId: string;
  programName: string;
  businessName: string;
}

type Candidate = { restaurantId: string; name: string; isActive: boolean };

const CHAIN_MESSAGES: Record<string, { tr: string; en: string }> = {
  HAS_OWN_PROGRAM: { tr: 'Bu işletmenin kendi kartı var; şube yapılamaz.', en: 'This business has its own card; it cannot be a branch.' },
  BRANCH_ELSEWHERE: { tr: 'Bu işletme başka bir kartın şubesi.', en: 'This business is already a branch of another card.' },
  INVALID_BRANCH: { tr: 'Yalnız kendi işletmelerinizi ekleyebilirsiniz.', en: 'You can only add your own businesses.' },
  BRANCH_PROGRAM: { tr: 'Şubeler ana işletmeden yönetilir.', en: 'Branches are managed at the home business.' },
};

function chainMessage(err: unknown, locale: 'tr' | 'en'): string {
  const code = (err as { code?: string })?.code;
  return code && CHAIN_MESSAGES[code] ? CHAIN_MESSAGES[code][locale] : loyaltyMessage(err, locale);
}

export function BranchesCard({
  locale,
  restaurantId,
  homeName,
  canManage,
  onChanged,
}: {
  locale: 'tr' | 'en';
  restaurantId: string;
  homeName: string;
  canManage: boolean;
  onChanged: (chain: ChainDto) => void;
}) {
  const tr = locale === 'tr';
  const api = `/api/restaurants/${restaurantId}/loyalty/branches`;
  const [chain, setChain] = useState<ChainDto | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loyaltyFetch<{ chain: ChainDto; candidates: Candidate[] }>(api)
      .then((r) => {
        if (!alive) return;
        setChain(r.chain);
        setCandidates(r.candidates);
      })
      .catch((err) => alive && setError(chainMessage(err, locale)));
    return () => {
      alive = false;
    };
  }, [api, locale]);

  const run = async (key: string, init: RequestInit, url = api) => {
    setBusy(key);
    setError(null);
    try {
      const r = await loyaltyFetch<{ chain: ChainDto; candidates: Candidate[] }>(url, init);
      setChain(r.chain);
      setCandidates(r.candidates);
      onChanged(r.chain);
    } catch (err) {
      setError(chainMessage(err, locale));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="bz-card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-pn-accent text-white">
          <Building2 size={17} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-[15px] font-medium text-pn-ink">{tr ? 'Şubeler' : 'Branches'}</h3>
          <p className="mt-0.5 text-[13px] text-[#737373]">
            {tr
              ? `Kart, ödüller ve müşteri paneli ${homeName} işletmesinden yönetilir. Eklediğiniz şubelerin kasası aynı kartlarla çalışır; müşteri damgasını hangi şubede olursa olsun biriktirir.`
              : `The card, rewards and customer page are managed at ${homeName}. Branches you add use the same cards at their counter; customers collect wherever they visit.`}
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-3">
          <AlertBanner kind="danger" onDismiss={() => setError(null)}>
            {error}
          </AlertBanner>
        </div>
      )}

      {!chain ? (
        <div className="bz-skeleton mt-4 h-16 rounded-[20px]" />
      ) : (
        <div className="mt-4 space-y-3">
          {chain.branches.length > 0 && (
            <ul className="divide-y divide-[#F0F0F0] rounded-[20px] border border-pn-line">
              {chain.branches.map((b) => (
                <li key={b.restaurantId} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                  <span className="flex min-w-0 items-center gap-2 text-[14px] text-pn-ink">
                    <Store size={15} className="shrink-0 text-[#737373]" aria-hidden="true" />
                    <span className="truncate">{b.name}</span>
                  </span>
                  {canManage && (
                    <button
                      type="button"
                      className="bz-btn-ghost inline-flex items-center gap-1 text-[13px]"
                      disabled={busy !== null}
                      onClick={() => void run(`rm-${b.restaurantId}`, { method: 'DELETE' }, `${api}?restaurantId=${encodeURIComponent(b.restaurantId)}`)}
                      aria-label={tr ? `${b.name} şubesini çıkar` : `Remove ${b.name}`}
                    >
                      {busy === `rm-${b.restaurantId}` ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                      {tr ? 'Çıkar' : 'Remove'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {canManage && candidates.length > 0 && (
            <div>
              <p className="text-[13px] font-medium text-[#525252]">{tr ? 'Şube olarak ekle' : 'Add as a branch'}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {candidates.map((c) => (
                  <button
                    key={c.restaurantId}
                    type="button"
                    className="bz-btn-ghost inline-flex min-h-[40px] items-center gap-1.5"
                    disabled={busy !== null}
                    onClick={() => void run(`add-${c.restaurantId}`, { method: 'POST', body: JSON.stringify({ restaurantId: c.restaurantId }) })}
                  >
                    {busy === `add-${c.restaurantId}` ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {chain.branches.length === 0 && candidates.length === 0 && (
            <p className="text-[13px] text-[#737373]">
              {tr
                ? 'Eklenebilecek başka işletmeniz yok. Kendi kartı olmayan işletmeleriniz burada görünür.'
                : 'No other business to add. Your businesses without a card of their own show up here.'}
            </p>
          )}
          <p className="text-[12px] text-[#A3A3A3]">
            {tr
              ? 'Şubeyi çıkarmak üyeleri ve bakiyeleri silmez; o şubenin kasası artık bu kartla çalışmaz.'
              : 'Removing a branch keeps members and balances; its counter stops working with this card.'}
          </p>
        </div>
      )}
    </section>
  );
}

export function JoinChainCard({
  locale,
  restaurantId,
  restaurantName,
  options,
  onJoined,
}: {
  locale: 'tr' | 'en';
  restaurantId: string;
  restaurantName: string;
  options: ChainOption[];
  onJoined: () => void;
}) {
  const tr = locale === 'tr';
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const join = async (home: ChainOption) => {
    setBusy(home.restaurantId);
    setError(null);
    try {
      await loyaltyFetch(`/api/restaurants/${home.restaurantId}/loyalty/branches`, {
        method: 'POST',
        body: JSON.stringify({ restaurantId }),
      });
      onJoined();
    } catch (err) {
      setError(chainMessage(err, locale));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="bz-card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-pn-accent-soft text-pn-accent">
          <Link2 size={17} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-[15px] font-medium text-pn-ink">{tr ? 'Mevcut kartınızı burada da geçerli yapın' : 'Use your existing card here too'}</h3>
          <p className="mt-0.5 text-[13px] text-[#737373]">
            {tr
              ? `${restaurantName} şube olsun: müşteriler aynı kartla iki işletmede de damga biriktirir. Ya da aşağıdan bu işletmeye ayrı bir kart kurun.`
              : `Make ${restaurantName} a branch: customers collect on the same card at both. Or set up a separate card below.`}
          </p>
        </div>
      </div>
      {error && (
        <div className="mt-3">
          <AlertBanner kind="danger" onDismiss={() => setError(null)}>
            {error}
          </AlertBanner>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.restaurantId}
            type="button"
            className="bz-btn-lime inline-flex min-h-[42px] items-center gap-1.5"
            disabled={busy !== null}
            onClick={() => void join(o)}
          >
            {busy === o.restaurantId ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
            {tr ? `${o.businessName} kartına bağla` : `Join ${o.businessName}’s card`}
          </button>
        ))}
      </div>
    </section>
  );
}
