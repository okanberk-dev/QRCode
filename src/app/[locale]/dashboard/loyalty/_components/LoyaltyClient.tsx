'use client';

// Loyalty card page (CLAUDE.md §60). Follows the shell's business switcher;
// no program → setup wizard; program → stats + Kasa / Üyeler / Program /
// Paylaş tabs.
import { useEffect, useMemo, useState } from 'react';
import { Gift, Lock } from 'lucide-react';
import { AlertBanner, EmptyState, PageHeader, StatCard, Tabs } from '@/components/ui';
import { useActiveBusinessSelection } from '@/components/audits/useActiveBusinessSelection';
import type { LoyaltyTemplate } from '@/lib/loyalty';
import ProgramEditor, { draftFromTemplate } from './ProgramEditor';
import CounterPanel from './CounterPanel';
import MembersPanel from './MembersPanel';
import SharePanel from './SharePanel';
import PortalEditor from './PortalEditor';
import { BranchesCard, JoinChainCard, type ChainDto, type ChainOption } from './ChainPanels';
import WinbackCard from './WinbackCard';
import type { PortalBusinessDto } from '@/lib/loyalty-server';
import { draftFromProgram, loyaltyFetch, loyaltyMessage, type AccessDto, type ProgramDto, type StatsDto } from './loyalty-client';

export interface LoyaltyPageData {
  restaurantId: string;
  program: ProgramDto | null;
  stats: StatsDto | null;
  /** Contact details for the customer-panel preview. */
  business: PortalBusinessDto | null;
  access: AccessDto;
  moduleEnabled: boolean;
  baseUrl: string;
  suggestedTemplate: LoyaltyTemplate['key'];
  /** Chain card (§61): null without a program. */
  chain: ChainDto | null;
  /** The owner's other cards this business can join as a branch (no program yet). */
  chainOptions: ChainOption[];
}

type Tab = 'counter' | 'members' | 'program' | 'portal' | 'share';

export default function LoyaltyClient({
  locale,
  restaurants,
  initialActiveRestaurantId,
  initial,
}: {
  locale: 'tr' | 'en';
  restaurants: Array<{ id: string; name: string; category: string | null }>;
  initialActiveRestaurantId: string | null;
  initial: LoyaltyPageData | null;
}) {
  const tr = locale === 'tr';
  const { activeId, ready } = useActiveBusinessSelection(restaurants, initialActiveRestaurantId);
  const [cache, setCache] = useState<Record<string, LoyaltyPageData>>(() => (initial ? { [initial.restaurantId]: initial } : {}));
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('counter');
  const [membersKey, setMembersKey] = useState(0);
  const data = activeId ? cache[activeId] ?? null : null;
  const restaurant = restaurants.find((r) => r.id === activeId) ?? null;
  const isBranch = Boolean(data?.chain?.isBranch);
  // A branch never edits the card: those tabs live at the home business.
  const visibleTab: Tab = isBranch && (tab === 'program' || tab === 'portal') ? 'counter' : tab;

  useEffect(() => {
    if (!ready || !activeId || cache[activeId]) return;
    let alive = true;
    setError(null);
    loyaltyFetch<Omit<LoyaltyPageData, 'restaurantId'>>(`/api/restaurants/${activeId}/loyalty`)
      .then((r) => alive && setCache((c) => ({ ...c, [activeId]: { ...r, restaurantId: activeId } })))
      .catch((err) => alive && setError(loyaltyMessage(err, locale)));
    return () => {
      alive = false;
    };
  }, [activeId, cache, locale, ready]);

  const refreshStats = () => {
    if (!activeId) return;
    loyaltyFetch<Omit<LoyaltyPageData, 'restaurantId'>>(`/api/restaurants/${activeId}/loyalty`)
      .then((r) => setCache((c) => ({ ...c, [activeId]: { ...r, restaurantId: activeId } })))
      .catch(() => undefined);
  };

  const onSaved = (program: ProgramDto, stats: StatsDto) => {
    if (!activeId) return;
    const wasNew = !cache[activeId]?.program;
    setCache((c) => ({ ...c, [activeId]: { ...c[activeId], program, stats } }));
    if (wasNew) setTab(program.isActive ? 'share' : 'program');
  };

  const wizardDraft = useMemo(
    () => draftFromTemplate(data?.suggestedTemplate ?? 'general', locale),
    [data?.suggestedTemplate, locale],
  );

  const header = (
    <PageHeader
      title={tr ? 'Sadakat kartı' : 'Loyalty card'}
      description={
        tr
          ? 'Dijital damga ya da puan kartı: müşteri QR ile kartını açar, siz kasada ziyaret ekler ve ödül verirsiniz.'
          : 'A digital stamp or points card: customers open it with a QR, you add visits and give rewards at the counter.'
      }
      actions={
        data?.program && data.access.operate && tab !== 'counter' ? (
          <button type="button" className="bz-btn-lime" onClick={() => setTab('counter')}>
            {tr ? 'Kasayı aç' : 'Open counter'}
          </button>
        ) : undefined
      }
    />
  );

  if (restaurants.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-7 lg:py-8">
        {header}
        <EmptyState
          icon={<Gift size={22} />}
          title={tr ? 'Önce bir işletme ekleyin' : 'Add a business first'}
          body={tr ? 'Sadakat kartı bir işletmeye bağlıdır.' : 'A loyalty card belongs to a business.'}
          action={
            <a href={`/${locale}/dashboard/restaurants/new`} className="bz-btn-primary">
              {tr ? 'İşletme ekle' : 'Add business'}
            </a>
          }
        />
      </div>
    );
  }

  const stats = data?.stats ?? null;
  const returningRate = stats && stats.visitedMembers > 0 ? Math.round((stats.returningMembers / stats.visitedMembers) * 100) : null;

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-5 px-4 py-6 sm:px-7 lg:py-8">
      {header}

      {error && (
        <AlertBanner kind="danger" onDismiss={() => setError(null)}>
          {error}
        </AlertBanner>
      )}

      {!data ? (
        <div className="space-y-3" aria-busy="true">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="bz-skeleton h-[88px] rounded-xl" />
            ))}
          </div>
          <div className="bz-skeleton h-64 rounded-xl" />
        </div>
      ) : !data.moduleEnabled ? (
        <EmptyState
          icon={<Lock size={22} />}
          title={tr ? 'Sadakat kartı paketinizde kapalı' : 'The loyalty card is off in your plan'}
          body={
            tr
              ? 'Büyüme ve Zincir paketlerinde açıktır. Mevcut üyeler ve bakiyeler silinmez.'
              : 'It is included in the Growth and Scale plans. Existing members and balances are kept.'
          }
          action={
            <a href={`/${locale}/dashboard/account?section=billing`} className="bz-btn-primary">
              {tr ? 'Paketleri gör' : 'See plans'}
            </a>
          }
        />
      ) : !data.program ? (
        data.access.manage ? (
          <>
          {data.chainOptions.length > 0 && (
            <JoinChainCard
              locale={locale}
              restaurantId={data.restaurantId}
              restaurantName={restaurant?.name ?? ''}
              options={data.chainOptions}
              onJoined={refreshStats}
            />
          )}
          <ProgramEditor
            key={`wizard-${activeId}`}
            locale={locale}
            restaurantId={data.restaurantId}
            restaurantName={restaurant?.name ?? ''}
            mode="wizard"
            initialDraft={wizardDraft}
            canManage
            onSaved={onSaved}
          />
          </>
        ) : (
          <EmptyState
            icon={<Gift size={22} />}
            title={tr ? 'Bu işletmede henüz sadakat kartı yok' : 'No loyalty card for this business yet'}
            body={tr ? 'Kartı işletme sahibi ya da yönetici kurar.' : 'The owner or a manager sets it up.'}
          />
        )
      ) : (
        <>
          {isBranch && data.chain && (
            <AlertBanner kind="info">
              {tr
                ? `Bu işletme ${data.chain.homeName} sadakat kartının şubesi: kasa ve üyeler ortak. Kart, ödüller ve müşteri paneli ${data.chain.homeName} işletmesinden yönetilir.`
                : `This business is a branch of ${data.chain.homeName}’s loyalty card: counter and members are shared. The card, rewards and customer page are managed at ${data.chain.homeName}.`}
            </AlertBanner>
          )}
          {!data.program.isActive && (
            <AlertBanner kind="warn">
              {tr
                ? 'Kart taslakta / duraklatılmış: müşteriler katılamaz, kasada işlem yapılamaz. “Program” sekmesinden yayına alın.'
                : 'The card is a draft / paused: customers cannot join and the counter is off. Publish it in the “Programme” tab.'}
            </AlertBanner>
          )}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label={tr ? 'Üye' : 'Members'}
              value={stats?.members ?? 0}
              delta={stats && stats.newMembers30 > 0 ? `+${stats.newMembers30}` : undefined}
              deltaKind="up"
              deltaSuffix={tr ? '30 gün' : '30 days'}
              info={tr ? 'Kartı olan müşteri sayısı. Artı: son 30 günde katılan.' : 'Customers with a card. Plus: joined in the last 30 days.'}
              isTr={tr}
            />
            <StatCard
              label={tr ? 'Ziyaret (30 gün)' : 'Visits (30 days)'}
              value={stats?.visits30 ?? 0}
              sparkline={stats?.daily.map((d) => d.visits)}
              info={tr ? 'Kasada damga / puan eklenen ziyaretler.' : 'Visits where stamps / points were added at the counter.'}
              isTr={tr}
            />
            <StatCard
              label={tr ? 'Tekrar gelen' : 'Returning'}
              value={returningRate === null ? '—' : `%${returningRate}`}
              info={tr ? 'En az bir ziyareti olan üyelerden ikinci kez gelenlerin oranı.' : 'Share of members with a visit who came back at least once more.'}
              isTr={tr}
            />
            <StatCard
              label={tr ? 'Verilen ödül (30 gün)' : 'Rewards (30 days)'}
              value={stats?.rewards30 ?? 0}
              delta={stats && stats.rewardReady > 0 ? `${stats.rewardReady}` : undefined}
              deltaKind="neutral"
              deltaSuffix={tr ? 'ödülü hazır üye' : 'members ready'}
              info={tr ? 'Son 30 günde kasada verilen ödüller.' : 'Rewards given at the counter in the last 30 days.'}
              isTr={tr}
            />
          </div>

          <Tabs
            ariaLabel={tr ? 'Sadakat kartı bölümleri' : 'Loyalty sections'}
            active={visibleTab}
            onChange={(id) => setTab(id as Tab)}
            items={[
              { id: 'counter', label: tr ? 'Kasa' : 'Counter' },
              { id: 'members', label: tr ? 'Üyeler' : 'Members', count: stats?.members },
              ...(isBranch
                ? []
                : [
                    { id: 'program', label: tr ? 'Program' : 'Programme' },
                    { id: 'portal', label: tr ? 'Müşteri paneli' : 'Customer page' },
                  ]),
              { id: 'share', label: tr ? 'QR ve paylaş' : 'QR & share' },
            ]}
          />

          {visibleTab === 'counter' && (
            <CounterPanel
              key={`counter-${activeId}`}
              locale={locale}
              restaurantId={data.restaurantId}
              restaurantName={restaurant?.name ?? ''}
              program={data.program}
              access={data.access}
              onMemberCreated={() => {
                setMembersKey((k) => k + 1);
                refreshStats();
              }}
            />
          )}
          {visibleTab === 'members' && (
            <MembersPanel
              key={`members-${activeId}`}
              locale={locale}
              restaurantId={data.restaurantId}
              restaurantName={restaurant?.name ?? ''}
              program={data.program}
              access={data.access}
              refreshKey={membersKey}
              onChanged={refreshStats}
            />
          )}
          {visibleTab === 'program' && (
            <div className="space-y-4">
              <ProgramEditor
                key={`edit-${activeId}`}
                locale={locale}
                restaurantId={data.restaurantId}
                restaurantName={restaurant?.name ?? ''}
                mode="edit"
                initialDraft={draftFromProgram(data.program)}
                kindLocked={(stats?.members ?? 0) > 0}
                canManage={data.access.manage}
                onSaved={onSaved}
              />
              <WinbackCard key={`winback-${activeId}`} locale={locale} restaurantId={data.restaurantId} canManage={data.access.manage} />
              <BranchesCard
                key={`branches-${activeId}`}
                locale={locale}
                restaurantId={data.restaurantId}
                homeName={restaurant?.name ?? ''}
                canManage={data.access.manage}
                onChanged={(chain) => activeId && setCache((c) => ({ ...c, [activeId]: { ...c[activeId], chain } }))}
              />
            </div>
          )}
          {visibleTab === 'portal' && (
            <PortalEditor
              key={`portal-${activeId}`}
              locale={locale}
              restaurantId={data.restaurantId}
              program={data.program}
              business={data.business}
              baseUrl={data.baseUrl}
              canManage={data.access.manage}
              onSaved={(program) => activeId && setCache((c) => ({ ...c, [activeId]: { ...c[activeId], program } }))}
            />
          )}
          {visibleTab === 'share' && (
            <SharePanel
              locale={locale}
              restaurantId={data.restaurantId}
              restaurantName={restaurant?.name ?? ''}
              program={data.program}
              baseUrl={data.baseUrl}
            />
          )}
        </>
      )}
    </div>
  );
}
